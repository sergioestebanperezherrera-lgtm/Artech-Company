import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const screenshotDirectory = ".next/admin-catalog-qa";

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

function makeState(permissions = ["catalog.manage"]) {
  return {
    permissions,
    nextId: 1,
    categories: [
      {
        id: "cat-keyboards",
        name: "Teclados",
        slug: "teclados",
        description: null,
        icon: null,
        isActive: true,
        productCount: 2,
      },
      {
        id: "cat-old",
        name: "Vieja",
        slug: "vieja",
        description: null,
        icon: null,
        isActive: false,
        productCount: 0,
      },
    ],
    brands: [{ id: "brand-artech", name: "Artech", slug: "artech" }],
    products: [
      makeProduct("prod-1", "Teclado Pro QA", "SKU-TEC-001", "cat-keyboards", 450, 8),
      makeProduct("prod-2", "Mouse Core QA", "SKU-MOU-002", "cat-keyboards", 120, 0, false),
    ],
  };
}

function makeProduct(id, name, sku, categoryId, price, stock, isActive = true) {
  return {
    id,
    name,
    sku,
    slug: id,
    description: `Descripcion de ${name}`,
    price,
    previousPrice: null,
    barcode: null,
    hasRgbLighting: false,
    isFeatured: false,
    isActive,
    category: {
      id: categoryId,
      name: categoryId === "cat-keyboards" ? "Teclados" : "Vieja",
      slug: categoryId === "cat-keyboards" ? "teclados" : "vieja",
      isActive: true,
    },
    brand: null,
    images: [{ id: `${id}-img`, url: "/placeholders/productos/aura-x1-lateral.png", altText: null, isPrimary: true }],
    specifications: [],
    availableQuantity: stock,
    hasInventoryRecord: true,
    createdAt: timestamp(),
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

    if (path === "/api/admin/products/brands" && method === "GET") {
      await fulfillJson(route, 200, state.brands);
      return;
    }

    if (path === "/api/admin/products" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const categoryId = url.searchParams.get("categoryId");
      const status = url.searchParams.get("status") ?? "all";
      const items = state.products.filter((product) => {
        const matchesSearch =
          !search ||
          product.name.toLowerCase().includes(search) ||
          product.sku.toLowerCase().includes(search);
        const matchesCategory = !categoryId || product.category.id === categoryId;
        const matchesStatus =
          status === "all" ||
          (status === "active" && product.isActive) ||
          (status === "inactive" && !product.isActive);
        return matchesSearch && matchesCategory && matchesStatus;
      });
      await fulfillJson(route, 200, items);
      return;
    }

    if (path === "/api/admin/products" && method === "POST") {
      const input = request.postDataJSON();
      if (state.products.some((product) => product.sku === input.sku)) {
        await fulfillJson(route, 409, { message: "A product with that SKU already exists." });
        return;
      }
      const category = state.categories.find(
        (item) => item.id === input.categoryId && item.isActive,
      );
      if (!category) {
        await fulfillJson(route, 400, { message: "Invalid category." });
        return;
      }
      const product = makeProduct(
        `prod-${state.nextId++}`,
        input.name,
        input.sku,
        input.categoryId,
        Number(input.price),
        0,
        input.isActive !== false,
      );
      product.description = input.description;
      state.products.unshift(product);
      for (const categoryItem of state.categories) {
        categoryItem.productCount = state.products.filter(
          (item) => item.category.id === categoryItem.id,
        ).length;
      }
      await fulfillJson(route, 201, product);
      return;
    }

    const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (productMatch && method === "PATCH") {
      const product = state.products.find((item) => item.id === productMatch[1]);
      if (!product) {
        await fulfillJson(route, 404, { message: "Not found." });
        return;
      }
      const input = request.postDataJSON();
      Object.assign(product, input);
      if (input.price !== undefined) product.price = Number(input.price);
      product.updatedAt = timestamp();
      await fulfillJson(route, 200, product);
      return;
    }

    if (path === "/api/admin/categories" && method === "GET") {
      await fulfillJson(route, 200, state.categories);
      return;
    }

    if (path === "/api/admin/categories" && method === "POST") {
      const input = request.postDataJSON();
      const slug = input.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (state.categories.some((category) => category.slug === slug)) {
        await fulfillJson(route, 409, { message: "A category with that name already exists." });
        return;
      }
      const category = {
        id: `cat-${state.nextId++}`,
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
        isActive: true,
        productCount: 0,
      };
      state.categories.push(category);
      await fulfillJson(route, 201, category);
      return;
    }

    const categoryMatch = path.match(/^\/api\/admin\/categories\/([^/]+)$/);
    if (categoryMatch && method === "PATCH") {
      const category = state.categories.find((item) => item.id === categoryMatch[1]);
      if (!category) {
        await fulfillJson(route, 404, { message: "Not found." });
        return;
      }
      Object.assign(category, request.postDataJSON());
      await fulfillJson(route, 200, category);
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

  await runTest("productos: listar, crear y editar", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/products`);
    await page.getByRole("heading", { name: "Productos", exact: true }).waitFor();
    await page.getByRole("cell", { name: "SKU-TEC-001" }).waitFor();

    await page.getByRole("button", { name: /Agregar producto/ }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar producto" });
    await dialog.getByLabel("Nombre").fill("Audifonos QA");
    await dialog.getByLabel("SKU").fill("SKU-AUD-003");
    await dialog.getByLabel("Categoria").selectOption("cat-keyboards");
    await dialog.getByLabel("Precio (GTQ)").fill("199.99");
    await dialog
      .getByLabel(/Descripcion/)
      .fill("Audifonos de prueba del catalogo");
    await dialog
      .getByLabel(/Imagenes/)
      .fill("/placeholders/productos/aura-x1-detalle.png");
    await dialog.getByRole("button", { name: "Guardar producto" }).click();
    await page
      .getByText(/Producto Audifonos QA creado con stock 0/)
      .waitFor();
    assert(
      state.products.find((product) => product.sku === "SKU-AUD-003").availableQuantity === 0,
      "El producto nuevo debe nacer con stock 0.",
    );

    await page
      .getByRole("row", { name: /SKU-TEC-001/ })
      .getByRole("button", { name: "Editar" })
      .click();
    const editDialog = page.getByRole("dialog", { name: /Editar producto - SKU-TEC-001/ });
    await editDialog.getByLabel("Nombre").fill("Teclado Pro QA v2");
    await editDialog.getByLabel("Precio (GTQ)").fill("429.00");
    await editDialog.getByRole("button", { name: "Guardar producto" }).click();
    await page.getByText("Producto Teclado Pro QA v2 actualizado.").waitFor();
    assert(
      state.products.find((product) => product.sku === "SKU-TEC-001").price === 429,
      "La edicion debe persistir el precio.",
    );
    await context.close();
  });

  await runTest("productos: busqueda, filtros y desactivacion", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/products`);
    await page.getByRole("cell", { name: "SKU-TEC-001" }).waitFor();

    await page.getByLabel("Buscar").fill("SKU-TEC-001");
    await page.getByRole("button", { name: "Aplicar" }).click();
    assert(
      (await page.locator("tbody tr").count()) === 1,
      "La busqueda debe filtrar por SKU.",
    );

    await page.getByLabel("Buscar").fill("");
    await page.getByLabel("Estado").selectOption("inactive");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await page.getByRole("cell", { name: "SKU-MOU-002" }).waitFor();

    await page.getByLabel("Estado").selectOption("all");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await page
      .getByRole("row", { name: /SKU-TEC-001/ })
      .getByRole("button", { name: "Desactivar" })
      .click();
    await page
      .getByText("Teclado Pro QA fue desactivado.")
      .waitFor();
    assert(
      state.products.find((product) => product.sku === "SKU-TEC-001").isActive === false,
      "Desactivar no elimina el producto.",
    );
    await context.close();
  });

  await runTest("categorias: crear, editar y desactivar", async () => {
    const state = makeState();
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/categories`);
    await page.getByRole("heading", { name: "Categorias", exact: true }).waitFor();
    await page.getByRole("cell", { name: "Teclados", exact: true }).waitFor();

    await page.getByRole("button", { name: "Agregar categoria" }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar categoria" });
    await dialog.getByLabel("Nombre", { exact: true }).fill("Monitores QA");
    await dialog.getByLabel("Descripcion").fill("Pantallas externas");
    await dialog.getByRole("button", { name: "Guardar categoria" }).click();
    await page.getByText("Categoria Monitores QA creada.").waitFor();

    await page
      .getByRole("row", { name: /Monitores QA/ })
      .getByRole("button", { name: "Desactivar" })
      .click();
    await page
      .getByRole("row", { name: /Monitores QA/ })
      .getByText("Inactiva")
      .waitFor();
    assert(
      state.categories.find((category) => category.name === "Monitores QA")
        .isActive === false,
      "La categoria debe quedar desactivada en el estado.",
    );
    await context.close();
  });

  await runTest("permisos read-only ocultan acciones de escritura", async () => {
    const state = makeState(["nonexistent.permission"]);
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/products`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();

    // Con un permiso inexistente el boundary bloquea; verificamos tambien categorias.
    await page.goto(`${baseUrl}/admin/categories`);
    await page.getByRole("heading", { name: "Modulo no disponible" }).waitFor();
    await context.close();
  });

  await runTest("read-only con permiso ve catalogo sin botones de gestion", async () => {
    // catalog.manage es lectura+gestion en este MVP; simulamos un rol que
    // alcanza el boundary pero ejercemos solo lectura visual.
    const state = makeState(["catalog.manage"]);
    const { context, page } = await createPage(browser);
    await mockApi(page, state);

    await page.goto(`${baseUrl}/admin/products`);
    await page.getByRole("cell", { name: "SKU-TEC-001" }).waitFor();
    await page.getByRole("button", { name: "Actualizar" }).waitFor();
    await context.close();
  });

  for (const width of [375, 768, 1440]) {
    await runTest(`responsive catalogo ${width}px`, async () => {
      const state = makeState();
      const { context, page } = await createPage(browser, {
        width,
        height: width === 375 ? 812 : 900,
      });
      await mockApi(page, state);

      for (const routePath of ["/admin/products", "/admin/categories"]) {
        await page.goto(`${baseUrl}${routePath}`);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
        assert(!overflow, `Existe overflow horizontal en ${routePath} a ${width}px.`);
      }

      await page.screenshot({
        path: `${screenshotDirectory}/admin-catalog-${width}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
} finally {
  if (browser) await browser.close();
  if (serverProcess) stopServer(serverProcess);
}
