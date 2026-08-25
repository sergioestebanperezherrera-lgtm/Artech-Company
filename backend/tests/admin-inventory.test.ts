import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { EmploymentStatus, InventoryMovementType } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const productIds = new Set<string>();
const categoryIds = new Set<string>();
const brandIds = new Set<string>();
const positionIds = new Set<string>();
const roleIds = new Set<string>();
const cashRegisterIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let adjusterCookie: string;
let readOnlyCookie: string;
let noPermissionCookie: string;
let categoryId: string;
let brandId: string;
let positionId: string;

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
  const email = `inventory-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Inventory ${label}`,
      email,
      password: `Artech-${randomUUID()}-Aa9!`,
    }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user: { id: string } };
  return { email, userId: body.user.id, cookie: getCookie(response) };
}

async function createRoleWithPermissions(
  label: string,
  permissionKeys: string[],
  userId: string,
) {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true },
  });
  assert.equal(permissions.length, permissionKeys.length);
  const role = await prisma.role.create({
    data: {
      name: `INV_QA_${label}_${runId}`,
      permissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
      users: { create: { userId } },
    },
    select: { id: true },
  });
  roleIds.add(role.id);
}

function inventoryPath(query = "") {
  return `/api/admin/inventory${query}`;
}

async function createProduct(
  label: string,
  stock: number | null,
  isActive = true,
) {
  const product = await prisma.product.create({
    data: {
      name: `Producto INV ${label} ${runId}`,
      slug: `producto-inv-${runId}-${label.toLowerCase()}`,
      description: "Producto de prueba de inventario.",
      sku: `TEST-INV-${runId.slice(0, 8)}-${label}`.toUpperCase(),
      price: "10.00",
      categoryId,
      brandId,
      isActive,
      ...(stock === null
        ? {}
        : { inventory: { create: { physicalQuantity: stock, reservedQuantity: 0 } } }),
    },
  });
  productIds.add(product.id);
  return product;
}

before(async () => {
  await seedRbac(prisma);
  apiServer = await new Promise<Server>((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  apiBaseUrl = getServerUrl(apiServer);

  const category = await prisma.category.create({
    data: { name: `Inventario ${runId}`, slug: `inv-${runId}` },
  });
  categoryId = category.id;
  categoryIds.add(category.id);
  const brand = await prisma.brand.create({
    data: { name: `Inv Brand ${runId}`, slug: `inv-brand-${runId}` },
  });
  brandId = brand.id;
  brandIds.add(brand.id);

  const position = await prisma.position.create({
    data: {
      name: `Almacenista INV ${runId}`,
      normalizedName: `almacenista inv ${runId}`,
    },
  });
  positionId = position.id;
  positionIds.add(position.id);

  const admin = await register("admin");
  await grantSuperAdminByEmail(prisma, admin.email);
  adminCookie = admin.cookie;

  const adjuster = await register("adjuster");
  await createRoleWithPermissions(
    "ADJUSTER",
    ["inventory.read", "inventory.adjust"],
    adjuster.userId,
  );
  adjusterCookie = adjuster.cookie;

  const readOnly = await register("read-only");
  await createRoleWithPermissions("READER", ["inventory.read"], readOnly.userId);
  readOnlyCookie = readOnly.cookie;

  const noPermission = await register("no-permission");
  noPermissionCookie = noPermission.cookie;
});

after(async () => {
  const products = Array.from(productIds);
  const registers = Array.from(cashRegisterIds);
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

  await prisma.inventoryMovement.deleteMany({
    where: { OR: [{ productId: { in: products } }, { saleId: { in: saleIds } }] },
  });
  await prisma.cashMovement.deleteMany({ where: { cashSessionId: { in: sessionIds } } });
  await prisma.payment.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
  await prisma.cashSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.inventory.deleteMany({
    where: { productId: { in: products } },
  });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.brand.deleteMany({ where: { id: { in: Array.from(brandIds) } } });
  await prisma.category.deleteMany({
    where: { id: { in: Array.from(categoryIds) } },
  });
  await prisma.employment.deleteMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
  });
  await prisma.position.deleteMany({
    where: { id: { in: Array.from(positionIds) } },
  });

  const userIds = (
    await prisma.user.findMany({
      where: { email: { in: Array.from(testEmails) } },
      select: { id: true },
    })
  ).map((user) => user.id);
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: Array.from(roleIds) } },
  });
  await prisma.role.deleteMany({ where: { id: { in: Array.from(roleIds) } } });
  await prisma.employee.deleteMany({ where: { id: { in: Array.from(employeeIds) } } });
  await prisma.user.deleteMany({ where: { email: { in: Array.from(testEmails) } } });

  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("inventory endpoints require authentication and inventory.read", async () => {
  const unauthenticated = await api(inventoryPath());
  assert.equal(unauthenticated.status, 401);

  const forbiddenList = await api(inventoryPath(), { cookie: noPermissionCookie });
  assert.equal(forbiddenList.status, 403);

  const forbiddenMovements = await api(inventoryPath("/movements"), {
    cookie: noPermissionCookie,
  });
  assert.equal(forbiddenMovements.status, 403);

  const allowed = await api(inventoryPath(), { cookie: readOnlyCookie });
  assert.equal(allowed.status, 200);
});

