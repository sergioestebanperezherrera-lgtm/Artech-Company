import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { EmploymentStatus, ShiftType, Weekday } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const positionIds = new Set<string>();
const shiftIds = new Set<string>();
const roleIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let shiftReaderCookie: string;

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
  const email = `shift-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Shift Test ${label}`,
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
    select: { id: true },
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
      lastName: "Turnos",
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

async function createShift(label: string, overrides: Record<string, unknown> = {}) {
  const response = await api("/api/admin/shifts", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Turno ${label}`,
      code: `SHIFT_${runId.slice(0, 8)}_${label}`.toUpperCase(),
      type: "DAY",
      startTime: "08:00",
      endTime: "17:00",
      workDays: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
      ],
      ...overrides,
    },
  });
  assert.equal(response.status, 201);
  const shift = (await response.json()) as {
    id: string;
    code: string;
    type: string;
    startTime: string;
    endTime: string;
    workDays: string[];
    isActive: boolean;
  };
  shiftIds.add(shift.id);
  return shift;
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

  const shiftReader = await register("shift-reader");
  shiftReaderCookie = shiftReader.cookie;
  await createRoleWithPermissions(
    `TEST_SHIFT_READER_${runId}`,
    shiftReader.userId,
    ["shift.read"],
  );
});

after(async () => {
  const employments = await prisma.employment.findMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
    select: { id: true },
  });
  await prisma.shiftAssignment.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
  });
  await prisma.employment.deleteMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
  });
  await prisma.employee.deleteMany({ where: { id: { in: Array.from(employeeIds) } } });
  await prisma.shiftWorkDay.deleteMany({
    where: { shiftId: { in: Array.from(shiftIds) } },
  });
  await prisma.shift.deleteMany({ where: { id: { in: Array.from(shiftIds) } } });
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

test("shift endpoints require authentication and shift permissions", async () => {
  const position = await createPosition(`Turnos Lectura ${runId}`);
  const employee = await createEmployee("Lectura", position.id);
  const noPermission = await register("no-permission");

  const unauthenticated = await api("/api/admin/shifts");
  const forbiddenRead = await api("/api/admin/shifts", {
    cookie: noPermission.cookie,
  });
  const allowedRead = await api("/api/admin/shifts", {
    cookie: shiftReaderCookie,
  });
  const forbiddenWrite = await api("/api/admin/shifts", {
    method: "POST",
    cookie: shiftReaderCookie,
    body: {
      name: "Turno no permitido",
      code: `DENIED_${runId.slice(0, 8)}`,
      type: "DAY",
      startTime: "08:00",
      endTime: "17:00",
      workDays: ["MONDAY"],
    },
  });
  const allowedEmployeeRead = await api(
    `/api/admin/employees/${employee.id}/shifts`,
    { cookie: shiftReaderCookie },
  );

  assert.equal(unauthenticated.status, 401);
  assert.equal(forbiddenRead.status, 403);
  assert.equal(allowedRead.status, 200);
  assert.equal(forbiddenWrite.status, 403);
  assert.equal(allowedEmployeeRead.status, 200);
});

test("SUPER_ADMIN creates an overnight shift with enum work days", async () => {
  const shift = await createShift("NOCHE", {
    type: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    workDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
  });

  const body = shift as {
    type: string;
    startTime: string;
    endTime: string;
    workDays: string[];
  };
  assert.equal(body.type, "NIGHT");
  assert.equal(body.startTime, "22:00");
  assert.equal(body.endTime, "06:00");
  assert.deepEqual(body.workDays, [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ]);
});

test("shift CRUD rejects duplicate code and invalid work days", async () => {
  const shift = await createShift("CRUD");
  const duplicate = await api("/api/admin/shifts", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: "Turno duplicado",
      code: shift.code,
      type: "DAY",
      startTime: "08:00",
      endTime: "17:00",
      workDays: ["MONDAY"],
    },
  });
  const duplicatedDays = await api("/api/admin/shifts", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: "Turno dias duplicados",
      code: `DUPDAYS_${runId.slice(0, 8)}`,
      type: "DAY",
      startTime: "08:00",
      endTime: "17:00",
      workDays: ["MONDAY", "MONDAY"],
    },
  });

  assert.equal(duplicate.status, 409);
  assert.equal(duplicatedDays.status, 400);
});

test("SUPER_ADMIN edits and deactivates shifts", async () => {
  const shift = await createShift("EDITAR");
  const edited = await api(`/api/admin/shifts/${shift.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      name: "Turno vespertino editado",
      type: "EVENING",
      startTime: "13:00",
      endTime: "21:00",
      workDays: ["TUESDAY", "THURSDAY"],
      isActive: false,
    },
  });

  assert.equal(edited.status, 200);
  const body = (await edited.json()) as {
    name: string;
    type: string;
    startTime: string;
    endTime: string;
    workDays: string[];
    isActive: boolean;
  };
  assert.equal(body.name, "Turno vespertino editado");
  assert.equal(body.type, "EVENING");
  assert.equal(body.startTime, "13:00");
  assert.equal(body.endTime, "21:00");
  assert.deepEqual(body.workDays, ["TUESDAY", "THURSDAY"]);
  assert.equal(body.isActive, false);
});

