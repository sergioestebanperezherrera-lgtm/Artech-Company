import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import {
  CashMovementType,
  CashSessionStatus,
  EmploymentStatus,
} from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const cashRegisterIds = new Set<string>();
const productIds = new Set<string>();
const roleIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let cashierCookie: string;
let noPermissionCookie: string;
let superAdminNoEmployeeCookie: string;
let cashReadOnlyCookie: string;
let adminEmployeeId: string;
let positionId: string;
let categoryId: string;
let brandId: string;
let cashProductId: string;
let cardProductId: string;
let scarceProductId: string;
let inactiveProductId: string;

function getServerUrl(server: Server) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP port.");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function getCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie);
  return setCookie.split(";", 1)[0];
}

async function api(
  path: string,
  options: { method?: string; cookie?: string; body?: unknown } = {},
) {
  return fetch(`${apiBaseUrl}${path}`, {
    method: options.method,
    headers: {
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function register(label: string) {
  const email = `cash-pos-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Cash POS ${label}`,
      email,
      password: `Artech-${randomUUID()}-Aa9!`,
    }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user: { id: string } };
  return { email, userId: body.user.id, cookie: getCookie(response) };
}

async function linkEmployee(userId: string, label: string) {
  const employee = await prisma.employee.create({
    data: {
      userId,
      code: `POS-${runId.slice(0, 8)}-${label}`.toUpperCase(),
      firstName: label,
      lastName: "Caja",
      isActive: true,
      employments: {
        create: {
          positionId,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          status: EmploymentStatus.ACTIVE,
        },
      },
    },
  });
  employeeIds.add(employee.id);
  return employee;
}

async function grantCashier(userId: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: "CASHIER" },
    select: { id: true },
  });
  await prisma.userRole.create({ data: { userId, roleId: role.id } });
}

async function grantSinglePermissionRole(userId: string, permissionKey: string) {
  const permission = await prisma.permission.findUniqueOrThrow({
    where: { key: permissionKey },
    select: { id: true },
  });
  const role = await prisma.role.create({
    data: {
      name: `CASH_READ_QA_${runId}`,
      description: "Role temporal para pruebas de caja read-only.",
      permissions: {
        create: {
          permissionId: permission.id,
        },
      },
    },
    select: { id: true },
  });
  roleIds.add(role.id);
  await prisma.userRole.create({ data: { userId, roleId: role.id } });
}

async function createRegister(label: string, cookie = adminCookie) {
  const response = await api("/api/admin/cash/registers", {
    method: "POST",
    cookie,
    body: { code: `REG-${runId.slice(0, 6)}-${label}`, name: `Caja ${label}` },
  });
  assert.equal(response.status, 201);
  const register = (await response.json()) as { id: string };
  cashRegisterIds.add(register.id);
  return register;
}

async function openSession(
  cashRegisterId: string,
  cookie = adminCookie,
  openingAmount: number | string = 100,
) {
  const response = await api("/api/admin/cash/sessions/open", {
    method: "POST",
    cookie,
    body: { cashRegisterId, openingAmount },
  });
  assert.equal(response.status, 201);
  return (await response.json()) as { id: string; status: string };
}

async function createProduct(
  label: string,
  price: string,
  stock: number,
  isActive = true,
) {
  const product = await prisma.product.create({
    data: {
      name: `Producto POS ${label}`,
      slug: `producto-pos-${runId}-${label}`,
      description: "Producto de prueba POS.",
      sku: `TEST-POS-${runId.slice(0, 8)}-${label}`.toUpperCase(),
      price,
      categoryId,
      brandId,
      isActive,
      inventory: { create: { physicalQuantity: stock, reservedQuantity: 0 } },
    },
  });
  productIds.add(product.id);
  return product.id;
}

