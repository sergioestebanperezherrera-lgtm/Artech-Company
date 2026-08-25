import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { AttendanceStatus, EmploymentStatus } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import {
  attendanceTime,
  clockIn,
  clockOut,
  overrideAttendance,
} from "../src/modules/attendance/attendance.service";
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
let attendanceReaderCookie: string;
let attendanceRecorderCookie: string;
let attendanceOverrideCookie: string;
let adminUserId: string;

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
  const email = `attendance-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Attendance Test ${label}`,
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
        create: permissions.map((permission) => ({ permissionId: permission.id })),
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
  const position = (await response.json()) as { id: string };
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
      lastName: "Asistencia",
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
      name: `Turno asistencia ${label}`,
      code: `ATT_${runId.slice(0, 8)}_${label}`.toUpperCase(),
      type: "DAY",
      startTime: "08:00",
      endTime: "17:00",
      workDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      ...overrides,
    },
  });
  assert.equal(response.status, 201);
  const shift = (await response.json()) as { id: string };
  shiftIds.add(shift.id);
  return shift;
}

async function assignShift(
  employeeId: string,
  shiftId: string,
  effectiveFrom = "2026-01-01",
) {
  const response = await api(`/api/admin/employees/${employeeId}/shifts`, {
    method: "POST",
    cookie: adminCookie,
    body: { shiftId, effectiveFrom },
  });
  assert.equal(response.status, 201);
  return response.json();
}

function localTime(workDate: string, hours: number, minutes = 0) {
  return attendanceTime.localDateTimeToUtc(workDate, hours * 60 + minutes);
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
  adminUserId = admin.userId;

  const reader = await register("reader");
  attendanceReaderCookie = reader.cookie;
  await createRoleWithPermissions(
    `TEST_ATTENDANCE_READER_${runId}`,
    reader.userId,
    ["attendance.read"],
  );

  const recorder = await register("recorder");
  attendanceRecorderCookie = recorder.cookie;
  await createRoleWithPermissions(
    `TEST_ATTENDANCE_RECORDER_${runId}`,
    recorder.userId,
    ["attendance.record"],
  );

  const override = await register("override");
  attendanceOverrideCookie = override.cookie;
  await createRoleWithPermissions(
    `TEST_ATTENDANCE_OVERRIDE_${runId}`,
    override.userId,
    ["attendance.override"],
  );
});

after(async () => {
  const employments = await prisma.employment.findMany({
    where: { employeeId: { in: Array.from(employeeIds) } },
    select: { id: true },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
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

test("attendance endpoints require authentication and permissions", async () => {
  const position = await createPosition(`Asistencia permisos ${runId}`);
  const employee = await createEmployee("Permisos", position.id);
  const noPermission = await register("no-permission");

  const unauthenticated = await api("/api/admin/attendance");
  const forbiddenRead = await api("/api/admin/attendance", {
    cookie: noPermission.cookie,
  });
  const allowedRead = await api("/api/admin/attendance", {
    cookie: attendanceReaderCookie,
  });
  const forbiddenClockIn = await api("/api/admin/attendance/clock-in", {
    method: "POST",
    cookie: attendanceReaderCookie,
    body: { employeeId: employee.id },
  });
  const forbiddenOverride = await api("/api/admin/attendance/record-id", {
    method: "PATCH",
    cookie: attendanceRecorderCookie,
    body: { status: "EXCUSED", adjustmentReason: "Prueba" },
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal(forbiddenRead.status, 403);
  assert.equal(allowedRead.status, 200);
  assert.equal(forbiddenClockIn.status, 403);
  assert.equal(forbiddenOverride.status, 403);
});

test("clock-in stores punctual attendance snapshot", async () => {
  const position = await createPosition(`Asistencia puntual ${runId}`);
  const employee = await createEmployee("Puntual", position.id);
  const shift = await createShift("PUNTUAL");
  await assignShift(employee.id, shift.id);

  const record = await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 0),
  );

  assert.equal(record.workDate, "2026-08-25");
  assert.equal(record.status, "PRESENT");
  assert.equal(record.lateMinutes, 0);
  assert.equal(record.expectedShiftName, "Turno asistencia PUNTUAL");
  assert.equal(record.expectedStartTime, "08:00");
  assert.equal(record.expectedEndTime, "17:00");
  assert.equal(record.expectedCrossesMidnight, false);
});

test("late clock-in marks LATE and calculates minutes", async () => {
  const position = await createPosition(`Asistencia tarde ${runId}`);
  const employee = await createEmployee("Tarde", position.id);
  const shift = await createShift("TARDE");
  await assignShift(employee.id, shift.id);

  const record = await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 17),
  );

  assert.equal(record.status, "LATE");
  assert.equal(record.lateMinutes, 17);
});

test("duplicate clock-in and database duplicate records are rejected", async () => {
  const position = await createPosition(`Asistencia duplicada ${runId}`);
  const employee = await createEmployee("Duplicada", position.id);
  const shift = await createShift("DUPLICADA");
  await assignShift(employee.id, shift.id);

  await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 0),
  );

  await assert.rejects(
    clockIn(
      { employeeId: employee.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 1),
    ),
  );

  const employment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: employee.id },
    select: { id: true },
  });

  await assert.rejects(
    prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        employmentId: employment.id,
        workDate: new Date("2026-08-25T00:00:00.000Z"),
        status: AttendanceStatus.PRESENT,
      },
    }),
  );
});

