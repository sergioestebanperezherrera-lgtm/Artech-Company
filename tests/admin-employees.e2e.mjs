import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const screenshotDirectory = ".next/admin-employees-qa";
const employeePermissions = [
  "employee.read",
  "employee.create",
  "employee.update",
  "employee.deactivate",
];

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
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function makeState() {
  return { positions: [], employees: [], nextPosition: 1, nextEmployee: 1 };
}

function positionPayload(state, input) {
  const timestamp = new Date().toISOString();
  return {
    id: `position-${state.nextPosition++}`,
    name: input.name,
    description: input.description ?? null,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function employmentPayload(employee, position, startDate, notes = null) {
  const timestamp = new Date().toISOString();
  return {
    id: `employment-${employee.employments.length + 1}`,
    status: "ACTIVE",
    startDate,
    endDate: null,
    notes,
    position: {
      id: position.id,
      name: position.name,
      description: position.description,
      isActive: position.isActive,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function employeeDetail(state, input) {
  const timestamp = new Date().toISOString();
  const employee = {
    id: `employee-${state.nextEmployee}`,
    code: `EMP-${String(state.nextEmployee++).padStart(3, "0")}`,
    firstName: input.firstName,
    lastName: input.lastName,
    name: `${input.firstName} ${input.lastName}`,
    email: input.email ?? null,
    phone: input.phone ?? null,
    isActive: true,
    status: "ACTIVE",
    hasSystemAccess: false,
    user: null,
    currentEmployment: null,
    employments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const position = state.positions.find((item) => item.id === input.positionId);
  const employment = employmentPayload(employee, position, input.startDate);
  employee.currentEmployment = employment;
  employee.employments = [employment];
  return employee;
}

function employeeSummary(employee) {
  return {
    id: employee.id,
    code: employee.code,
    firstName: employee.firstName,
    lastName: employee.lastName,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    isActive: employee.isActive,
    status: employee.status,
    hasSystemAccess: employee.hasSystemAccess,
    currentEmployment: employee.currentEmployment
      ? {
          id: employee.currentEmployment.id,
          status: employee.currentEmployment.status,
          startDate: employee.currentEmployment.startDate,
          position: employee.currentEmployment.position,
        }
      : null,
  };
}

function previousDay(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function fulfillJson(route, status, body) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockAdminApi(page, state, permissions, requestCounter = { employees: 0 }) {
  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      await fulfillJson(route, 200, {
        user: { id: "qa-admin", name: "Admin QA", email: "admin@qa.test" },
        employee: null,
        roles: ["SUPER_ADMIN"],
        permissions,
        canAccessAdmin: true,
      });
      return;
    }

    if (path.startsWith("/api/admin/employees")) {
      requestCounter.employees += 1;
    }

    if (path === "/api/admin/positions" && method === "GET") {
      await fulfillJson(route, 200, state.positions);
      return;
    }

    if (path === "/api/admin/positions" && method === "POST") {
      const position = positionPayload(state, request.postDataJSON());
      state.positions.push(position);
      await fulfillJson(route, 201, position);
      return;
    }

    if (path === "/api/admin/employees" && method === "GET") {
      let employees = state.employees.map(employeeSummary);
      const status = url.searchParams.get("status");
      const positionId = url.searchParams.get("positionId");
      const search = url.searchParams.get("search")?.toLowerCase();
      if (status === "active") employees = employees.filter((item) => item.isActive);
      if (status === "inactive") employees = employees.filter((item) => !item.isActive);
      if (positionId) {
        employees = employees.filter(
          (item) => item.currentEmployment?.position.id === positionId,
        );
      }
      if (search) {
        employees = employees.filter((item) =>
          `${item.code} ${item.name}`.toLowerCase().includes(search),
        );
      }
      await fulfillJson(route, 200, employees);
      return;
    }

    if (path === "/api/admin/employees" && method === "POST") {
      const employee = employeeDetail(state, request.postDataJSON());
      state.employees.push(employee);
      await fulfillJson(route, 201, employee);
      return;
    }

    const match = path.match(/^\/api\/admin\/employees\/([^/]+)(?:\/(.+))?$/);
    if (match) {
      const employee = state.employees.find((item) => item.id === match[1]);
      if (!employee) {
        await fulfillJson(route, 404, { message: "Employee not found." });
        return;
      }

      if (!match[2] && method === "GET") {
        await fulfillJson(route, 200, employee);
        return;
      }

      const input = request.postDataJSON();
      if (!match[2] && method === "PATCH") {
        Object.assign(employee, input, {
          name: `${input.firstName ?? employee.firstName} ${input.lastName ?? employee.lastName}`,
        });
        await fulfillJson(route, 200, employee);
        return;
      }

      if (match[2] === "change-position" && method === "POST") {
        employee.currentEmployment.status = "ENDED";
        employee.currentEmployment.endDate = previousDay(input.startDate);
        const position = state.positions.find((item) => item.id === input.positionId);
        const nextEmployment = employmentPayload(employee, position, input.startDate, input.notes);
        employee.employments.unshift(nextEmployment);
        employee.currentEmployment = nextEmployment;
        await fulfillJson(route, 200, employee);
        return;
      }

      if (match[2] === "terminate" && method === "POST") {
        employee.currentEmployment.status = "ENDED";
        employee.currentEmployment.endDate = input.endDate;
        employee.currentEmployment.notes = input.notes ?? employee.currentEmployment.notes;
        employee.currentEmployment = null;
        employee.isActive = false;
        employee.status = "INACTIVE";
        await fulfillJson(route, 200, employee);
        return;
      }

      if (match[2] === "reactivate" && method === "POST") {
        const position = state.positions.find((item) => item.id === input.positionId);
        const nextEmployment = employmentPayload(employee, position, input.startDate, input.notes);
        employee.employments.unshift(nextEmployment);
        employee.currentEmployment = nextEmployment;
        employee.isActive = true;
        employee.status = "ACTIVE";
        await fulfillJson(route, 200, employee);
        return;
      }
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

  const state = makeState();

  await runTest("SUPER_ADMIN completa el ciclo laboral", async () => {
    const { context, page } = await createPage(browser);
    await mockAdminApi(page, state, employeePermissions);
    await page.goto(`${baseUrl}/admin/employees`);
    await page.getByRole("heading", { name: "Empleados", exact: true }).waitFor();

    await page.getByRole("link", { name: "Puestos" }).click();
    for (const name of ["Tecnico de soporte", "Supervisor de soporte"]) {
      await page.getByRole("button", { name: "Nuevo puesto" }).click();
      await page.getByLabel("Nombre del puesto").fill(name);
      await page.getByRole("button", { name: "Guardar puesto" }).click();
      await page.getByText("El puesto fue creado correctamente.").waitFor();
    }

    await page.getByRole("link", { name: "Volver a empleados" }).click();
    await page.getByRole("button", { name: "Nuevo empleado" }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Ada");
    await page.getByLabel("Apellido", { exact: true }).fill("Lovelace");
    await page.getByLabel(/Email/).fill("ada@artech.test");
    await page.getByLabel(/Telefono/).fill("+502 5555 0101");
    await page.getByLabel("Puesto inicial").selectOption({ label: "Tecnico de soporte" });
    await page.getByLabel("Fecha de inicio").fill("2026-01-10");
    await page.getByRole("button", { name: "Crear empleado" }).click();
    await page.getByText("EMP-001 fue creado correctamente.").waitFor();
    await page.getByRole("link", { name: "Ada Lovelace", exact: true }).click();
    await page.getByRole("heading", { name: "Ada Lovelace" }).waitFor();
    await page.getByText("Sin cuenta vinculada").waitFor();

    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Telefono", { exact: true }).fill("+502 5555 0202");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.getByText("Los datos del empleado fueron actualizados.").waitFor();
    await page.getByText("+502 5555 0202").waitFor();

    await page.getByRole("button", { name: "Cambiar puesto" }).click();
    await page.getByLabel("Nuevo puesto").selectOption({ label: "Supervisor de soporte" });
    await page.getByLabel("Fecha de inicio").fill("2026-02-01");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.getByText("El cambio de puesto quedo registrado.").waitFor();

    await page.getByRole("button", { name: "Finalizar relacion" }).click();
    await page.getByLabel("Ultimo dia laboral").fill("2026-03-01");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.getByText("La relacion laboral fue finalizada.").waitFor();

    await page.getByRole("button", { name: "Reactivar" }).click();
    await page.getByLabel("Nuevo puesto").selectOption({ label: "Tecnico de soporte" });
    await page.getByLabel("Fecha de inicio").fill("2026-04-01");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.getByText("El empleado fue reactivado.").waitFor();
    assert(
      (await page.locator("#employment-history + div article").count()) === 3,
      "El historial debe conservar tres periodos laborales.",
    );
    await page.screenshot({
      path: `${screenshotDirectory}/employee-detail-1440.png`,
      fullPage: true,
    });
    await context.close();
  });

  await runTest("employee.read sin escritura oculta acciones", async () => {
    const { context, page } = await createPage(browser);
    await mockAdminApi(page, state, ["employee.read"]);
    await page.goto(`${baseUrl}/admin/employees/${state.employees[0].id}`);
    await page.getByRole("heading", { name: "Ada Lovelace" }).waitFor();
    for (const action of ["Editar", "Cambiar puesto", "Finalizar relacion", "Reactivar"]) {
      assert(
        (await page.getByRole("button", { name: action, exact: true }).count()) === 0,
        `${action} no debe mostrarse con employee.read solamente.`,
      );
    }
    await context.close();
  });

  await runTest("sin employee.read no monta el modulo", async () => {
    const { context, page } = await createPage(browser);
    const counter = { employees: 0 };
    await mockAdminApi(page, state, ["inventory.read"], counter);
    await page.goto(`${baseUrl}/admin/employees`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();
    assert(counter.employees === 0, "La ruta restringida no debe solicitar empleados.");
    await context.close();
  });

  for (const width of [375, 1440]) {
    await runTest(`responsive empleados ${width}px`, async () => {
      const { context, page } = await createPage(browser, {
        width,
        height: width === 375 ? 812 : 900,
      });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      await mockAdminApi(page, state, employeePermissions);
      await page.goto(`${baseUrl}/admin/employees`);
      await page.getByRole("heading", { name: "Empleados", exact: true }).waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      assert(!overflow, `Existe overflow horizontal a ${width}px.`);

      if (width === 375) {
        await page.getByRole("button", { name: "Nuevo empleado" }).click();
        const dialog = page.getByRole("dialog", { name: "Nuevo empleado" });
        await dialog.waitFor();
        const dialogOverflow = await dialog.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        );
        assert(!dialogOverflow, "El formulario movil tiene overflow horizontal.");
        await page.screenshot({
          path: `${screenshotDirectory}/employee-form-375.png`,
          fullPage: true,
        });
        await page.keyboard.press("Escape");
      }

      await page.goto(`${baseUrl}/admin/employees/${state.employees[0].id}`);
      await page.getByRole("heading", { name: "Ada Lovelace" }).waitFor();
      const detailOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      assert(!detailOverflow, `La ficha tiene overflow horizontal a ${width}px.`);
      assert(consoleErrors.length === 0, `Errores de consola: ${consoleErrors.join(" | ")}`);
      await page.screenshot({
        path: `${screenshotDirectory}/employees-${width}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
} finally {
  if (browser) await browser.close();
  if (serverProcess) stopServer(serverProcess);
}