before(async () => {
  await seedRbac(prisma);
  apiServer = await new Promise<Server>((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  apiBaseUrl = getServerUrl(apiServer);

  const position = await prisma.position.create({
    data: {
      name: `Cajero POS ${runId}`,
      normalizedName: `cajero pos ${runId}`,
    },
  });
  positionId = position.id;
  const category = await prisma.category.create({
    data: { name: `POS ${runId}`, slug: `pos-${runId}` },
  });
  categoryId = category.id;
  const brand = await prisma.brand.create({
    data: { name: `POS Brand ${runId}`, slug: `pos-brand-${runId}` },
  });
  brandId = brand.id;

  const admin = await register("admin");
  await grantSuperAdminByEmail(prisma, admin.email);
  const adminEmployee = await linkEmployee(admin.userId, "ADMIN");
  adminEmployeeId = adminEmployee.id;
  adminCookie = admin.cookie;

  const cashier = await register("cashier");
  await grantCashier(cashier.userId);
  await linkEmployee(cashier.userId, "CASHIER");
  cashierCookie = cashier.cookie;

  const noPermission = await register("customer");
  noPermissionCookie = noPermission.cookie;

  const superAdminNoEmployee = await register("super-no-employee");
  await grantSuperAdminByEmail(prisma, superAdminNoEmployee.email);
  superAdminNoEmployeeCookie = superAdminNoEmployee.cookie;

  const cashReadOnly = await register("cash-read");
  await grantSinglePermissionRole(cashReadOnly.userId, "cash.read");
  cashReadOnlyCookie = cashReadOnly.cookie;

  cashProductId = await createProduct("CASH", "100.00", 20);
  cardProductId = await createProduct("CARD", "75.50", 10);
  scarceProductId = await createProduct("SCARCE", "50.00", 1);
  inactiveProductId = await createProduct("INACTIVE", "25.00", 10, false);
});

after(async () => {
  const registers = Array.from(cashRegisterIds);
  const products = Array.from(productIds);
  const sessions = await prisma.cashSession.findMany({
    where: { cashRegisterId: { in: registers } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);
  const sales = await prisma.sale.findMany({
    where: { cashSessionId: { in: sessionIds } },
    select: { id: true },
  });
  const saleIds = sales.map((sale) => sale.id);

  await prisma.cashMovement.deleteMany({ where: { cashSessionId: { in: sessionIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.payment.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
  await prisma.cashSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.cashRegister.deleteMany({ where: { id: { in: registers } } });
  await prisma.inventory.deleteMany({ where: { productId: { in: products } } });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.brand.delete({ where: { id: brandId } });
  await prisma.category.delete({ where: { id: categoryId } });
  await prisma.employment.deleteMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
  });
  await prisma.employee.deleteMany({ where: { id: { in: Array.from(employeeIds) } } });
  await prisma.position.delete({ where: { id: positionId } });
  await prisma.user.deleteMany({ where: { email: { in: Array.from(testEmails) } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: Array.from(roleIds) } } });
  await prisma.role.deleteMany({ where: { id: { in: Array.from(roleIds) } } });
  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("cash and POS endpoints enforce authentication and RBAC", async () => {
  const unauthenticated = await api("/api/admin/cash/registers");
  const forbiddenCash = await api("/api/admin/cash/registers", {
    cookie: noPermissionCookie,
  });
  const forbiddenPos = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: noPermissionCookie,
    body: {},
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal(forbiddenCash.status, 403);
  assert.equal(forbiddenPos.status, 403);
});

test("cash read endpoints return 200 for SUPER_ADMIN without an active employee", async () => {
  const registers = await api("/api/admin/cash/registers", {
    cookie: superAdminNoEmployeeCookie,
  });
  const current = await api("/api/admin/cash/sessions/current", {
    cookie: superAdminNoEmployeeCookie,
  });
  const create = await api("/api/admin/cash/registers", {
    method: "POST",
    cookie: superAdminNoEmployeeCookie,
    body: {
      code: `REG-${runId.slice(0, 6)}-NOEMP`,
      name: "Caja sin empleado",
    },
  });

  assert.equal(registers.status, 200);
  assert.equal(current.status, 200);
  assert.equal(await current.json(), null);
  assert.equal(create.status, 201);
  cashRegisterIds.add(((await create.json()) as { id: string }).id);
});

test("cash.read alone can read registers and current session but cannot mutate", async () => {
  const registers = await api("/api/admin/cash/registers", {
    cookie: cashReadOnlyCookie,
  });
  const current = await api("/api/admin/cash/sessions/current", {
    cookie: cashReadOnlyCookie,
  });
  const create = await api("/api/admin/cash/registers", {
    method: "POST",
    cookie: cashReadOnlyCookie,
    body: {
      code: `REG-${runId.slice(0, 6)}-READ`,
      name: "Caja read-only",
    },
  });

  assert.equal(registers.status, 200);
  assert.equal(current.status, 200);
  assert.equal(await current.json(), null);
  assert.equal(create.status, 403);
});

test("cash registers reject duplicate codes and inactive opening", async () => {
  const register = await createRegister("REGISTER");
  const duplicate = await api("/api/admin/cash/registers", {
    method: "POST",
    cookie: adminCookie,
    body: { code: `reg-${runId.slice(0, 6)}-register`, name: "Duplicada" },
  });
  assert.equal(duplicate.status, 409);

  await prisma.cashRegister.update({
    where: { id: register.id },
    data: { isActive: false },
  });
  const inactiveOpen = await api("/api/admin/cash/sessions/open", {
    method: "POST",
    cookie: adminCookie,
    body: { cashRegisterId: register.id, openingAmount: 0 },
  });
  assert.equal(inactiveOpen.status, 409);
});

test("cash session supports opening, manual movements and exact closing", async () => {
  const register = await createRegister("CLOSE");
  const session = await openSession(register.id, adminCookie, "100.00");
  const duplicateOpen = await api("/api/admin/cash/sessions/open", {
    method: "POST",
    cookie: adminCookie,
    body: { cashRegisterId: register.id, openingAmount: 20 },
  });
  assert.equal(duplicateOpen.status, 409);

  const missingReason = await api(
    `/api/admin/cash/sessions/${session.id}/movements`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { type: "CASH_IN", amount: 10 },
    },
  );
  const manualSale = await api(`/api/admin/cash/sessions/${session.id}/movements`, {
    method: "POST",
    cookie: adminCookie,
    body: { type: "SALE", amount: 10, reason: "No permitido" },
  });
  assert.equal(missingReason.status, 400);
  assert.equal(manualSale.status, 400);

  for (const movement of [
    { type: "CASH_IN", amount: "50.00", reason: "Fondo adicional" },
    { type: "CASH_OUT", amount: "20.00", reason: "Compra operativa" },
  ]) {
    const response = await api(`/api/admin/cash/sessions/${session.id}/movements`, {
      method: "POST",
      cookie: adminCookie,
      body: movement,
    });
    assert.equal(response.status, 201);
  }

  const closed = await api(`/api/admin/cash/sessions/${session.id}/close`, {
    method: "POST",
    cookie: adminCookie,
    body: { actualClosingAmount: "135.00" },
  });
  assert.equal(closed.status, 200);
  const body = (await closed.json()) as {
    status: string;
    expectedClosingAmount: number;
    actualClosingAmount: number;
    differenceAmount: number;
  };
  assert.equal(body.status, "CLOSED");
  assert.equal(body.expectedClosingAmount, 130);
  assert.equal(body.actualClosingAmount, 135);
  assert.equal(body.differenceAmount, 5);

  const secondClose = await api(`/api/admin/cash/sessions/${session.id}/close`, {
    method: "POST",
    cookie: adminCookie,
    body: { actualClosingAmount: 135 },
  });
  const afterClose = await api(`/api/admin/cash/sessions/${session.id}/movements`, {
    method: "POST",
    cookie: adminCookie,
    body: { type: "CASH_IN", amount: 1, reason: "Tarde" },
  });
  assert.equal(secondClose.status, 409);
  assert.equal(afterClose.status, 409);
});

test("POS CASH and CARD use database prices, snapshots and shared inventory", async () => {
  const register = await createRegister("SALES");
  const session = await openSession(register.id);
  const current = await api("/api/admin/cash/sessions/current", {
    cookie: adminCookie,
  });
  assert.equal(current.status, 200);
  assert.equal(((await current.json()) as { id: string }).id, session.id);

  const cashSaleResponse = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: cashProductId, quantity: 2 }],
      payment: { method: "CASH", amount: 250 },
      clientRequestId: randomUUID(),
      total: 1,
    },
  });
  assert.equal(cashSaleResponse.status, 201);
  const cashSale = (await cashSaleResponse.json()) as {
    id: string;
    saleNumber: string;
    subtotal: number;
    total: number;
    items: Array<{ productName: string; sku: string; unitPrice: number; lineTotal: number }>;
    payment: { amount: number; changeAmount: number };
  };
  assert.match(cashSale.saleNumber, /^SALE-\d{6,}$/);
  assert.equal(cashSale.subtotal, 200);
  assert.equal(cashSale.total, 200);
  assert.equal(cashSale.items[0]?.productName, "Producto POS CASH");
  assert.equal(cashSale.items[0]?.unitPrice, 100);
  assert.equal(cashSale.items[0]?.lineTotal, 200);
  assert.equal(cashSale.payment.amount, 250);
  assert.equal(cashSale.payment.changeAmount, 50);

  await prisma.product.update({
    where: { id: cashProductId },
    data: { name: "Producto renombrado", sku: `RENAMED-${runId}` },
  });
  const snapshotResponse = await api(`/api/admin/pos/sales/${cashSale.id}`, {
    cookie: adminCookie,
  });
  const snapshot = (await snapshotResponse.json()) as {
    items: Array<{ productName: string; sku: string }>;
  };
  assert.equal(snapshot.items[0]?.productName, "Producto POS CASH");
  assert.match(snapshot.items[0]?.sku ?? "", /-CASH$/);
  await prisma.product.update({
    where: { id: cashProductId },
    data: {
      name: "Producto POS CASH",
      sku: `TEST-POS-${runId.slice(0, 8)}-CASH`.toUpperCase(),
    },
  });

  const cashInventory = await prisma.inventory.findUniqueOrThrow({
    where: { productId: cashProductId },
  });
  const inventoryMovement = await prisma.inventoryMovement.findFirst({
    where: { saleId: cashSale.id, productId: cashProductId },
  });
  const cashMovement = await prisma.cashMovement.findUnique({
    where: { saleId: cashSale.id },
  });
  assert.equal(cashInventory.physicalQuantity, 18);
  assert.equal(inventoryMovement?.quantity, 2);
  assert.equal(inventoryMovement?.reference, cashSale.saleNumber);
  assert.equal(cashMovement?.type, CashMovementType.SALE);
  assert.equal(cashMovement?.amount.toFixed(2), "200.00");

  const cardSaleResponse = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: cardProductId, quantity: 2 }],
      payment: { method: "CARD", amount: "151.00" },
    },
  });
  assert.equal(cardSaleResponse.status, 201);
  const cardSale = (await cardSaleResponse.json()) as {
    id: string;
    total: number;
    payment: { changeAmount: number };
  };
  assert.equal(cardSale.total, 151);
  assert.equal(cardSale.payment.changeAmount, 0);
  assert.equal(
    await prisma.cashMovement.count({ where: { saleId: cardSale.id } }),
    0,
  );

  const detail = await api(`/api/admin/pos/sales/${cashSale.id}`, {
    cookie: adminCookie,
  });
  const listed = await api(`/api/admin/pos/sales?cashSessionId=${session.id}`, {
    cookie: adminCookie,
  });
  assert.equal(detail.status, 200);
  assert.equal(listed.status, 200);
  assert.equal(((await listed.json()) as unknown[]).length, 2);

  const closed = await api(`/api/admin/cash/sessions/${session.id}/close`, {
    method: "POST",
    cookie: adminCookie,
    body: { actualClosingAmount: 300 },
  });
  assert.equal(closed.status, 200);
  assert.equal(
    ((await closed.json()) as { expectedClosingAmount: number }).expectedClosingAmount,
    300,
  );
});