test("shift assignment preserves history when the employee changes shift", async () => {
  const position = await createPosition(`Turnos Historial ${runId}`);
  const employee = await createEmployee("Historial", position.id);
  const firstShift = await createShift("PRIMERO");
  const secondShift = await createShift("SEGUNDO", {
    type: "EVENING",
    startTime: "14:00",
    endTime: "22:00",
    workDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
  });

  const first = await api(`/api/admin/employees/${employee.id}/shifts`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      shiftId: firstShift.id,
      effectiveFrom: "2026-01-01",
    },
  });
  assert.equal(first.status, 201);

  const changed = await api(`/api/admin/employees/${employee.id}/shifts`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      shiftId: secondShift.id,
      effectiveFrom: "2026-03-01",
    },
  });
  assert.equal(changed.status, 201);
  const body = (await changed.json()) as {
    current: { shiftId: string; effectiveFrom: string; effectiveTo: null };
    history: Array<{ shiftId: string; effectiveFrom: string; effectiveTo: string | null }>;
  };
  assert.equal(body.current.shiftId, secondShift.id);
  assert.equal(body.current.effectiveFrom, "2026-03-01");
  assert.equal(body.current.effectiveTo, null);
  assert.equal(body.history.length, 2);
  assert.equal(
    body.history.find((assignment) => assignment.shiftId === firstShift.id)
      ?.effectiveTo,
    "2026-02-28",
  );
});

test("database prevents two open shift assignments for the same employment", async () => {
  const position = await createPosition(`Turnos DB ${runId}`);
  const employee = await createEmployee("DB", position.id);
  const firstShift = await createShift("DBUNO");
  const secondShift = await createShift("DBDOS");
  const employmentId = await getActiveEmploymentId(employee.id);

  await prisma.shiftAssignment.create({
    data: {
      employmentId,
      shiftId: firstShift.id,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await assert.rejects(
    prisma.shiftAssignment.create({
      data: {
        employmentId,
        shiftId: secondShift.id,
        effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
      },
    }),
  );
});

test("inactive employee, inactive employment and inactive shift are rejected", async () => {
  const position = await createPosition(`Turnos Inactivo ${runId}`);
  const employee = await createEmployee("Inactivo", position.id);
  const activeShift = await createShift("ACTIVO");
  const inactiveShift = await createShift("INACTIVO");

  const deactivated = await api(`/api/admin/shifts/${inactiveShift.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: false },
  });
  assert.equal(deactivated.status, 200);

  const inactiveShiftResponse = await api(
    `/api/admin/employees/${employee.id}/shifts`,
    {
      method: "POST",
      cookie: adminCookie,
      body: {
        shiftId: inactiveShift.id,
        effectiveFrom: "2026-01-01",
      },
    },
  );
  assert.equal(inactiveShiftResponse.status, 409);

  const terminated = await api(`/api/admin/employees/${employee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-03-31" },
  });
  assert.equal(terminated.status, 200);

  const inactiveEmployment = await api(
    `/api/admin/employees/${employee.id}/shifts`,
    {
      method: "POST",
      cookie: adminCookie,
      body: {
        shiftId: activeShift.id,
        effectiveFrom: "2026-04-01",
      },
    },
  );
  assert.equal(inactiveEmployment.status, 409);
});

test("position change and termination close open shift assignments", async () => {
  const firstPosition = await createPosition(`Turnos Posicion A ${runId}`);
  const secondPosition = await createPosition(`Turnos Posicion B ${runId}`);
  const employee = await createEmployee("Cierre", firstPosition.id);
  const shift = await createShift("CIERRE");

  const assigned = await api(`/api/admin/employees/${employee.id}/shifts`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      shiftId: shift.id,
      effectiveFrom: "2026-01-01",
    },
  });
  assert.equal(assigned.status, 201);

  const changedPosition = await api(
    `/api/admin/employees/${employee.id}/change-position`,
    {
      method: "POST",
      cookie: adminCookie,
      body: {
        positionId: secondPosition.id,
        startDate: "2026-06-01",
      },
    },
  );
  assert.equal(changedPosition.status, 200);

  const closedByPosition = await prisma.shiftAssignment.findFirstOrThrow({
    where: { shiftId: shift.id },
    select: { effectiveTo: true },
  });
  assert.equal(closedByPosition.effectiveTo?.toISOString().slice(0, 10), "2026-05-31");

  const secondAssignment = await api(`/api/admin/employees/${employee.id}/shifts`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      shiftId: shift.id,
      effectiveFrom: "2026-06-01",
    },
  });
  assert.equal(secondAssignment.status, 201);

  const terminated = await api(`/api/admin/employees/${employee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-08-15" },
  });
  assert.equal(terminated.status, 200);

  const openAssignments = await prisma.shiftAssignment.count({
    where: {
      employment: {
        employeeId: employee.id,
      },
      effectiveTo: null,
    },
  });
  assert.equal(openAssignments, 0);
});

test("Prisma enums expose the expected shift vocabulary", () => {
  assert.equal(ShiftType.DAY, "DAY");
  assert.equal(ShiftType.EVENING, "EVENING");
  assert.equal(ShiftType.NIGHT, "NIGHT");
  assert.equal(Weekday.MONDAY, "MONDAY");
});
