import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const serverHost = parsedBaseUrl.hostname;
const serverPort = parsedBaseUrl.port || "3000";
const serverTimeoutMs = 60_000;
const screenshotDirectory = ".next/admin-qa";

const allPermissions = [
  "employee.read",
  "attendance.read",
  "payroll.read",
  "catalog.manage",
  "inventory.read",
  "sale.read",
  "cash.read",
  "role.read",
  "audit.read",
];

const adminContext = {
  user: {
    id: "qa-admin",
    name: "Admin QA",
    email: "admin.qa@artech.local",
  },
  employee: {
    id: "qa-employee",
    code: "ART-QA-001",
    isActive: true,
  },
  roles: ["QA_ADMIN"],
  permissions: allPermissions,
  canAccessAdmin: true,
};

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

  while (Date.now() - startedAt < serverTimeoutMs) {
    if (await canReachServer()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
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
          [
            "/c",
            "npm",
            "run",
            "dev",
            "--",
            "--hostname",
            serverHost,
            "--port",
            serverPort,
          ],
          {
            cwd: process.cwd(),
            shell: false,
            stdio: "ignore",
            windowsHide: true,
          },
        )
      : spawn(
          "npm",
          ["run", "dev", "--", "--hostname", serverHost, "--port", serverPort],
          {
            cwd: process.cwd(),
            shell: false,
            stdio: "ignore",
          },
        );

  await waitForServer();
  return child;
}

async function createPage(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return { context, page };
}