test("POS rejects invalid payments, inactive products and rolls back insufficient stock", async () => {
  const register = await createRegister("ROLLBACK");
  const session = await openSession(register.id);
  const saleCountBefore = await prisma.sale.count({ where: { cashSessionId: session.id } });

  const insufficient = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: scarceProductId, quantity: 2 }],
      payment: { method: "CASH", amount: 100 },
    },
  });
  assert.equal(insufficient.status, 409);
  assert.equal(
    await prisma.sale.count({ where: { cashSessionId: session.id } }),
    saleCountBefore,
  );
  assert.equal(
    (await prisma.inventory.findUniqueOrThrow({ where: { productId: scarceProductId } }))
      .physicalQuantity,
    1,
  );
  assert.equal(
    await prisma.inventoryMovement.count({ where: { productId: scarceProductId } }),
    0,
  );
  assert.equal(
    await prisma.cashMovement.count({ where: { cashSessionId: session.id } }),
    0,
  );

  const inactive = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: inactiveProductId, quantity: 1 }],
      payment: { method: "CASH", amount: 25 },
    },
  });
  const wrongCardAmount = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: cardProductId, quantity: 1 }],
      payment: { method: "CARD", amount: 75 },
    },
  });
  assert.equal(inactive.status, 409);
  assert.equal(wrongCardAmount.status, 400);
});

