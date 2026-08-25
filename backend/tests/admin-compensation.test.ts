import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { Currency, EmploymentStatus, PayFrequency } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const positionIds = new Set<string>();
const roleIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let salaryReaderCookie: string;

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
  assert.ok(setCookie, "Expected a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function register(label: string) {
  const email = `compensation-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Compensation Test ${label}`,
      email,
      password: `Artech-${randomUUID()}-Aa9!`,
    }),
  });
  assert.equal(response.status, 201);

  const body = (await response.json()) as { user: { id: string } };
  return { email, userId: body.user.id, cookie: getCookie(response) };
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

async function createRoleWithPermissions(
  name: string,
  userId: string,
  permissionKeys: string[],
) {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true, key: true },
  });
  assert.equal(permissions.length, permissionKeys.length);
  const role = await prisma.role.create({
    data: {
      name,
      permissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
      users: {
        create: { userId },
      },
    },
  });
  roleIds.add(role.id);
}

async function createPosition(name: string) {
  const response = await api("/api/admin/positions", {
    method: "POST",
    cookie: adminCookie,
    body: { name },
  });
  assert.equal(response.status, 201);
  const position = (await response.json()) as { id: string; name: string };
  positionIds.add(position.id);
  return position;
}

async function createEmployee(
  label: string,
  positionId: string,
  startDate = "2026-01-01",
) {
  const response = await api("/api/admin/employees", {
    method: "POST",
    cookie: adminCookie,
    body: {
      firstName: label,
      lastName: "Compensacion",
      email: `${label.toLowerCase()}-${runId}@example.test`,
      positionId,
      startDate,
    },
  });
  assert.equal(response.status, 201);
  const employee = (await response.json()) as {
    id: string;
    currentEmployment: { id: string };
  };
  employeeIds.add(employee.id);
  return employee;
}

async function getActiveEmploymentId(employeeId: string) {
  const employment = await prisma.employment.findFirstOrThrow({
    where: {
      employeeId,
      status: EmploymentStatus.ACTIVE,
    },
    select: { id: true },
  });
  return employment.id;
}

before(async () => {
  await seedRbac(prisma);
  apiServer = await new Promise<Server>((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  apiBaseUrl = getServerUrl(apiServer);

  const admin = await register("super-admin");
  await grantSuperAdminByEmail(prisma, admin.email);
  adminCookie = admin.cookie;

  const salaryReader = await register("salary-reader");
  salaryReaderCookie = salaryReader.cookie;
  await createRoleWithPermissions(
    `TEST_SALARY_READER_${runId}`,
    salaryReader.userId,
    ["salary.read"],
  );
});

after(async () => {
  const employments = await prisma.employment.findMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
    select: { id: true },
  });
  await prisma.compensationPeriod.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
  });
  await prisma.employment.deleteMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
  });
  await prisma.employee.deleteMany({ where: { id: { in: Array.from(employeeIds) } } });
  await prisma.position.deleteMany({
    where: { id: { in: Array.from(positionIds) } },
  });
  await prisma.role.deleteMany({ where: { id: { in: Array.from(roleIds) } } });
  await prisma.user.deleteMany({
    where: { email: { in: Array.from(testEmails) } },
  });
  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("compensation endpoints require authentication and salary permissions", async () => {
  const position = await createPosition(`Comp Lectura ${runId}`);
  const employee = await createEmployee("Lectura", position.id);
  const noPermission = await register("no-permission");

  const unauthenticated = await api(
    `/api/admin/employees/${employee.id}/compensation`,
  );
  const forbiddenRead = await api(
    `/api/admin/employees/${employee.id}/compensation`,
    { cookie: noPermission.cookie },
  );
  const allowedRead = await api(
    `/api/admin/employees/${employee.id}/compensation`,
    { cookie: salaryReaderCookie },
  );
  const forbiddenWrite = await api(
    `/api/admin/employees/${employee.id}/compensation`,
    {
      method: "POST",
      cookie: salaryReaderCookie,
      body: {
        amount: 4000,
        currency: "GTQ",
        payFrequency: "MONTHLY",
        effectiveFrom: "2026-01-01",
      },
    },
  );

  assert.equal(unauthenticated.status, 401);
  assert.equal(forbiddenRead.status, 403);
  assert.equal(allowedRead.status, 200);
  assert.equal(forbiddenWrite.status, 403);
});