test("inventory list exposes real stock with search and stock status filter", async () => {
  const availableProduct = await createProduct("LISTA", 50);
  const lowProduct = await createProduct("LISTB", 3);
  const outProduct = await createProduct("LISTC", 0);
  const noRecordProduct = await createProduct("LISTD", null);

  const all = await api(inventoryPath(), { cookie: adminCookie });
  assert.equal(all.status, 200);
  const allItems = (await all.json()) as Array<{
    productId: string;
    stockStatus: string;
    availableQuantity: number;
    hasInventoryRecord: boolean;
  }>;
  assert.ok(Array.isArray(allItems));
  const byId = new Map(allItems.map((item) => [item.productId, item]));

  assert.equal(byId.get(availableProduct.id)?.stockStatus, "AVAILABLE");
  assert.equal(byId.get(lowProduct.id)?.stockStatus, "LOW");
  assert.equal(byId.get(outProduct.id)?.stockStatus, "OUT");
  assert.equal(byId.get(noRecordProduct.id)?.hasInventoryRecord, false);
  assert.equal(byId.get(noRecordProduct.id)?.availableQuantity, 0);

  const searched = await api(
    inventoryPath(`?search=${encodeURIComponent(availableProduct.sku)}`),
    { cookie: adminCookie },
  );
  assert.equal(searched.status, 200);
  const searchedItems = (await searched.json()) as Array<{ productId: string }>;
  assert.deepEqual(searchedItems.map((item) => item.productId), [
    availableProduct.id,
  ]);

  const onlyLow = await api(inventoryPath("?stockStatus=low"), {
    cookie: adminCookie,
  });
  assert.equal(onlyLow.status, 200);
  const lowItems = (await onlyLow.json()) as Array<{
    productId: string;
    stockStatus: string;
  }>;
  assert.ok(lowItems.length > 0);
  assert.ok(lowItems.every((item) => item.stockStatus === "LOW"));

  const onlyOut = await api(inventoryPath("?stockStatus=out"), {
    cookie: adminCookie,
  });
  assert.equal(onlyOut.status, 200);
  const outItems = (await onlyOut.json()) as Array<{ productId: string }>;
  assert.ok(outItems.some((item) => item.productId === outProduct.id));
  assert.ok(!outItems.some((item) => item.productId === availableProduct.id));
});

test("manual IN movement increases stock and records a traceable movement", async () => {
  const product = await createProduct("ENTRADA", 10);

  const forbiddenAdjust = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: readOnlyCookie,
    body: {
      productId: product.id,
      type: "PURCHASE",
      quantity: 5,
      reason: "Deberia fallar por permiso",
    },
  });
  assert.equal(forbiddenAdjust.status, 403);

  const created = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "PURCHASE",
      quantity: 15,
      reason: "Recepcion de nueva mercaderia",
    },
  });
  assert.equal(created.status, 201);
  const movement = (await created.json()) as {
    id: string;
    direction: string;
    quantity: number;
    note: string | null;
    createdBy: { id: string } | null;
  };
  assert.equal(movement.direction, "IN");
  assert.equal(movement.quantity, 15);
  assert.equal(movement.note, "Recepcion de nueva mercaderia");
  assert.ok(movement.createdBy);

  const stored = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true },
  });
  assert.equal(stored.physicalQuantity, 25);

  const history = await api(inventoryPath(`/movements?productId=${product.id}`), {
    cookie: readOnlyCookie,
  });
  assert.equal(history.status, 200);
  const movements = (await history.json()) as Array<{ id: string }>;
  assert.ok(movements.some((entry) => entry.id === movement.id));

  const negativeRejected = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "DAMAGE",
      quantity: -5,
      reason: "Cantidad negativa rechazada",
    },
  });
  assert.equal(negativeRejected.status, 400);
});

test("manual OUT movement respects available stock and can reach exactly zero", async () => {
  const product = await createProduct("SALIDA", 8);

  const excessive = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "DAMAGE",
      quantity: 9,
      reason: "Salida mayor al stock disponible",
    },
  });
  assert.equal(excessive.status, 409);

  const afterReject = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true },
  });
  assert.equal(afterReject.physicalQuantity, 8);

  const toZero = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "ADJUSTMENT",
      quantity: 8,
      reason: "Correccion de conteo fisico",
    },
  });
  assert.equal(toZero.status, 201);

  const empty = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true },
  });
  assert.equal(empty.physicalQuantity, 0);

  const fromEmpty = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "DAMAGE",
      quantity: 1,
      reason: "Sin stock disponible",
    },
  });
  assert.equal(fromEmpty.status, 409);
});

test("products without an Inventory record support IN and reject OUT", async () => {
  const product = await createProduct("SINREGISTRO", null);

  const outWithoutRecord = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "DAMAGE",
      quantity: 1,
      reason: "Salida sin registro de inventario",
    },
  });
  assert.equal(outWithoutRecord.status, 409);

  const initialIn = await api(inventoryPath("/movements"), {
    method: "POST",
    cookie: adjusterCookie,
    body: {
      productId: product.id,
      type: "PURCHASE",
      quantity: 6,
      reason: "Prima recepcion",
    },
  });
  assert.equal(initialIn.status, 201);

  const record = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true },
  });
  assert.equal(record.physicalQuantity, 6);
});