test("closed sessions reject POS sales", async () => {
  const register = await createRegister("CLOSED-SALE");
  const session = await openSession(register.id, adminCookie, 0);
  await api(`/api/admin/cash/sessions/${session.id}/close`, {
    method: "POST",
    cookie: adminCookie,
    body: { actualClosingAmount: 0 },
  });
  const response = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: adminCookie,
    body: {
      cashSessionId: session.id,
      items: [{ productId: cardProductId, quantity: 1 }],
      payment: { method: "CASH", amount: 100 },
    },
  });
  assert.equal(response.status, 409);
});

test("concurrent POS sales never make stock negative and sale numbers stay unique", async () => {
  const adminRegister = await createRegister("CONCURRENT-A");
  const cashierRegister = await createRegister("CONCURRENT-B", cashierCookie);
  const adminSession = await openSession(adminRegister.id, adminCookie, 0);
  const cashierSession = await openSession(cashierRegister.id, cashierCookie, 0);

  const results = await Promise.all([
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: adminCookie,
      body: {
        cashSessionId: adminSession.id,
        items: [{ productId: scarceProductId, quantity: 1 }],
        payment: { method: "CASH", amount: 50 },
      },
    }),
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: cashierCookie,
      body: {
        cashSessionId: cashierSession.id,
        items: [{ productId: scarceProductId, quantity: 1 }],
        payment: { method: "CASH", amount: 50 },
      },
    }),
  ]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [201, 409],
  );
  const inventory = await prisma.inventory.findUniqueOrThrow({
    where: { productId: scarceProductId },
  });
  assert.equal(inventory.physicalQuantity, 0);
  const sales = await prisma.sale.findMany({
    where: { cashSessionId: { in: [adminSession.id, cashierSession.id] } },
    select: { saleNumber: true },
  });
  assert.equal(sales.length, 1);
  assert.equal(new Set(sales.map((sale) => sale.saleNumber)).size, sales.length);

  const successful = await Promise.all([
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: adminCookie,
      body: {
        cashSessionId: adminSession.id,
        items: [{ productId: cashProductId, quantity: 1 }],
        payment: { method: "CASH", amount: 100 },
      },
    }),
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: cashierCookie,
      body: {
        cashSessionId: cashierSession.id,
        items: [{ productId: cardProductId, quantity: 1 }],
        payment: { method: "CASH", amount: 100 },
      },
    }),
  ]);
  assert.deepEqual(successful.map((response) => response.status), [201, 201]);
  const successfulSales = (await Promise.all(
    successful.map((response) => response.json()),
  )) as Array<{ saleNumber: string }>;
  assert.equal(
    new Set(successfulSales.map((sale) => sale.saleNumber)).size,
    successfulSales.length,
  );
});

