import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const categoryIds = new Set<string>();
const brandIds = new Set<string>();
const productIds = new Set<string>();
const roleIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let managerCookie: string;
let noPermissionCookie: string;
let categoryId: string;
let inactiveCategoryId: string;
let brandId: string;

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
  const email = `catalog-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Catalog ${label}`,
      email,
      password: `Artech-${randomUUID()}-Aa9!`,
    }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user: { id: string } };
  return { email, userId: body.user.id, cookie: getCookie(response) };
}

before(async () => {
  await seedRbac(prisma);
  apiServer = await new Promise<Server>((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  apiBaseUrl = getServerUrl(apiServer);

  const admin = await register("admin");
  await grantSuperAdminByEmail(prisma, admin.email);
  adminCookie = admin.cookie;

  const manager = await register("manager");
  const catalogPermission = await prisma.permission.findUniqueOrThrow({
    where: { key: "catalog.manage" },
    select: { id: true },
  });
  const role = await prisma.role.create({
    data: {
      name: `CAT_QA_${runId}`,
      permissions: { create: { permissionId: catalogPermission.id } },
      users: { create: { userId: manager.userId } },
    },
    select: { id: true },
  });
  roleIds.add(role.id);
  managerCookie = manager.cookie;

  noPermissionCookie = (await register("no-permission")).cookie;

  const category = await prisma.category.create({
    data: { name: `Teclados ${runId}`, slug: `teclados-${runId}` },
  });
  categoryId = category.id;
  categoryIds.add(category.id);
  const inactiveCategory = await prisma.category.create({
    data: { name: `Vieja ${runId}`, slug: `vieja-${runId}`, isActive: false },
  });
  inactiveCategoryId = inactiveCategory.id;
  categoryIds.add(inactiveCategoryId);
  const brand = await prisma.brand.create({
    data: { name: `Marca ${runId}`, slug: `marca-${runId}` },
  });
  brandId = brand.id;
  brandIds.add(brand.id);
});

after(async () => {
  const products = Array.from(productIds);
  await prisma.productImage.deleteMany({ where: { productId: { in: products } } });
  await prisma.productSpecification.deleteMany({
    where: { productId: { in: products } },
  });
  await prisma.inventory.deleteMany({ where: { productId: { in: products } } });
  await prisma.inventoryMovement.deleteMany({
    where: { productId: { in: products } },
  });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.brand.deleteMany({ where: { id: { in: Array.from(brandIds) } } });
  await prisma.category.deleteMany({
    where: { id: { in: Array.from(categoryIds) } },
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
  await prisma.user.deleteMany({ where: { email: { in: Array.from(testEmails) } } });

  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("admin catalog endpoints enforce authentication and catalog.manage", async () => {
  const unauthenticated = await api("/api/admin/products");
  assert.equal(unauthenticated.status, 401);

  const forbiddenProducts = await api("/api/admin/products", {
    cookie: noPermissionCookie,
  });
  assert.equal(forbiddenProducts.status, 403);

  const forbiddenCategories = await api("/api/admin/categories", {
    method: "POST",
    cookie: noPermissionCookie,
    body: { name: "Prohibida" },
  });
  assert.equal(forbiddenCategories.status, 403);

  const allowed = await api("/api/admin/products", { cookie: adminCookie });
  assert.equal(allowed.status, 200);
});

test("categories support create, edit and deactivation without destructive delete", async () => {
  const created = await api("/api/admin/categories", {
    method: "POST",
    cookie: adminCookie,
    body: { name: `Monitores ${runId}`, description: "Pantallas" },
  });
  assert.equal(created.status, 201);
  const category = (await created.json()) as {
    id: string;
    slug: string;
    isActive: boolean;
    productCount: number;
  };
  categoryIds.add(category.id);
  assert.equal(category.slug, `monitores-${runId}`);
  assert.equal(category.isActive, true);

  const duplicate = await api("/api/admin/categories", {
    method: "POST",
    cookie: adminCookie,
    body: { name: `monitores   ${runId}` },
  });
  assert.equal(duplicate.status, 409);

  const renamed = await api(`/api/admin/categories/${category.id}`, {
    method: "PATCH",
    cookie: managerCookie,
    body: { description: "Pantallas y monitores" },
  });
  assert.equal(renamed.status, 200);
  const renamedBody = (await renamed.json()) as { slug: string; description: string | null };
  assert.equal(renamedBody.slug, `monitores-${runId}`);
  assert.equal(renamedBody.description, "Pantallas y monitores");

  const deactivated = await api(`/api/admin/categories/${category.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: false },
  });
  assert.equal(deactivated.status, 200);
  assert.equal(((await deactivated.json()) as { isActive: boolean }).isActive, false);

  const reactivated = await api(`/api/admin/categories/${category.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: true },
  });
  assert.equal(reactivated.status, 200);
});

test("product creation validates category, unique SKU and shares Inventory", async () => {
  const invalidCategory = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Producto raro ${runId}`,
      sku: `CAT-INVALID-${runId.slice(0, 6)}`,
      description: "Categoria inexistente",
      price: "100.00",
      categoryId: "no-existe",
    },
  });
  assert.equal(invalidCategory.status, 400);

  const created = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Teclado Mecanico QA ${runId}`,
      sku: `TEC-${runId.slice(0, 8)}`.toUpperCase(),
      description: "Teclado mecanico de prueba",
      price: "450.50",
      previousPrice: "500.00",
      categoryId,
      brandId,
      images: ["/placeholders/productos/aura-x1-lateral.png"],
      specifications: [
        { label: "Switch", value: "Lineal", isHighlighted: true },
        { label: "Conexion", value: "USB-C", isHighlighted: false },
      ],
    },
  });
  assert.equal(created.status, 201);
  const product = (await created.json()) as {
    id: string;
    sku: string;
    slug: string;
    availableQuantity: number;
    hasInventoryRecord: boolean;
    isActive: boolean;
    price: number;
    images: Array<{ url: string; isPrimary: boolean }>;
    specifications: unknown[];
    brand: { id: string } | null;
  };
  productIds.add(product.id);
  assert.equal(product.availableQuantity, 0);
  assert.equal(product.hasInventoryRecord, true);
  assert.equal(product.isActive, true);
  assert.equal(product.price, 450.5);
  assert.equal(product.images.length, 1);
  assert.equal(product.images[0].isPrimary, true);
  assert.ok(product.slug.startsWith("teclado-mecanico-qa"));
  assert.equal(product.specifications.length, 2);
  assert.equal(product.brand?.id, brandId);

  const inventoryRow = await prisma.inventory.findUniqueOrThrow({
    where: { productId: product.id },
    select: { physicalQuantity: true, reservedQuantity: true },
  });
  assert.equal(inventoryRow.physicalQuantity, 0);

  const duplicateSku = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Duplicado ${runId}`,
      sku: product.sku,
      description: "SKU repetido",
      price: "10.00",
      categoryId,
    },
  });
  assert.equal(duplicateSku.status, 409);

  const inactiveCategoryRejected = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Producto viejo ${runId}`,
      sku: `OLD-${runId.slice(0, 8)}`.toUpperCase(),
      description: "Categoria inactiva",
      price: "10.00",
      categoryId: inactiveCategoryId,
    },
  });
  assert.equal(inactiveCategoryRejected.status, 400);
});