test("clock-out closes the open attendance and rejects duplicate clock-out", async () => {
  const position = await createPosition(`Asistencia salida ${runId}`);
  const employee = await createEmployee("Salida", position.id);
  const shift = await createShift("SALIDA");
  await assignShift(employee.id, shift.id);

  await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 0),
  );
  const closed = await clockOut(
    { employeeId: employee.id },
    localTime("2026-08-25", 17, 3),
  );

  assert.ok(closed.clockOutAt);
  assert.equal(closed.workDate, "2026-08-25");
  await assert.rejects(
    clockOut({ employeeId: employee.id }, localTime("2026-08-25", 17, 4)),
  );
});

test("missing shift, non-work day, inactive employee and inactive employment are rejected", async () => {
  const position = await createPosition(`Asistencia rechazos ${runId}`);
  const withoutShift = await createEmployee("SinTurno", position.id);
  await assert.rejects(
    clockIn(
      { employeeId: withoutShift.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 0),
    ),
  );

  const nonWorkDay = await createEmployee("NoLaboral", position.id);
  const mondayOnlyShift = await createShift("LUNES", { workDays: ["MONDAY"] });
  await assignShift(nonWorkDay.id, mondayOnlyShift.id);
  await assert.rejects(
    clockIn(
      { employeeId: nonWorkDay.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 0),
    ),
  );

  const inactiveEmployee = await createEmployee("Inactivo", position.id);
  const shift = await createShift("INACTIVO");
  await assignShift(inactiveEmployee.id, shift.id);
  await api(`/api/admin/employees/${inactiveEmployee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-08-24" },
  });
  await assert.rejects(
    clockIn(
      { employeeId: inactiveEmployee.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 0),
    ),
  );

  const inactiveEmployment = await createEmployee("EmploymentEnded", position.id);
  await assignShift(inactiveEmployment.id, shift.id);
  await prisma.employment.updateMany({
    where: { employeeId: inactiveEmployment.id },
    data: {
      status: EmploymentStatus.ENDED,
      endDate: new Date("2026-08-24T00:00:00.000Z"),
    },
  });
  await assert.rejects(
    clockIn(
      { employeeId: inactiveEmployment.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 0),
    ),
  );
});

test("overnight shift keeps clock-out on the same workDate", async () => {
  const position = await createPosition(`Asistencia noche ${runId}`);
  const employee = await createEmployee("Noche", position.id);
  const shift = await createShift("NOCHE", {
    type: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    workDays: ["TUESDAY"],
  });
  await assignShift(employee.id, shift.id);

  const opened = await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 21, 58),
  );
  const closed = await clockOut(
    { employeeId: employee.id },
    localTime("2026-08-26", 6, 3),
  );

  assert.equal(opened.workDate, "2026-08-25");
  assert.equal(opened.expectedCrossesMidnight, true);
  assert.equal(opened.expectedStartTime, "22:00");
  assert.equal(opened.expectedEndTime, "06:00");
  assert.equal(closed.workDate, "2026-08-25");
  assert.ok(closed.clockOutAt?.startsWith("2026-08-26"));
});

test("attendance snapshot does not change when Shift is edited later", async () => {
  const position = await createPosition(`Asistencia snapshot ${runId}`);
  const employee = await createEmployee("Snapshot", position.id);
  const shift = await createShift("SNAPSHOT");
  await assignShift(employee.id, shift.id);

  const record = await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 0),
  );
  const response = await api(`/api/admin/shifts/${shift.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      name: "Turno editado despues",
      startTime: "10:00",
      endTime: "18:00",
    },
  });
  assert.equal(response.status, 200);

  const listed = await api(`/api/admin/attendance?employeeId=${employee.id}`, {
    cookie: attendanceReaderCookie,
  });
  assert.equal(listed.status, 200);
  const [fresh] = (await listed.json()) as Array<{
    id: string;
    expectedShiftName: string;
    expectedStartTime: string;
  }>;

  assert.equal(fresh.id, record.id);
  assert.equal(fresh.expectedShiftName, "Turno asistencia SNAPSHOT");
  assert.equal(fresh.expectedStartTime, "08:00");
});

