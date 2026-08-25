import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const screenshotDirectory = ".next/admin-inventory-qa";

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

function makeState() {
  return {
    movements: [
      {
        id: "movement-pos-1",
        product: { id: "prod-keyboard", name: "Teclado Pro", sku: "SKU-PROD-KEYBOARD" },
        type: "SALE",
        direction: "OUT",
        quantity: 1,
        reference: "SALE-000042",
        note: "POS sale",
        sale: { id: "sale-42", saleNumber: "SALE-000042", channel: "POS" },
        createdBy: null,
        occurredAt: timestamp(),
      },
    ],
    nextId: 1,
    products: [
      makeInventoryProduct("prod-keyboard", "Teclado Pro", "SKU-PROD-KEYBOARD", 8),
      makeInventoryProduct("prod-mouse", "Mouse Core", "SKU-PROD-MOUSE", 3),
      makeInventoryProduct("prod-cable", "Cable HDMI", "SKU-PROD-CABLE", 0),
    ],
  };
}

function makeInventoryProduct(id, name, sku, stock) {
  return {
    productId: id,
    name,
    sku,
    isActive: true,
    category: { id: "cat-1", name: "Perifericos" },
    hasInventoryRecord: true,
    physicalQuantity: stock,
    reservedQuantity: 0,
    availableQuantity: stock,
    stockStatus: stock <= 0 ? "OUT" : stock <= 5 ? "LOW" : "AVAILABLE",
    updatedAt: timestamp(),
  };
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

const inTypes = new Set(["PURCHASE", "RETURN"]);

async function mockApi(page, state, permissions = ["inventory.read", "inventory.adjust"]) {
  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      await fulfillJson(route, 200, adminContext(permissions));
      return;
    }

    if (path === "/api/admin/inventory" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const stockStatus = url.searchParams.get("stockStatus") ?? "all";
      const items = state.products.filter((item) => {
        const matchesSearch =
          !search ||
          item.name.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search);
        const matchesStatus =
          stockStatus === "all" || item.stockStatus === stockStatus.toUpperCase();
        return matchesSearch && matchesStatus;
      });
      await fulfillJson(route, 200, items);
      return;
    }

    if (path === "/api/admin/inventory/movements" && method === "GET") {
      const type = url.searchParams.get("type");
      const items = state.movements
        .filter((movement) => !type || movement.type === type)
        .slice(0, Number(url.searchParams.get("limit") ?? 50));
      await fulfillJson(route, 200, items);
      return;
    }

    if (path === "/api/admin/inventory/movements" && method === "POST") {
      const input = request.postDataJSON();
      const product = state.products.find((item) => item.productId === input.productId);

      if (!product) {
        await fulfillJson(route, 404, { message: "Product not found." });
        return;
      }
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        await fulfillJson(route, 400, { message: "Invalid quantity." });
        return;
      }

      const direction = inTypes.has(input.type) ? "IN" : "OUT";
      if (direction === "OUT" && product.availableQuantity < input.quantity) {
        await fulfillJson(route, 409, {
          message: `Insufficient stock for ${product.name}. Available: ${product.availableQuantity}.`,
        });
        return;
      }

      if (direction === "IN") {
        product.physicalQuantity += input.quantity;
      } else {
        product.physicalQuantity -= input.quantity;
      }
      product.availableQuantity = product.physicalQuantity - product.reservedQuantity;
      product.stockStatus =
        product.availableQuantity <= 0
          ? "OUT"
          : product.availableQuantity <= 5
            ? "LOW"
            : "AVAILABLE";

      const movement = {
        id: `movement-${state.nextId++}`,
        product: {
          id: product.productId,
          name: product.name,
          sku: product.sku,
        },
        type: input.type,
        direction,
        quantity: input.quantity,
        reference: null,
        note: input.reason,
        sale: null,
        createdBy: { id: "admin-user", name: "Admin QA", email: "admin.qa@artech.local" },
        occurredAt: timestamp(),
      };
      state.movements.unshift(movement);
      await fulfillJson(route, 201, movement);
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

  await runTest("listado, entrada y salida trazable con control de stock", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/inventory`);
    await page.getByRole("heading", { name: "Inventario", exact: true }).waitFor();
    await page.getByRole('cell', { name: 'SKU-PROD-KEYBOARD', exact: true }).waitFor();    await page
      .locator("section[aria-labelledby='inventory-list-heading']")
      .getByText("Stock bajo")
      .first()
      .waitFor();
    await page.getByText("Venta POS SALE-000042").first().waitFor();

    await page.getByRole("row", { name: /SKU-PROD-KEYBOARD/ })
      .getByRole("button", { name: "Movimiento" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Movimiento de inventario" });
    await dialog.getByRole("button", { name: "Entrada" }).click();
    await dialog.getByLabel("Tipo").selectOption({ label: "Compra" });
    await dialog.getByLabel("Cantidad").fill("10");
    await dialog.getByLabel("Motivo").fill("Recepcion de mercaderia");
    await dialog.getByRole("button", { name: "Confirmar movimiento" }).click();
    await page
      .getByText("Movimiento Compra de 10 registrado en Teclado Pro.")
      .waitFor();

    await page.getByRole("row", { name: /SKU-PROD-MOUSE/ })
      .getByRole("button", { name: "Movimiento" })
      .click();
    await dialog.getByRole("button", { name: "Salida" }).click();
    await dialog.getByLabel("Tipo").selectOption({ label: "Dano / merma" });
    await dialog.getByLabel("Cantidad").fill("99");
    await dialog.getByLabel("Motivo").fill("Producto dañado");
    await dialog.getByRole("button", { name: "Confirmar movimiento" }).click();
    await page.getByText("No hay stock suficiente para registrar la salida.").waitFor();
    assert(
      state.products.find((item) => item.productId === "prod-mouse").availableQuantity === 3,
      "El stock no debe cambiar cuando la salida es rechazada.",
    );

    await dialog.getByLabel("Cantidad").fill("3");
    await dialog.getByRole("button", { name: "Confirmar movimiento" }).click();
    await page.getByText("Movimiento Dano / merma de 3 registrado en Mouse Core.").waitFor();
    assert(
      state.products.find((item) => item.productId === "prod-mouse").stockStatus === "OUT",
      "El producto debe quedar sin stock tras la salida exacta.",
    );
    await context.close();
  });

  await runTest("busqueda por nombre/SKU y filtro de estado de stock", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/inventory`);
    await page.getByRole("heading", { name: "Inventario", exact: true }).waitFor();

    const listSection = page.locator(
      "section[aria-labelledby='inventory-list-heading']",
    );

    await page.getByLabel("Buscar").fill("SKU-PROD-MOUSE");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await listSection.getByRole('cell', { name: 'SKU-PROD-MOUSE', exact: true }).waitFor();
    assert(
      (await listSection.locator("tbody tr").count()) === 1,
      "La busqueda debe filtrar por SKU.",
    );

    await page.getByLabel("Buscar").fill("");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await page.getByLabel("Estado de stock").selectOption("out");
    await listSection.getByRole('cell', { name: 'SKU-PROD-CABLE', exact: true }).waitFor();
    assert(
      (await listSection.locator("tbody tr").count()) === 1,
      "El filtro de estado debe mostrar solo sin stock.",
    );
    await context.close();
  });

  await runTest("usuario read-only consulta pero no ajusta", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state, ["inventory.read"]);

    await page.goto(`${baseUrl}/admin/inventory`);
    await page.getByRole("heading", { name: "Inventario", exact: true }).waitFor();
    assert(
      (await page.getByRole("button", { name: "Movimiento" }).count()) === 0,
      "Read-only no debe ver botones de ajuste.",
    );
    assert(
      (await page.getByRole("button", { name: "Registrar movimiento" }).count()) === 0,
      "Read-only no debe ver acciones móviles de ajuste.",
    );
    await page.getByText("Historial de movimientos").waitFor();
    await context.close();
  });

  await runTest("sin permiso de lectura el modulo queda bloqueado", async () => {
    const state = makeState();
    let inventoryRequests = 0;
    const { context, page } = await createPage(browser);
    await mockApi(page, state, []);
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/admin/inventory")) {
        inventoryRequests += 1;
      }
    });

    await page.goto(`${baseUrl}/admin/inventory`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();
    assert(inventoryRequests === 0, "Sin inventory.read no debe consultar inventario.");
    await context.close();
  });

  for (const width of [375, 768, 1440]) {
    await runTest(`responsive inventario ${width}px`, async () => {
      const state = makeState();
      const { context, page } = await createPage(browser, {
        width,
        height: width === 375 ? 812 : 900,
      });
      await mockApi(page, state);

      await page.goto(`${baseUrl}/admin/inventory`);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      assert(!overflow, `Existe overflow horizontal en /admin/inventory a ${width}px.`);

      await page.screenshot({
        path: `${screenshotDirectory}/admin-inventory-${width}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
} finally {
  if (browser) await browser.close();
  if (serverProcess) stopServer(serverProcess);
}
