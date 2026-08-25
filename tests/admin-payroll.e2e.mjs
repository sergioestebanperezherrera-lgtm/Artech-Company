import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const screenshotDirectory = ".next/admin-payroll-qa";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function canReachServer() {
  return new Promise((resolve) => {
    const request = http.get(baseUrl, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    if (await canReachServer()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`No se pudo conectar con ${baseUrl}`);
}

async function ensureServer() {
  if (await canReachServer()) {
    return undefined;
  }

  const child =
    process.platform === "win32"
      ? spawn(
          "cmd.exe",
          ["/c", "npm", "run", "dev", "--", "--hostname", serverHost, "--port", serverPort],
          { cwd: process.cwd(), shell: false, stdio: "ignore", windowsHide: true },
        )
      : spawn(
          "npm",
          ["run", "dev", "--", "--hostname", serverHost, "--port", serverPort],
          { cwd: process.cwd(), shell: false, stdio: "ignore" },
        );

  await waitForServer();
  return child;
}

function stopServer(child) {
  if (!child) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function timestamp() {
  return new Date().toISOString();
}

function makeState(permissions = ["payroll.read", "payroll.manage", "payroll.close"]) {
  return {
    permissions,
    nextId: 1,
    periods: [
      makePeriod("period-open", "Nomina enero QA", "2026-01-01", "2026-01-31", "DRAFT"),
      makePeriod(
        "period-closed",
        "Nomina diciembre QA",
        "2025-12-01",
        "2025-12-31",
        "CLOSED",
      ),
    ],
  };
}

function makePeriod(id, name, startDate, endDate, status) {
  const period = {
    id,
    name,
    startDate,
    endDate,
    status,
    createdAt: timestamp(),
    closedAt: status === "CLOSED" ? timestamp() : null,
    slips:
      status === "CLOSED"
        ? [makeSlip(id, "slip-closed-1", "Ana Cerrada", "EMP-QA-001", 3000, 3000)]
        : [
            makeSlip(id, "slip-open-1", "Luis Normal", "EMP-QA-002", 3000, 3250),
            makeSlip(id, "slip-open-2", "Marta Revision", "EMP-QA-003", 0, 0, true),
          ],
  };
  recompute(period);
  return period;
}

function makeSlip(
  periodId,
  id,
  employeeName,
  employeeCode,
  grossAmount,
  netAmount,
  requiresReview = false,
) {
  return {
    id,
    periodId,
    employeeId: `emp-${id}`,
    employmentId: `employment-${id}`,
    employeeCode,
    employeeName,
    positionName: "Tecnico",
    baseCompensation: 3000,
    currency: "GTQ",
    payFrequency: "MONTHLY",
    daysConsidered: 31,
    presentDays: 20,
    lateDays: 2,
    absentDays: 1,
    excusedDays: 1,
    lateMinutes: 35,
    grossAmount,
    adjustmentsAmount: netAmount - grossAmount,
    adjustmentReason: netAmount !== grossAmount ? "Bono manual" : null,
    adjustedBy: netAmount !== grossAmount
      ? { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" }
      : null,
    netAmount,
    requiresReview,
    reviewReason: requiresReview ? "Sin compensacion aplicable" : null,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
}

function recompute(period) {
  period.employeeCount = period.slips.length;
  period.requiresReviewCount = period.slips.filter((slip) => slip.requiresReview).length;
  period.totalNet = period.slips.reduce((total, slip) => total + slip.netAmount, 0);
}

function adminContext(permissions) {
  return {
    user: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
    employee: { id: "employee-1", code: "EMP-QA-001", isActive: true },
    roles: ["QA"],
    permissions,
    canAccessAdmin: true,
  };
}

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockApi(page, state) {
  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      await fulfillJson(route, 200, adminContext(state.permissions));
      return;
    }

    if (path === "/api/admin/payroll/periods" && method === "GET") {
      await fulfillJson(route, 200, state.periods);
      return;
    }

    if (path === "/api/admin/payroll/periods" && method === "POST") {
      const input = request.postDataJSON();
      const existing = state.periods.find(
        (period) =>
          period.startDate === input.startDate && period.endDate === input.endDate,
      );
      if (existing) {
        await fulfillJson(route, 409, { message: "Period already exists." });
        return;
      }
      const period = makePeriod(
        `period-${state.nextId++}`,
        input.name,
        input.startDate,
        input.endDate,
        "DRAFT",
      );
      period.slips = [];
      recompute(period);
      state.periods.unshift(period);
      await fulfillJson(route, 201, period);
      return;
    }

    const detailMatch = path.match(/^\/api\/admin\/payroll\/periods\/([^/]+)$/);
    if (detailMatch && method === "GET") {
      const period = state.periods.find((item) => item.id === detailMatch[1]);
      await fulfillJson(route, period ? 200 : 404, period ?? { message: "Not found." });
      return;
    }

    const calculateMatch = path.match(/^\/api\/admin\/payroll\/periods\/([^/]+)\/calculate$/);
    if (calculateMatch && method === "POST") {
      const period = state.periods.find((item) => item.id === calculateMatch[1]);
      if (!period || period.status !== "DRAFT") {
        await fulfillJson(route, 409, { message: "Closed periods cannot be recalculated." });
        return;
      }
      period.slips = [
        makeSlip(period.id, `slip-${period.id}-1`, "Luis Normal", "EMP-QA-002", 3000, 3000),
        makeSlip(
          period.id,
          `slip-${period.id}-2`,
          "Marta Revision",
          "EMP-QA-003",
          0,
          0,
          true,
        ),
      ];
      recompute(period);
      await fulfillJson(route, 200, period);
      return;
    }

    const closeMatch = path.match(/^\/api\/admin\/payroll\/periods\/([^/]+)\/close$/);
    if (closeMatch && method === "POST") {
      const period = state.periods.find((item) => item.id === closeMatch[1]);
      if (!period || period.status !== "DRAFT") {
        await fulfillJson(route, 409, { message: "Payroll period is already closed." });
        return;
      }
      if (period.slips.length === 0) {
        await fulfillJson(route, 409, {
          message: "Run the calculation before closing the payroll period.",
        });
        return;
      }
      if (period.requiresReviewCount > 0) {
        await fulfillJson(route, 409, {
          message: `${period.requiresReviewCount} slip(s) require review before closing: Sin compensacion aplicable`,
        });
        return;
      }
      period.status = "CLOSED";
      period.closedAt = timestamp();
      recompute(period);
      await fulfillJson(route, 200, period);
      return;
    }

    const slipMatch = path.match(/^\/api\/admin\/payroll\/slips\/([^/]+)$/);
    if (slipMatch && method === "PATCH") {
      const input = request.postDataJSON();
      let slip = null;
      for (const period of state.periods) {
        const candidate = period.slips.find((item) => item.id === slipMatch[1]);
        if (candidate) {
          if (period.status !== "DRAFT") {
            await fulfillJson(route, 409, {
              message: "Closed payroll slips cannot be modified.",
            });
            return;
          }
          slip = candidate;
          break;
        }
      }
      if (!slip) {
        await fulfillJson(route, 404, { message: "Payroll slip not found." });
        return;
      }
      if (!input.adjustmentReason || !String(input.adjustmentReason).trim()) {
        await fulfillJson(route, 400, { message: "Adjustment reason is required." });
        return;
      }
      slip.adjustmentsAmount = Number(input.adjustmentsAmount);
      slip.adjustmentReason = input.adjustmentReason;
      slip.netAmount = slip.grossAmount + slip.adjustmentsAmount;
      slip.adjustedBy = adminContext(state.permissions).user;
      for (const period of state.periods) {
        if (period.slips.some((item) => item.id === slip.id)) {
          recompute(period);
        }
      }
      await fulfillJson(route, 200, slip);
      return;
    }

    await fulfillJson(route, 404, { message: "Not found." });
  });
}

async function createPage(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return { context, page };
}

async function runTest(name, callback) {
  await callback();
  console.log(`OK ${name}`);
}

let serverProcess;
let browser;

try {
  mkdirSync(screenshotDirectory, { recursive: true });
  serverProcess = await ensureServer();
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  await runTest("crear periodo, calcular, ver slips y cerrar", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/payroll`);
    await page.getByRole("heading", { name: "Nomina", exact: true }).waitFor();
    await page.getByText("Nomina diciembre QA").first().waitFor();

    await page.getByRole("button", { name: /Crear periodo/ }).click();
    const dialog = page.getByRole("dialog", { name: "Crear periodo de nomina" });
    await dialog.getByLabel("Nombre").fill("Nomina febrero QA");
    await dialog.getByLabel("Fecha inicial").fill("2026-02-01");
    await dialog.getByLabel("Fecha final").fill("2026-02-28");
    await dialog.getByRole("button", { name: "Crear periodo" }).click();
    await page.getByRole("heading", { name: "Nomina febrero QA" }).waitFor();

    await page.getByRole("button", { name: "Calcular / Recalcular" }).click();
    await page.getByText("Nomina calculada.").waitFor();
    await page.getByText("Luis Normal").first().waitFor();
    await page.getByText("Marta Revision").first().waitFor();
    assert(
      state.periods.find((period) => period.name === "Nomina febrero QA")
        .requiresReviewCount === 1,
      "El slip sin compensacion debe requerir revision.",
    );

    await page
      .getByRole("button", { name: "Cerrar periodo" })
      .click({ trial: true })
      .catch(() => {});
    await page.getByRole("button", { name: "Cerrar periodo" }).click();
    await page
      .getByText(/Hay empleados sin compensacion aplicable/)
      .waitFor();

    await page
      .getByRole("row", { name: /Marta Revision/ })
      .getByRole("button", { name: "Ajustar" })
      .count()
      .catch(() => 0);

    await context.close();
  });

  await runTest("ajuste manual con motivo actualiza neto", async () => {
    const state = makeState(["payroll.read", "payroll.manage"]);
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/payroll`);
    await page.getByText("Nomina enero QA").first().waitFor();
    await page
      .getByRole("row", { name: /Nomina enero QA/ })
      .getByRole("button", { name: "Ver" })
      .click();
    await page.getByRole("heading", { name: "Nomina enero QA" }).waitFor();

    await page
      .getByRole("row", { name: /Luis Normal/ })
      .getByRole("button", { name: "Ajustar" })
      .click();
    const adjustDialog = page.getByRole("dialog", {
      name: /Ajustar recibo - Luis Normal/,
    });
    await adjustDialog.getByLabel("Ajuste (GTQ)").fill("250.50");
    await adjustDialog.getByLabel("Motivo").fill("Bono puntualidad");
    await adjustDialog.getByRole("button", { name: "Guardar ajuste" }).click();
    await page.getByText("Ajuste registrado para Luis Normal.").waitFor();
    assert(
      state.periods.find((period) => period.id === "period-open").totalNet === 3250.5,
      "El total del periodo debe reflejar el ajuste.",
    );
    await context.close();
  });

  await runTest("read-only consulta pero no gestiona ni cierra", async () => {
    const state = makeState(["payroll.read"]);
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/payroll`);
    await page.getByRole("heading", { name: "Nomina", exact: true }).waitFor();
    assert(
      (await page.getByRole("button", { name: /Crear periodo/ }).count()) === 0,
      "Read-only no debe crear periodos.",
    );

    await page
      .getByRole("row", { name: /Nomina enero QA/ })
      .getByRole("button", { name: "Ver" })
      .click();
    await page.getByRole("heading", { name: "Nomina enero QA" }).waitFor();
    assert(
      (await page.getByRole("button", { name: "Calcular / Recalcular" }).count()) === 0,
      "Read-only no debe calcular.",
    );
    assert(
      (await page.getByRole("button", { name: "Cerrar periodo" }).count()) === 0,
      "Read-only no debe cerrar.",
    );
    assert(
      (await page.getByRole("button", { name: "Ajustar" }).count()) === 0,
      "Read-only no debe ajustar.",
    );
    await context.close();
  });

  await runTest("sin permiso de lectura el modulo queda bloqueado", async () => {
    const state = makeState([]);
    let payrollRequests = 0;
    const { context, page } = await createPage(browser);
    await mockApi(page, state);
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/admin/payroll")) {
        payrollRequests += 1;
      }
    });

    await page.goto(`${baseUrl}/admin/payroll`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();
    assert(payrollRequests === 0, "Sin payroll.read no debe consultar nomina.");
    await context.close();
  });

  for (const width of [375, 1440]) {
    await runTest(`responsive nomina ${width}px`, async () => {
      const state = makeState();
      const { context, page } = await createPage(browser, {
        width,
        height: width === 375 ? 812 : 900,
      });
      await mockApi(page, state);

      for (const routePath of ["/admin/payroll"]) {
        await page.goto(`${baseUrl}${routePath}`);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        assert(!overflow, `Existe overflow horizontal en ${routePath} a ${width}px.`);
      }

      await page.screenshot({
        path: `${screenshotDirectory}/admin-payroll-${width}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
} finally {
  if (browser) await browser.close();
  if (serverProcess) stopServer(serverProcess);
}
