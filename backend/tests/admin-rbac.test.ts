import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import express, { type Express } from "express";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { errorMiddleware } from "../src/middlewares/error.middleware";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { requirePermission } from "../src/modules/auth/auth.middleware";
import { seedRbac } from "../prisma/seed-rbac";
import {
  allPermissionKeys,
  permissionSeeds,
  rolePermissionMatrix,
  roleSeeds,
} from "../prisma/seed-data/rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;

function getServerUrl(server: Server) {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP port.");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function startServer(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => {
      resolve(listeningServer);
    });
  });

  return {
    server,
    baseUrl: getServerUrl(server),
  };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function makeCredentials(label: string) {
  const email = `admin-phase1-${runId}-${label}@example.test`;
  testEmails.add(email);

  return {
    name: `Admin Phase 1 ${label}`,
    email,
    password: `Artech-${randomUUID()}-Aa9!`,
  };
}

function getCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Expected the auth response to set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function register(label: string) {
  const credentials = makeCredentials(label);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  assert.equal(response.status, 201);

  return {
    ...credentials,
    cookie: getCookie(response),
  };
}

async function getCommercialFingerprint() {
  const [categories, brands, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, slug: true, icon: true, isActive: true },
    }),
    prisma.brand.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, slug: true, logoUrl: true, isActive: true },
    }),
    prisma.product.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        previousPrice: true,
        hasRgbLighting: true,
        isActive: true,
        isFeatured: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, url: true, sortOrder: true, isPrimary: true },
        },
        specifications: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            value: true,
            sortOrder: true,
            isHighlighted: true,
          },
        },
        inventory: {
          select: { physicalQuantity: true, reservedQuantity: true },
        },
      },
    }),
  ]);

  return JSON.stringify({ categories, brands, products });
}

before(async () => {
  await seedRbac(prisma);
  const started = await startServer(createApp());
  apiServer = started.server;
  apiBaseUrl = started.baseUrl;
});

after(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: Array.from(testEmails) } },
  });
  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("RBAC seed is idempotent and leaves commercial data unchanged", async () => {
  const catalogBefore = await getCommercialFingerprint();
  const first = await seedRbac(prisma);
  const second = await seedRbac(prisma);
  const catalogAfter = await getCommercialFingerprint();

  assert.deepEqual(first, { roles: 5, permissions: 27, rolePermissions: 70 });
  assert.deepEqual(second, first);
  assert.equal(catalogAfter, catalogBefore);

  const roles = await prisma.role.findMany({
    where: { name: { in: roleSeeds.map((role) => role.name) } },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  assert.equal(roles.length, roleSeeds.length);
  assert.equal(
    await prisma.permission.count({
      where: { key: { in: permissionSeeds.map((permission) => permission.key) } },
    }),
    permissionSeeds.length,
  );

  for (const role of roles) {
    const expected = rolePermissionMatrix[
      role.name as keyof typeof rolePermissionMatrix
    ];
    assert.ok(expected, `Unexpected managed role ${role.name}.`);
    assert.deepEqual(
      role.permissions.map((item) => item.permission.key).sort(),
      [...expected].sort(),
    );
  }
});

test("GET /api/admin/me returns 401 without a session", async () => {
  const response = await fetch(`${apiBaseUrl}/api/admin/me`);
  assert.equal(response.status, 401);
});

test("GET /api/admin/me returns 403 for a customer without internal roles", async () => {
  const account = await register("customer");
  const response = await fetch(`${apiBaseUrl}/api/admin/me`, {
    headers: { Cookie: account.cookie },
  });

  assert.equal(response.status, 403);
});

test("GET /api/admin/me returns internal context for SUPER_ADMIN", async () => {
  const account = await register("super-admin");
  const firstGrant = await grantSuperAdminByEmail(prisma, account.email);
  const secondGrant = await grantSuperAdminByEmail(prisma, account.email);

  assert.equal(firstGrant.created, true);
  assert.equal(secondGrant.created, false);

  const response = await fetch(`${apiBaseUrl}/api/admin/me`, {
    headers: { Cookie: account.cookie },
  });
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    user: { email: string };
    employee: null;
    roles: string[];
    permissions: string[];
    canAccessAdmin: boolean;
  };

  assert.equal(body.user.email, account.email);
  assert.equal(body.employee, null);
  assert.deepEqual(body.roles, ["SUPER_ADMIN"]);
  assert.deepEqual(body.permissions, [...allPermissionKeys].sort());
  assert.equal(body.canAccessAdmin, true);
});

test("requirePermission denies missing permission and allows DB permission", async () => {
  const customer = await register("permission-denied");
  const admin = await register("permission-allowed");
  await grantSuperAdminByEmail(prisma, admin.email);

  const permissionApp = express();
  permissionApp.get(
    "/protected",
    requirePermission("employee.read"),
    (_request, response) => {
      response.status(200).json({ ok: true });
    },
  );
  permissionApp.use(errorMiddleware);

  const started = await startServer(permissionApp);

  try {
    const denied = await fetch(`${started.baseUrl}/protected`, {
      headers: { Cookie: customer.cookie },
    });
    const allowed = await fetch(`${started.baseUrl}/protected`, {
      headers: { Cookie: admin.cookie },
    });

    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
  } finally {
    await stopServer(started.server);
  }
});

test("inactive users are rejected even when they have a session", async () => {
  const account = await register("inactive");
  await grantSuperAdminByEmail(prisma, account.email);
  await prisma.user.update({
    where: { email: account.email },
    data: { isActive: false },
  });

  const response = await fetch(`${apiBaseUrl}/api/admin/me`, {
    headers: { Cookie: account.cookie },
  });

  assert.equal(response.status, 401);
});

test("inactive employee records block internal access", async () => {
  const account = await register("inactive-employee");
  await grantSuperAdminByEmail(prisma, account.email);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: account.email },
    select: { id: true },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      code: `TEST-${randomUUID()}`,
      isActive: false,
    },
    select: { id: true },
  });

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/me`, {
      headers: { Cookie: account.cookie },
    });

    assert.equal(response.status, 403);
  } finally {
    await prisma.employee.delete({ where: { id: employee.id } });
  }
});

test("public auth register, me, login and logout remain functional", async () => {
  const account = await register("public-auth");

  const meAfterRegister = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Cookie: account.cookie },
  });
  assert.equal(meAfterRegister.status, 200);

  const firstLogout = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: account.cookie },
  });
  assert.equal(firstLogout.status, 200);

  const expiredMe = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Cookie: account.cookie },
  });
  assert.equal(expiredMe.status, 401);

  const login = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  assert.equal(login.status, 200);

  const loginCookie = getCookie(login);
  const meAfterLogin = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Cookie: loginCookie },
  });
  assert.equal(meAfterLogin.status, 200);

  const secondLogout = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: loginCookie },
  });
  assert.equal(secondLogout.status, 200);
});

test("commercial products API remains functional", async () => {
  const response = await fetch(`${apiBaseUrl}/api/products`);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(await response.json()));
});