test("clientRequestId makes repeated and concurrent submits idempotent", async () => {
  const register = await createRegister("IDEMPOTENT");
  const session = await openSession(register.id);
  const clientRequestId = randomUUID();
  const stockBefore = (
    await prisma.inventory.findUniqueOrThrow({ where: { productId: cashProductId } })
  ).physicalQuantity;
  const request = () =>
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: adminCookie,
      body: {
        cashSessionId: session.id,
        items: [{ productId: cashProductId, quantity: 1 }],
        payment: { method: "CASH", amount: 100 },
        clientRequestId,
      },
    });

  const [first, second] = await Promise.all([request(), request()]);
  assert.deepEqual(
    [first.status, second.status].sort(),
    [200, 201],
  );
  const bodies = (await Promise.all([first.json(), second.json()])) as Array<{
    id: string;
  }>;
  assert.equal(bodies[0]?.id, bodies[1]?.id);
  assert.equal(await prisma.sale.count({ where: { clientRequestId } }), 1);
  assert.equal(
    (await prisma.inventory.findUniqueOrThrow({ where: { productId: cashProductId } }))
      .physicalQuantity,
    stockBefore - 1,
  );
});

test("cash history prevents deleting the employee record", async () => {
  const response = await api(`/api/admin/employees/${adminEmployeeId}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(response.status, 409);
});

test("database guards enforce one open session per register and positive movements", async () => {
  const register = await createRegister("DB-GUARDS");
  const session = await openSession(register.id);
  const employment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: adminEmployeeId, status: EmploymentStatus.ACTIVE },
  });
  const user = await prisma.employee.findUniqueOrThrow({
    where: { id: adminEmployeeId },
    select: { userId: true },
  });
  assert.ok(user.userId);

  await assert.rejects(
    prisma.cashSession.create({
      data: {
        cashRegisterId: register.id,
        employmentId: employment.id,
        openedByUserId: user.userId,
        openingAmount: 0,
        status: CashSessionStatus.OPEN,
      },
    }),
  );
  await assert.rejects(
    prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        createdByUserId: user.userId,
        type: CashMovementType.CASH_IN,
        amount: 0,
        reason: "Invalid",
      },
    }),
  );
});
