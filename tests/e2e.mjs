import { spawn } from "node:child_process";
import http from "node:http";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const serverTimeoutMs = 60_000;

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
            "127.0.0.1",
            "--port",
            "3000",
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
          ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"],
          {
            cwd: process.cwd(),
            shell: false,
            stdio: "ignore",
          },
        );

  await waitForServer();
  return child;
}

async function createPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  return { context, page };
}

async function runTest(name, callback) {
  await callback();
  console.log(`OK ${name}`);
}

let serverProcess;
let browser;

try {
  serverProcess = await ensureServer();

  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  await runTest("navegación principal y buscador", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(baseUrl);
    await page
      .getByLabel("Categorías", { exact: true })
      .getByRole("link", { name: "GPU" })
      .click();
    await page.waitForURL(/\/catalogo\?categoria=tarjetas-graficas/);
    await page.getByRole("link", { name: /Artech/ }).first().click();
    await page.waitForURL(`${baseUrl}/`);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.locator("#site-search").fill("rtx nova");
    await page
      .locator('form[role="search"]')
      .first()
      .getByRole("link", { name: /RTX 5080 Nova/ })
      .click();
    await page.waitForURL(/\/producto\/rtx-5080/);
    await context.close();
  });

  await runTest("abrir y cerrar carrito", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Carrito", exact: true }).click();
    await page.locator('aside[aria-label="Carrito"]').waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Cerrar carrito" }).click();
    await page.locator('aside[aria-label="Carrito"]').waitFor({ state: "detached" });
    await context.close();
  });

  await runTest("añadir, actualizar y eliminar productos", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(`${baseUrl}/catalogo`);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Añadir al carrito/i }).first().click();
    const cart = page.locator('aside[aria-label="Carrito"]');
    await cart.waitFor({ state: "visible" });
    await cart.getByText("Aura X1").waitFor({ state: "visible" });
    await cart.getByRole("button", { name: /Aumentar cantidad de Aura X1/i }).click();
    await cart.getByText("2", { exact: true }).waitFor({ state: "visible" });
    await cart.getByRole("button", { name: /Reducir cantidad de Aura X1/i }).click();
    await cart.getByText("1", { exact: true }).waitFor({ state: "visible" });
    await cart.getByRole("button", { name: /Eliminar Aura X1/i }).click();
    await cart.getByText(/Tu carrito está vacío/i).waitFor({ state: "visible" });
    await context.close();
  });

  await runTest("login y registro mock", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Cuenta" }).click();
    await page.getByRole("dialog", { name: /Autenticación/i }).waitFor({
      state: "visible",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: /Autenticación/i }).waitFor({
      state: "detached",
    });

    await page.getByRole("button", { name: "Cuenta" }).click();
    const signInForm = page
      .locator('[role="dialog"] form')
      .filter({ has: page.getByRole("button", { name: "Entrar" }) })
      .first();
    await signInForm.locator('input[type="email"]').fill("cliente@artech.local");
    await signInForm.locator('input[autocomplete="current-password"]').fill("demo1234");
    await signInForm.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/cuenta/);
    await page.getByRole("heading", { name: /Hola,/ }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: /Cerrar sesión/i }).click();
    await page.waitForURL(`${baseUrl}/`);

    await page.getByRole("button", { name: "Cuenta" }).click();
    await page
      .locator("button")
      .filter({ hasText: "Crear cuenta", visible: true })
      .click();
    const signUpForm = page
      .locator('[role="dialog"] form')
      .filter({ has: page.getByRole("button", { name: "Registrarme" }) })
      .first();
    await signUpForm.locator('input[autocomplete="name"]').fill("Cliente Artech");
    await signUpForm.locator('input[type="email"]').fill("nuevo@artech.local");
    await signUpForm.locator('input[autocomplete="new-password"]').fill("demo1234");
    await signUpForm.getByRole("button", { name: "Registrarme" }).click();
    await page.waitForURL(/\/cuenta/);
    await page.getByRole("heading", { name: /Hola,/ }).waitFor({ state: "visible" });
    await context.close();
  });

  await runTest("filtros del catálogo", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(`${baseUrl}/catalogo`);
    await page.getByLabel("Tarjetas gráficas").check();
    await page.getByText("1 productos encontrados").waitFor({ state: "visible" });
    await page.getByText("RTX 5080 Nova").waitFor({ state: "visible" });
    assert(
      (await page.getByText("Aura X1").count()) === 0,
      "El filtro GPU no debería mostrar Aura X1",
    );
    await context.close();
  });

  await runTest("apertura de página de producto", async () => {
    const { context, page } = await createPage(browser);
    await page.goto(`${baseUrl}/catalogo`);
    await page.getByRole("button", { name: /Más información/i }).first().click();
    await page.waitForURL(/\/producto\/aura-x1/);
    await page.getByRole("heading", { name: "Aura X1" }).waitFor({ state: "visible" });
    await context.close();
  });
} finally {
  if (browser) {
    await browser.close();
  }

  if (serverProcess) {
    serverProcess.kill();
  }
}