test("POS sale generates a SALE movement visible in the history", async () => {
  const operator = await register("pos-operator");
  await prisma.userRole.create({
    data: {
      userId: operator.userId,
      roleId: (
        await prisma.role.findUniqueOrThrow({
          where: { name: "CASHIER" },
          select: { id: true },
        })
      ).id,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: operator.userId,
      code: `INV-POS-${runId.slice(0, 8)}`.toUpperCase(),
      firstName: "Pos",
      lastName: "Operador",
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

  const registerRow = await prisma.cashRegister.create({
    data: {
      code: `INVREG-${runId.slice(0, 6)}`,
      name: `Caja inventario ${runId}`,
    },
  });
  cashRegisterIds.add(registerRow.id);
  const session = await prisma.cashSession.create({
    data: {
      cashRegisterId: registerRow.id,
      employmentId: (
        await prisma.employment.findFirstOrThrow({
          where: { employeeId: employee.id },
          select: { id: true },
        })
      ).id,
      openedByUserId: operator.userId,
      openingAmount: "500.00",
      status: "OPEN",
    },
  });

  const saleResponse = await api("/api/admin/pos/sales", {
    method: "POST",
    cookie: operator.cookie,
    body: {
      cashSessionId: session.id,
      payment: { method: "CASH", amount: "30.00" },
      items: [{ productId: (await createProduct("POSAVENDIDO", 4)).id, quantity: 2 }],
    },
  });
  assert.equal(saleResponse.status, 201);
  const sale = (await saleResponse.json()) as {
    items: Array<{ productId: string }>;
  };

  const soldProductId = sale.items[0].productId;
  const history = await api(
    inventoryPath(`/movements?productId=${soldProductId}&type=SALE`),
    { cookie: adminCookie },
  );
  assert.equal(history.status, 200);
  const movements = (await history.json()) as Array<{
    type: InventoryMovementType;
    reference: string | null;
    sale: { channel: string } | null;
    createdBy: unknown;
  }>;
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, "SALE");
  assert.ok(movements[0].reference?.startsWith("SALE-"));
  assert.equal(movements[0].sale?.channel, "POS");
  assert.equal(movements[0].createdBy, null);

  const soldStock = await prisma.inventory.findUniqueOrThrow({
    where: { productId: soldProductId },
    select: { physicalQuantity: true },
  });
  assert.equal(soldStock.physicalQuantity, 2);
});

test("concurrent manual outs and POS sales never oversell the shared inventory", async () => {
  const product = await createProduct("CONCURRENT", 5);

  const operator = await register("pos-concurrent");
  await prisma.userRole.create({
    data: {
      userId: operator.userId,
      roleId: (
        await prisma.role.findUniqueOrThrow({
          where: { name: "CASHIER" },
          select: { id: true },
        })
      ).id,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: operator.userId,
      code: `INV-CONC-${runId.slice(0, 8)}`.toUpperCase(),
      firstName: "Conc",
      lastName: "Operador",
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

  const registerRow = await prisma.cashRegister.create({
    data: {
      code: `INCC-${runId.slice(0, 6)}`,
      name: `Caja concurrencia ${runId}`,
    },
  });
  cashRegisterIds.add(registerRow.id);
  const session = await prisma.cashSession.create({
    data: {
      cashRegisterId: registerRow.id,
      employmentId: (
        await prisma.employment.findFirstOrThrow({
          where: { employeeId: employee.id },
          select: { id: true },
        })
      ).id,
      openedByUserId: operator.userId,
      openingAmount: "500.00",
      status: "OPEN",
    },
  });

  const manualAttempts = Array.from({ length: 4 }, (_, index) =>
    api(inventoryPath("/movements"), {
      method: "POST",
      cookie: adjusterCookie,
      body: {
        productId: product.id,
        type: "DAMAGE",
        quantity: 1,
        reason: `Merma concurrente ${index + 1}`,
      },
    }),
  );
  const posAttempts = Array.from({ length: 4 }, () =>
    api("/api/admin/pos/sales", {
      method: "POST",
      cookie: operator.cookie,
      body: {
        cashSessionId: session.id,
        clientRequestId: `inv-conc-${runId}-${randomUUID()}`,
        payment: { method: "CARD", amount: "10.00" },
        items: [{ productId: product.id, quantity: 1 }],
      },
    }),
  );

  const results = await Promise.all([...manualAttempts, ...posAttempts]);
  const successful = results.filter((response) =>
    [200, 201].includes(response.status),
  );

  const finalInventory = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true },
  });

  assert.equal(successful.length + finalInventory.physicalQuantity, 5);
  assert.ok(finalInventory.physicalQuantity >= 0);

  const movementCount = await prisma.inventoryMovement.count({
    where: { productId: product.id },
  });
  assert.equal(movementCount, successful.length);
});