test("product listing exposes shared stock with filters", async () => {
  const created = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Mouse Filtrable ${runId}`,
      sku: `MOUSE-FILTRO-${runId.slice(0, 6)}`.toUpperCase(),
      description: "Para probar filtros",
      price: "120.00",
      categoryId,
    },
  });
  const product = (await created.json()) as { id: string; sku: string };
  productIds.add(product.id);

  const bySearch = await api(
    `/api/admin/products?search=${encodeURIComponent(product.sku)}`,
    { cookie: adminCookie },
  );
  assert.equal(bySearch.status, 200);
  const searchItems = (await bySearch.json()) as Array<{ id: string; sku: string }>;
  assert.deepEqual(searchItems.map((item) => item.id), [product.id]);

  const byCategory = await api(`/api/admin/products?categoryId=${categoryId}&status=active`, {
    cookie: adminCookie,
  });
  assert.equal(byCategory.status, 200);
  const categoryItems = (await byCategory.json()) as Array<{
    id: string;
    category: { id: string };
    isActive: boolean;
  }>;
  assert.ok(categoryItems.length >= 2);
  assert.ok(categoryItems.every((item) => item.category.id === categoryId));
  assert.ok(categoryItems.every((item) => item.isActive));
});

test("product update edits fields and deactivation keeps public history intact", async () => {
  const created = await api("/api/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Audifonos QA ${runId}`,
      sku: `AUD-${runId.slice(0, 8)}`.toUpperCase(),
      description: "Audifonos originales",
      price: "300.00",
      categoryId,
    },
  });
  const product = (await created.json()) as {
    id: string;
    sku: string;
    slug: string;
  };
  productIds.add(product.id);

  const updated = await api(`/api/admin/products/${product.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      name: `Audifonos QA v2 ${runId}`,
      price: "280.00",
      description: "Audifonos actualizados",
      previousPrice: "300.00",
    },
  });
  assert.equal(updated.status, 200);
  const updatedBody = (await updated.json()) as {
    name: string;
    price: number;
    slug: string;
    previousPrice: number | null;
  };
  assert.equal(updatedBody.name, `Audifonos QA v2 ${runId}`);
  assert.equal(updatedBody.price, 280);
  assert.equal(updatedBody.previousPrice, 300);
  assert.equal(updatedBody.slug, product.slug);

  // El stock NO se toca desde este modulo.
  const forbiddenStockShape = await api(`/api/admin/products/${product.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { availableQuantity: 99 },
  });
  assert.equal(forbiddenStockShape.status, 400);

  const publicBefore = await api(`/api/products/${product.slug}`);
  assert.equal(publicBefore.status, 200);

  const deactivated = await api(`/api/admin/products/${product.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: false },
  });
  assert.equal(deactivated.status, 200);
  assert.equal(((await deactivated.json()) as { isActive: boolean }).isActive, false);

  const row = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { isActive: true },
  });
  assert.equal(row.isActive, false);

  const publicAfter = await api(`/api/products/${product.slug}`);
  assert.equal(publicAfter.status, 404);

  const adminStillVisible = await api(
    `/api/admin/products?status=inactive&search=${encodeURIComponent(product.sku)}`,
    { cookie: adminCookie },
  );
  const inactiveItems = (await adminStillVisible.json()) as Array<{ id: string }>;
  assert.ok(inactiveItems.some((item) => item.id === product.id));

  // Reactivado para verificar que SaleItem historico nunca se rompe:
  // el producto sigue existiendo en la misma tabla Product.
  const reactivated = await api(`/api/admin/products/${product.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: true },
  });
  assert.equal(reactivated.status, 200);
});