test("GET without compensation returns active employment and empty history", async () => {
  const position = await createPosition(`Comp Vacio ${runId}`);
  const employee = await createEmployee("SinSalario", position.id);

  const response = await api(`/api/admin/employees/${employee.id}/compensation`, {
    cookie: salaryReaderCookie,
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    current: null;
    currentEmployment: { id: string };
    history: unknown[];
  };
  assert.equal(body.current, null);
  assert.equal(body.currentEmployment.id, employee.currentEmployment.id);
  assert.deepEqual(body.history, []);
});

test("SUPER_ADMIN creates and reads the first compensation period", async () => {
  const position = await createPosition(`Comp Inicial ${runId}`);
  const employee = await createEmployee("Inicial", position.id);

  const created = await api(`/api/admin/employees/${employee.id}/compensation`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      amount: "4000.00",
      currency: "GTQ",
      payFrequency: "MONTHLY",
      effectiveFrom: "2026-01-01",
    },
  });

  assert.equal(created.status, 201);
  const body = (await created.json()) as {
    current: {
      amount: number;
      currency: string;
      payFrequency: string;
      effectiveFrom: string;
      effectiveTo: null;
    };
    history: unknown[];
  };
  assert.equal(body.current.amount, 4000);
  assert.equal(body.current.currency, "GTQ");
  assert.equal(body.current.payFrequency, "MONTHLY");
  assert.equal(body.current.effectiveFrom, "2026-01-01");
  assert.equal(body.current.effectiveTo, null);
  assert.equal(body.history.length, 1);
});

test("salary changes close the previous period and preserve history", async () => {
  const position = await createPosition(`Comp Historial ${runId}`);
  const employee = await createEmployee("Historial", position.id);

  await api(`/api/admin/employees/${employee.id}/compensation`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      amount: 4000,
      currency: "GTQ",
      payFrequency: "MONTHLY",
      effectiveFrom: "2026-01-01",
    },
  });
  const changed = await api(`/api/admin/employees/${employee.id}/compensation`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      amount: 4500,
      currency: "GTQ",
      payFrequency: "BIWEEKLY",
      effectiveFrom: "2026-08-01",
    },
  });

  assert.equal(changed.status, 201);
  const body = (await changed.json()) as {
    current: { amount: number; payFrequency: string; effectiveFrom: string };
    history: Array<{ amount: number; effectiveFrom: string; effectiveTo: string | null }>;
  };
  assert.equal(body.current.amount, 4500);
  assert.equal(body.current.payFrequency, "BIWEEKLY");
  assert.equal(body.current.effectiveFrom, "2026-08-01");
  assert.equal(body.history.length, 2);
  assert.equal(
    body.history.find((period) => period.amount === 4000)?.effectiveTo,
    "2026-07-31",
  );
});

test("compensation rejects invalid amount and overlapping current periods", async () => {
  const position = await createPosition(`Comp Valida ${runId}`);
  const employee = await createEmployee("Valida", position.id);

  const invalidAmount = await api(
    `/api/admin/employees/${employee.id}/compensation`,
    {
      method: "POST",
      cookie: adminCookie,
      body: {
        amount: 0,
        currency: "GTQ",
        payFrequency: "MONTHLY",
        effectiveFrom: "2026-01-01",
      },
    },
  );
  assert.equal(invalidAmount.status, 400);

  await api(`/api/admin/employees/${employee.id}/compensation`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      amount: 4000,
      currency: "GTQ",
      payFrequency: "MONTHLY",
      effectiveFrom: "2026-01-01",
    },
  });

  const overlapping = await api(
    `/api/admin/employees/${employee.id}/compensation`,
    {
      method: "POST",
      cookie: adminCookie,
      body: {
        amount: 4100,
        currency: "GTQ",
        payFrequency: "MONTHLY",
        effectiveFrom: "2025-12-31",
      },
    },
  );
  assert.equal(overlapping.status, 400);
});

test("database prevents two open compensation periods for the same employment", async () => {
  const position = await createPosition(`Comp DB ${runId}`);
  const employee = await createEmployee("DB", position.id);
  const employmentId = await getActiveEmploymentId(employee.id);

  await prisma.compensationPeriod.create({
    data: {
      employmentId,
      amount: 4000,
      currency: Currency.GTQ,
      payFrequency: PayFrequency.MONTHLY,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await assert.rejects(
    prisma.compensationPeriod.create({
      data: {
        employmentId,
        amount: 4500,
        currency: Currency.GTQ,
        payFrequency: PayFrequency.MONTHLY,
        effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
      },
    }),
  );
});

test("inactive employment is rejected for new compensation", async () => {
  const position = await createPosition(`Comp Inactivo ${runId}`);
  const employee = await createEmployee("Inactivo", position.id);

  const terminated = await api(`/api/admin/employees/${employee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-03-31" },
  });
  assert.equal(terminated.status, 200);

  const response = await api(`/api/admin/employees/${employee.id}/compensation`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      amount: 4000,
      currency: "GTQ",
      payFrequency: "MONTHLY",
      effectiveFrom: "2026-04-01",
    },
  });
  assert.equal(response.status, 409);
});
