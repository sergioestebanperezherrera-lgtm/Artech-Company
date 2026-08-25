import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const screenshotDirectory = ".next/admin-cash-pos-qa";

const allPermissions = [
  "cash.read",
  "cash.open",
  "cash.close",
  "cash.move",
  "sale.read",
  "sale.pos_create",
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

function timestamp() {
  return new Date().toISOString();
}

function makeState() {
  return {
    registers: [
      {
        id: "reg-1",
        code: "REG-01",
        name: "Caja principal",
        isActive: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      },
    ],
    currentSession: null,
    sales: [],
    clientRequestIds: new Map(),
    products: [
      {
        id: "prod-keyboard",
        slug: "teclado-pro",
        name: "Teclado Pro",
        category: "perifericos",
        brand: "artech",
        priceGTQ: 100,
        priceUSD: null,
        discountPercent: null,
        shortSpecs: ["Mecanico"],
        fullSpecs: [{ label: "Switch", value: "Lineal" }],
        images: [],
        stock: 3,
        hasRgbLighting: false,
      },
      {
        id: "prod-mouse",
        slug: "mouse-core",
        name: "Mouse Core",
        category: "perifericos",
        brand: "artech",
        priceGTQ: 75,
        priceUSD: null,
        discountPercent: null,
        shortSpecs: ["Sensor optico"],
        fullSpecs: [{ label: "DPI", value: "16000" }],
        images: [],
        stock: 2,
        hasRgbLighting: false,
      },
    ],
  };
}

function getExpectedCash(state) {
  const session = state.currentSession;
  if (!session) return 0;
  if (session.status === "CLOSED") return session.expectedClosingAmount;
  return session.movements.reduce((total, movement) => {
    if (movement.type === "CASH_IN" || movement.type === "SALE") {
      return total + movement.amount;
    }
    return total - movement.amount;
  }, session.openingAmount);
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

function salePayload(state, input, existingId) {
  const saleNumber = existingId
    ? state.sales.find((sale) => sale.id === existingId).saleNumber
    : `SALE-${String(state.sales.length + 1).padStart(6, "0")}`;
  const items = input.items.map((item, index) => {
    const product = state.products.find((candidate) => candidate.id === item.productId);
    return {
      id: `item-${saleNumber}-${index}`,
      productId: product.id,
      productName: product.name,
      sku: `SKU-${product.id.toUpperCase()}`,
      quantity: item.quantity,
      unitPrice: product.priceGTQ,
      lineTotal: product.priceGTQ * item.quantity,
    };
  });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const payment = {
    id: `pay-${saleNumber}`,
    method: input.payment.method,
    status: "PAID",
    amount: Number(input.payment.amount),
    changeAmount: input.payment.method === "CASH" ? Number(input.payment.amount) - total : 0,
    externalReference: null,
    createdAt: timestamp(),
  };

  return {
    id: existingId ?? `sale-${state.sales.length + 1}`,
    saleNumber,
    channel: "POS",
    status: "CONFIRMED",
    cashSession: {
      id: state.currentSession.id,
      status: state.currentSession.status,
      cashRegister: state.currentSession.cashRegister,
    },
    employee: state.currentSession.employment.employee,
    items,
    payment,
    subtotal: total,
    discount: 0,
    total,
    clientRequestId: input.clientRequestId ?? null,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
}

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockApi(page, state, permissions = allPermissions) {
  await page.route("**/api/products", async (route) => {
    await fulfillJson(route, 200, state.products);
  });

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      await fulfillJson(route, 200, adminContext(permissions));
      return;
    }

    if (path === "/api/admin/cash/registers" && method === "GET") {
      await fulfillJson(route, 200, state.registers);
      return;
    }

    if (path === "/api/admin/cash/registers" && method === "POST") {
      const input = request.postDataJSON();
      const register = {
        id: `reg-${state.registers.length + 1}`,
        code: input.code.toUpperCase(),
        name: input.name,
        isActive: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      state.registers.unshift(register);
      await fulfillJson(route, 201, register);
      return;
    }

    if (path === "/api/admin/cash/sessions/current" && method === "GET") {
      await fulfillJson(route, 200, state.currentSession);
      return;
    }

    if (path === "/api/admin/cash/sessions/open" && method === "POST") {
      const input = request.postDataJSON();
      const register = state.registers.find((item) => item.id === input.cashRegisterId);
      state.currentSession = {
        id: "session-1",
        status: "OPEN",
        openedAt: timestamp(),
        closedAt: null,
        openingAmount: Number(input.openingAmount),
        expectedClosingAmount: 0,
        actualClosingAmount: 0,
        differenceAmount: 0,
        cashRegister: register,
        employment: {
          id: "employment-1",
          employee: {
            id: "employee-1",
            code: "EMP-QA-001",
            firstName: "Admin",
            lastName: "QA",
          },
        },
        openedBy: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
        closedBy: null,
        movements: [],
        sales: [],
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      await fulfillJson(route, 201, state.currentSession);
      return;
    }

    const movementMatch = path.match(/^\/api\/admin\/cash\/sessions\/([^/]+)\/movements$/);
    if (movementMatch && method === "POST") {
      const input = request.postDataJSON();
      state.currentSession.movements.push({
        id: `movement-${state.currentSession.movements.length + 1}`,
        type: input.type,
        amount: Number(input.amount),
        reason: input.reason,
        sale: null,
        createdBy: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
        createdAt: timestamp(),
      });
      await fulfillJson(route, 201, state.currentSession);
      return;
    }

    const closeMatch = path.match(/^\/api\/admin\/cash\/sessions\/([^/]+)\/close$/);
    if (closeMatch && method === "POST") {
      const input = request.postDataJSON();
      const expected = getExpectedCash(state);
      state.currentSession.status = "CLOSED";
      state.currentSession.closedAt = timestamp();
      state.currentSession.expectedClosingAmount = expected;
      state.currentSession.actualClosingAmount = Number(input.actualClosingAmount);
      state.currentSession.differenceAmount = Number(input.actualClosingAmount) - expected;
      state.currentSession.closedBy = {
        id: "admin-user",
        name: "Admin QA",
        email: "admin.qa@artech.local",
      };
      await fulfillJson(route, 200, state.currentSession);
      return;
    }

    if (path === "/api/admin/pos/sales" && method === "GET") {
      await fulfillJson(route, 200, state.sales);
      return;
    }

    if (path === "/api/admin/pos/sales" && method === "POST") {
      const input = request.postDataJSON();
      if (input.clientRequestId && state.clientRequestIds.has(input.clientRequestId)) {
        const sale = state.sales.find(
          (item) => item.id === state.clientRequestIds.get(input.clientRequestId),
        );
        await fulfillJson(route, 200, sale);
        return;
      }

      for (const item of input.items) {
        const product = state.products.find((candidate) => candidate.id === item.productId);
        if (!product || product.stock < item.quantity) {
          await fulfillJson(route, 409, { message: "Insufficient stock." });
          return;
        }
      }

      for (const item of input.items) {
        const product = state.products.find((candidate) => candidate.id === item.productId);
        product.stock -= item.quantity;
      }

      const sale = salePayload(state, input);
      state.sales.unshift(sale);
      if (input.clientRequestId) state.clientRequestIds.set(input.clientRequestId, sale.id);
      if (input.payment.method === "CASH") {
        state.currentSession.movements.push({
          id: `movement-${state.currentSession.movements.length + 1}`,
          type: "SALE",
          amount: sale.total,
          reason: null,
          sale: { id: sale.id, saleNumber: sale.saleNumber },
          createdBy: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
          createdAt: timestamp(),
        });
      }
      await fulfillJson(route, 201, sale);
      return;
    }

    const saleMatch = path.match(/^\/api\/admin\/pos\/sales\/([^/]+)$/);
    if (saleMatch && method === "GET") {
      const sale = state.sales.find((item) => item.id === saleMatch[1]);
      await fulfillJson(route, sale ? 200 : 404, sale ?? { message: "Not found." });
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

  await runTest("abrir caja, ingreso, egreso y cierre", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/cash`);
    await page.getByRole("heading", { name: "Caja", exact: true }).waitFor();
    await page.getByLabel("Caja disponible").selectOption("reg-1");
    await page.getByLabel("Apertura").fill("100.00");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await page.getByText("Caja REG-01 abierta.").waitFor();

    await page.getByRole("button", { name: "CASH_IN" }).click();
    await page.getByLabel("Monto").fill("50.00");
    await page.getByLabel("Motivo").fill("Fondo adicional");
    await page.getByRole("button", { name: "Registrar" }).click();
    await page.getByText("Ingreso registrado.").waitFor();

    await page.getByRole("button", { name: "CASH_OUT" }).click();
    await page.getByLabel("Monto").fill("20.00");
    await page.getByLabel("Motivo").fill("Compra operativa");
    await page.getByRole("button", { name: "Registrar" }).click();
    await page.getByText("Egreso registrado.").waitFor();

    await page.getByRole("button", { name: "Cerrar caja" }).click();
    const closeDialog = page.getByRole("dialog", { name: "Cerrar caja" });
    await closeDialog.getByLabel("Efectivo real").fill("130.00");
    await closeDialog.getByRole("button", { name: "Cerrar caja" }).click();
    await page.getByText("Caja cerrada correctamente.").waitFor();
    assert(state.currentSession.status === "CLOSED", "La caja debe quedar cerrada.");
    assert(state.currentSession.differenceAmount === 0, "La diferencia debe ser exacta.");
    await context.close();
  });

  await runTest("venta CASH, cambio, stock actualizado y doble submit", async () => {
    const state = makeState();
    state.currentSession = null;
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/cash`);
    await page.getByLabel("Caja disponible").selectOption("reg-1");
    await page.getByLabel("Apertura").fill("0");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await page.getByText("Caja REG-01 abierta.").waitFor();

    await page.goto(`${baseUrl}/admin/pos`);
    await page.getByRole("heading", { name: "POS", exact: true }).waitFor();
    await page.getByRole("textbox", { name: "Producto" }).fill("Teclado");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByLabel("Monto recibido").fill("150.00");
    await page.getByText(/Cambio/).waitFor();
    await page.getByRole("button", { name: "Cobrar" }).click();
    await page.getByText("Venta SALE-000001 registrada.").waitFor();
    assert(state.sales.length === 1, "La venta CASH debe registrarse una sola vez.");
    assert(state.sales[0].payment.changeAmount === 50, "El cambio debe ser correcto.");
    assert(
      state.products.find((product) => product.id === "prod-keyboard").stock === 2,
      "El stock visual debe refrescarse desde el estado real.",
    );

    await page.getByRole("textbox", { name: "Producto" }).fill("Teclado");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByLabel("Monto recibido").fill("100.00");
    await page.getByRole("button", { name: "Cobrar" }).click();
    await page.getByRole("button", { name: "Cobrar" }).click({ trial: true }).catch(() => {});
    await page.getByText("Venta SALE-000002 registrada.").waitFor();
    assert(state.sales.length === 2, "El doble submit no debe duplicar venta.");
    await context.close();
  });

  await runTest("venta CARD y listado/detalle de ventas", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/cash`);
    await page.getByLabel("Caja disponible").selectOption("reg-1");
    await page.getByLabel("Apertura").fill("0");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await page.getByText("Caja REG-01 abierta.").waitFor();

    await page.goto(`${baseUrl}/admin/pos`);
    await page.getByRole("textbox", { name: "Producto" }).fill("Mouse");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByRole("button", { name: "Tarjeta" }).click();
    await page.getByRole("button", { name: "Cobrar" }).click();
    await page.getByText("Venta SALE-000001 registrada.").waitFor();
    assert(state.sales[0].payment.method === "CARD", "La venta debe ser CARD.");
    assert(state.sales[0].payment.amount === 75, "CARD debe cobrar monto exacto.");

    await page.goto(`${baseUrl}/admin/sales`);
    await page.getByRole("heading", { name: "Ventas POS" }).waitFor();
    await page.getByText("SALE-000001").first().waitFor();
    await page.getByRole("button", { name: "Ver" }).first().click();
    await page.getByRole("dialog", { name: "Venta SALE-000001" }).waitFor();
    await page.getByText("Mouse Core").waitFor();
    await context.close();
  });

  await runTest("permisos read-only ocultan acciones de escritura", async () => {
    const state = makeState();
    state.currentSession = {
      id: "session-read",
      status: "OPEN",
      openedAt: timestamp(),
      closedAt: null,
      openingAmount: 10,
      expectedClosingAmount: 0,
      actualClosingAmount: 0,
      differenceAmount: 0,
      cashRegister: state.registers[0],
      employment: {
        id: "employment-1",
        employee: {
          id: "employee-1",
          code: "EMP-QA-001",
          firstName: "Admin",
          lastName: "QA",
        },
      },
      openedBy: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
      closedBy: null,
      movements: [],
      sales: [],
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    const { context, page } = await createPage(browser);
    await mockApi(page, state, ["cash.read", "sale.read"]);

    await page.goto(`${baseUrl}/admin/cash`);
    await page.getByRole("heading", { name: "Caja", exact: true }).waitFor();
    assert((await page.getByRole("button", { name: "CASH_IN" }).count()) === 0);
    assert((await page.getByRole("button", { name: "Cerrar caja" }).count()) === 0);

    await page.goto(`${baseUrl}/admin/pos`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();
    await page.goto(`${baseUrl}/admin/sales`);
    await page.getByRole("heading", { name: "Ventas POS" }).waitFor();
    await context.close();
  });

  for (const width of [375, 1440]) {
    await runTest(`responsive caja/POS/ventas ${width}px`, async () => {
      const state = makeState();
      const { context, page } = await createPage(browser, {
        width,
        height: width === 375 ? 812 : 900,
      });
      await mockApi(page, state);

      for (const routePath of ["/admin/cash", "/admin/pos", "/admin/sales"]) {
        await page.goto(`${baseUrl}${routePath}`);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        assert(!overflow, `Existe overflow horizontal en ${routePath} a ${width}px.`);
      }

      await page.screenshot({
        path: `${screenshotDirectory}/admin-cash-pos-${width}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
} finally {
  if (browser) await browser.close();
  if (serverProcess) stopServer(serverProcess);
}