async function mockAdminResponse(page, status, body = {}) {
  await page.route("**/api/admin/me", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

async function runTest(name, callback) {
  await callback();
  console.log(`OK ${name}`);
}

function stopServer(child) {
  if (process.platform === "win32") {
    spawnSync(
      "taskkill.exe",
      ["/pid", String(child.pid), "/T", "/F"],
      { stdio: "ignore", windowsHide: true },
    );
    return;
  }

  child.kill("SIGTERM");
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

  await runTest("rutas públicas conservadas", async () => {
    const { context, page } = await createPage(browser);

    for (const routePath of [
      "/",
      "/catalogo",
      "/carrito",
      "/cuenta",
      "/producto/aura-x1",
    ]) {
      const response = await page.goto(`${baseUrl}${routePath}`);
      assert(response?.ok(), `La ruta pública ${routePath} no respondió correctamente.`);
      await page
        .getByRole("navigation", { name: "Categorías", exact: true })
        .waitFor();
    }

    await context.close();
  });

  await runTest("estado 401", async () => {
    const { context, page } = await createPage(browser);
    await mockAdminResponse(page, 401, { message: "Authentication required." });
    await page.goto(`${baseUrl}/admin`);
    await page
      .getByRole("heading", { name: "Necesitas iniciar sesión para acceder." })
      .waitFor();
    await page.screenshot({
      path: `${screenshotDirectory}/admin-401.png`,
      fullPage: true,
    });
    assert(
      (await page.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")) ===
        "/cuenta",
      "El estado 401 debe dirigir al flujo de cuenta.",
    );
    assert(
      (await page.getByRole("navigation", { name: "Categorías" }).count()) === 0,
      "El admin no debe montar la navbar pública.",
    );
    await context.close();
  });

  await runTest("estado 403", async () => {
    const { context, page } = await createPage(browser);
    await mockAdminResponse(page, 403, { message: "Internal admin access required." });
    await page.goto(`${baseUrl}/admin`);
    await page.getByRole("heading", { name: "Acceso restringido" }).waitFor();
    await page
      .getByText("Tu cuenta no tiene permisos para acceder al panel administrativo.")
      .waitFor();
    await page.screenshot({
      path: `${screenshotDirectory}/admin-403.png`,
      fullPage: true,
    });
    assert(
      (await page.getByRole("link", { name: "Volver a la tienda" }).getAttribute("href")) ===
        "/",
      "El estado 403 debe ofrecer regreso a la tienda.",
    );
    await context.close();
  });

  await runTest("caída de API y reintento", async () => {
    const { context, page } = await createPage(browser);
    let apiIsUnavailable = true;

    await page.route("**/api/admin/me", (route) => {
      if (apiIsUnavailable) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Service unavailable." }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adminContext),
      });
    });

    await page.goto(`${baseUrl}/admin`);
    await page
      .getByRole("heading", { name: "No se pudo cargar el panel administrativo." })
      .waitFor();
    apiIsUnavailable = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await page.getByRole("heading", { name: "Hola, Admin." }).waitFor();
    await context.close();
  });

  await runTest("navegación por permisos", async () => {
    const { context, page } = await createPage(browser);
    const limitedContext = {
      ...adminContext,
      permissions: ["employee.read", "inventory.read"],
    };

    await mockAdminResponse(page, 200, limitedContext);
    await page.goto(`${baseUrl}/admin`);
    const navigation = page.getByRole("navigation", {
      name: "Navegación administrativa",
    });

    await navigation.getByRole("link", { name: "Empleados" }).waitFor();
    await navigation.getByRole("link", { name: "Inventario" }).waitFor();
    assert(
      (await navigation.getByRole("link", { name: "Nómina" }).count()) === 0,
      "Nómina no debe mostrarse sin payroll.read.",
    );
    assert(
      (await navigation.getByRole("link", { name: "Seguridad" }).count()) === 0,
      "Seguridad no debe mostrarse sin role.read.",
    );

    await page.goto(`${baseUrl}/admin/payroll`);
    await page.getByRole("heading", { name: "Módulo no disponible" }).waitFor();
    await context.close();
  });

  await runTest("dashboard, refresh, placeholder y logout", async () => {
    const { context, page } = await createPage(browser);
    await mockAdminResponse(page, 200, adminContext);
    await page.route("**/api/auth/logout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Logged out." }),
      }),
    );

    await page.goto(`${baseUrl}/admin`);
    await page.getByRole("heading", { name: "Hola, Admin." }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "Hola, Admin." }).waitFor();
    await page.getByRole("link", { name: "Empleados" }).first().click();
    await page.waitForURL(`${baseUrl}/admin/employees`);
    await page.getByRole("heading", { name: "Empleados" }).waitFor();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(`${baseUrl}/`);
    await context.close();
  });

  for (const width of [375, 768, 1024, 1440]) {
    await runTest(`responsive ${width}px`, async () => {
      const { context, page } = await createPage(browser, {
        width,
        height: width < 1024 ? 844 : 900,
      });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      await mockAdminResponse(page, 200, adminContext);
      await page.goto(`${baseUrl}/admin`);
      await page.getByRole("heading", { name: "Hola, Admin." }).waitFor();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      assert(!hasHorizontalOverflow, `Existe overflow horizontal a ${width}px.`);

      const menuButton = page.getByRole("button", {
        name: "Abrir navegación administrativa",
      });

      if (width < 1024) {
        await menuButton.click();
        const drawer = page.getByRole("dialog", {
          name: "Navegación administrativa",
        });
        await drawer.waitFor();
        if (width === 375) {
          await page.screenshot({
            path: `${screenshotDirectory}/admin-drawer-375.png`,
            fullPage: true,
          });
        }
        await page.keyboard.press("Escape");
        await drawer.waitFor({ state: "hidden" });
      } else {
        assert(!(await menuButton.isVisible()), `El menú móvil aparece a ${width}px.`);
        await page
          .getByRole("navigation", { name: "Navegación administrativa" })
          .getByRole("link", { name: "Dashboard" })
          .waitFor();
      }

      await page.screenshot({
        path: `${screenshotDirectory}/admin-${width}.png`,
        fullPage: true,
      });
      assert(
        consoleErrors.length === 0,
        `Errores de consola a ${width}px: ${consoleErrors.join(" | ")}`,
      );
      await context.close();
    });
  }
} finally {
  if (browser) {
    await browser.close();
  }

  if (serverProcess) {
    stopServer(serverProcess);
  }
}