test("attendance list filters by date, employee and status", async () => {
  const position = await createPosition(`Asistencia consulta ${runId}`);
  const employee = await createEmployee("Consulta", position.id);
  const shift = await createShift("CONSULTA");
  await assignShift(employee.id, shift.id);
  await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 15),
  );

  const response = await api(
    `/api/admin/attendance?date=2026-08-25&employeeId=${employee.id}&status=LATE`,
    { cookie: attendanceReaderCookie },
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as Array<{ employeeId: string; status: string }>;
  assert.equal(body.length, 1);
  assert.equal(body[0]?.employeeId, employee.id);
  assert.equal(body[0]?.status, "LATE");

  const employeeResponse = await api(
    `/api/admin/employees/${employee.id}/attendance?date=2026-08-25`,
    { cookie: attendanceReaderCookie },
  );
  assert.equal(employeeResponse.status, 200);
  assert.equal(((await employeeResponse.json()) as unknown[]).length, 1);
});

test("manual override requires reason and records trace", async () => {
  const position = await createPosition(`Asistencia override ${runId}`);
  const employee = await createEmployee("Override", position.id);
  const shift = await createShift("OVERRIDE");
  await assignShift(employee.id, shift.id);
  const record = await clockIn(
    { employeeId: employee.id, workDate: "2026-08-25" },
    localTime("2026-08-25", 8, 23),
  );

  const missingReason = await api(`/api/admin/attendance/${record.id}`, {
    method: "PATCH",
    cookie: attendanceOverrideCookie,
    body: { status: "EXCUSED" },
  });
  assert.equal(missingReason.status, 400);

  const adjusted = await overrideAttendance(
    record.id,
    {
      status: "EXCUSED",
      notes: "Cita medica documentada",
      adjustmentReason: "Documento validado por supervisor",
    },
    adminUserId,
  );

  assert.equal(adjusted.status, "EXCUSED");
  assert.equal(adjusted.lateMinutes, 0);
  assert.equal(adjusted.notes, "Cita medica documentada");
  assert.equal(adjusted.adjustedBy?.id, adminUserId);
  assert.equal(adjusted.adjustmentReason, "Documento validado por supervisor");
});

test("concurrent clock-in creates only one attendance record", async () => {
  const position = await createPosition(`Asistencia concurrencia ${runId}`);
  const employee = await createEmployee("Concurrencia", position.id);
  const shift = await createShift("CONCURRENCIA");
  await assignShift(employee.id, shift.id);

  const results = await Promise.allSettled([
    clockIn(
      { employeeId: employee.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 0),
    ),
    clockIn(
      { employeeId: employee.id, workDate: "2026-08-25" },
      localTime("2026-08-25", 8, 1),
    ),
  ]);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  const employment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: employee.id },
    select: { id: true },
  });
  const count = await prisma.attendanceRecord.count({
    where: {
      employmentId: employment.id,
      workDate: new Date("2026-08-25T00:00:00.000Z"),
    },
  });

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(count, 1);
});
