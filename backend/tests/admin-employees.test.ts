import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { AttendanceStatus, EmploymentStatus, ShiftType, Weekday } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const positionIds = new Set<string>();
const shiftIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let readerCookie: string;
let readerUserId: string;

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
  const email = `employees-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Employee Test ${label}`,
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
  startDate = "2026-01-10",
) {
  const response = await api("/api/admin/employees", {
    method: "POST",
    cookie: adminCookie,
    body: {
      firstName: label,
      lastName: "Prueba",
      email: `${label.toLowerCase()}-${runId}@example.test`,
      phone: "+502 5555 0101",
      positionId,
      startDate,
    },
  });
  assert.equal(response.status, 201);
  const employee = (await response.json()) as {
    id: string;
    code: string;
    user: null;
  };
  employeeIds.add(employee.id);
  return employee;
}

async function createShift(label: string) {
  const shift = await prisma.shift.create({
    data: {
      name: `Turno empleados ${label} ${runId}`,
      code: `EMP_${runId.slice(0, 8)}_${label}`.toUpperCase(),
      type: ShiftType.DAY,
      startTime: new Date("1970-01-01T08:00:00.000Z"),
      endTime: new Date("1970-01-01T17:00:00.000Z"),
      workDays: {
        create: [
          { day: Weekday.MONDAY },
          { day: Weekday.TUESDAY },
          { day: Weekday.WEDNESDAY },
        ],
      },
    },
  });
  shiftIds.add(shift.id);
  return shift;
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

  const reader = await register("reader");
  readerCookie = reader.cookie;
  readerUserId = reader.userId;
  const readPermission = await prisma.permission.findUniqueOrThrow({
    where: { key: "employee.read" },
    select: { id: true },
  });
  const role = await prisma.role.create({
    data: {
      name: `TEST_EMPLOYEE_READER_${runId}`,
      permissions: {
        create: { permissionId: readPermission.id },
      },
      users: {
        create: { userId: reader.userId },
      },
    },
  });
  positionIds.add(`role:${role.id}`);
});

after(async () => {
  const ids = Array.from(employeeIds);
  const employments = await prisma.employment.findMany({
    where: { employeeId: { in: ids } },
    select: { id: true },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
  });
  await prisma.compensationPeriod.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
  });
  await prisma.shiftAssignment.deleteMany({
    where: { employmentId: { in: employments.map((employment) => employment.id) } },
  });
  await prisma.employment.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.employee.deleteMany({ where: { id: { in: ids } } });
  await prisma.shiftWorkDay.deleteMany({
    where: { shiftId: { in: Array.from(shiftIds) } },
  });
  await prisma.shift.deleteMany({ where: { id: { in: Array.from(shiftIds) } } });
  await prisma.position.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: Array.from(positionIds).filter((id) => !id.startsWith("role:")),
          },
        },
        { name: { contains: runId, mode: "insensitive" } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { in: Array.from(testEmails) } },
  });
  const roleId = Array.from(positionIds)
    .find((id) => id.startsWith("role:"))
    ?.slice(5);
  if (roleId) {
    await prisma.role.deleteMany({ where: { id: roleId } });
  }
  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("employee endpoints require authentication and employee.read", async () => {
  const unauthenticated = await api("/api/admin/employees");
  const noPermission = await register("no-permission");
  const forbidden = await api("/api/admin/employees", {
    cookie: noPermission.cookie,
  });
  const allowed = await api("/api/admin/employees", { cookie: readerCookie });

  assert.equal(unauthenticated.status, 401);
  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
});

test("positions reject normalized duplicates and support soft deactivation", async () => {
  const position = await createPosition(`Analista Tecnico ${runId}`);
  const duplicate = await api("/api/admin/positions", {
    method: "POST",
    cookie: adminCookie,
    body: { name: `  analista   tecnico ${runId}  ` },
  });
  assert.equal(duplicate.status, 409);

  const deactivated = await api(`/api/admin/positions/${position.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: false },
  });
  assert.equal(deactivated.status, 200);
  assert.equal(((await deactivated.json()) as { isActive: boolean }).isActive, false);
});

test("employee creation is atomic, has no User and codes are concurrency-safe", async () => {
  const position = await createPosition(`Operaciones ${runId}`);
  const [firstResponse, secondResponse] = await Promise.all([
    api("/api/admin/employees", {
      method: "POST",
      cookie: adminCookie,
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        positionId: position.id,
        startDate: "2026-02-01",
      },
    }),
    api("/api/admin/employees", {
      method: "POST",
      cookie: adminCookie,
      body: {
        firstName: "Grace",
        lastName: "Hopper",
        positionId: position.id,
        startDate: "2026-02-01",
      },
    }),
  ]);

  assert.equal(firstResponse.status, 201);
  assert.equal(secondResponse.status, 201);
  const employees = (await Promise.all([
    firstResponse.json(),
    secondResponse.json(),
  ])) as Array<{ id: string; code: string; user: null; employments: unknown[] }>;
  employees.forEach((employee) => employeeIds.add(employee.id));

  const codeNumbers = employees
    .map((employee) => Number(employee.code.replace("EMP-", "")))
    .sort((left, right) => left - right);

  assert.equal(new Set(codeNumbers).size, 2);
  assert.ok(codeNumbers.every((codeNumber) => codeNumber > 0));
  assert.ok(employees.every((employee) => employee.user === null));
  assert.ok(employees.every((employee) => employee.employments.length === 1));
});

test("employee validation rejects invalid dates and inactive positions", async () => {
  const activePosition = await createPosition(`Soporte ${runId}`);
  const invalidDate = await api("/api/admin/employees", {
    method: "POST",
    cookie: adminCookie,
    body: {
      firstName: "Fecha",
      lastName: "Invalida",
      positionId: activePosition.id,
      startDate: "2026-02-31",
    },
  });
  assert.equal(invalidDate.status, 400);

  const inactivePosition = await createPosition(`Puesto Inactivo ${runId}`);
  await api(`/api/admin/positions/${inactivePosition.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { isActive: false },
  });
  const inactiveAssignment = await api("/api/admin/employees", {
    method: "POST",
    cookie: adminCookie,
    body: {
      firstName: "Puesto",
      lastName: "Inactivo",
      positionId: inactivePosition.id,
      startDate: "2026-02-01",
    },
  });
  assert.equal(inactiveAssignment.status, 400);
});

test("profile, position changes, termination and reactivation preserve history", async () => {
  const firstPosition = await createPosition(`Ventas ${runId}`);
  const secondPosition = await createPosition(`Supervision ${runId}`);
  const employee = await createEmployee("Linus", firstPosition.id, "2026-01-10");

  const updated = await api(`/api/admin/employees/${employee.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { phone: "+502 5555 0202" },
  });
  assert.equal(updated.status, 200);

  const changed = await api(
    `/api/admin/employees/${employee.id}/change-position`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { positionId: secondPosition.id, startDate: "2026-03-01" },
    },
  );
  assert.equal(changed.status, 200);
  const changedBody = (await changed.json()) as {
    currentEmployment: { position: { id: string } };
    employments: Array<{ status: string; endDate: string | null }>;
  };
  assert.equal(changedBody.currentEmployment.position.id, secondPosition.id);
  assert.equal(changedBody.employments.length, 2);
  assert.equal(
    changedBody.employments.find((item) => item.status === "ENDED")?.endDate,
    "2026-02-28",
  );

  const invalidTermination = await api(
    `/api/admin/employees/${employee.id}/terminate`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { endDate: "2026-02-15" },
    },
  );
  assert.equal(invalidTermination.status, 400);

  const terminated = await api(`/api/admin/employees/${employee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-06-30" },
  });
  assert.equal(terminated.status, 200);
  assert.equal(((await terminated.json()) as { isActive: boolean }).isActive, false);

  const reactivated = await api(
    `/api/admin/employees/${employee.id}/reactivate`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { positionId: firstPosition.id, startDate: "2026-07-01" },
    },
  );
  assert.equal(reactivated.status, 200);
  const reactivatedBody = (await reactivated.json()) as {
    isActive: boolean;
    employments: Array<{ status: string }>;
  };
  assert.equal(reactivatedBody.isActive, true);
  assert.equal(reactivatedBody.employments.length, 3);
  assert.equal(
    reactivatedBody.employments.filter((item) => item.status === "ACTIVE").length,
    1,
  );

  await assert.rejects(
    prisma.employment.create({
      data: {
        employeeId: employee.id,
        positionId: secondPosition.id,
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        status: EmploymentStatus.ACTIVE,
      },
    }),
  );
});

test("filters and detail expose only safe linked User fields", async () => {
  const position = await createPosition(`Seguridad ${runId}`);
  const employee = await createEmployee("Reader", position.id, "2026-04-01");
  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId: readerUserId },
  });

  const filtered = await api(
    `/api/admin/employees?status=active&positionId=${position.id}&search=Reader`,
    { cookie: readerCookie },
  );
  assert.equal(filtered.status, 200);
  assert.equal(((await filtered.json()) as unknown[]).length, 1);

  const detail = await api(`/api/admin/employees/${employee.id}`, {
    cookie: readerCookie,
  });
  assert.equal(detail.status, 200);
  const body = (await detail.json()) as {
    user: Record<string, unknown>;
  };
  assert.deepEqual(Object.keys(body.user).sort(), ["email", "id", "isActive", "name"]);

  const terminated = await api(`/api/admin/employees/${employee.id}/terminate`, {
    method: "POST",
    cookie: adminCookie,
    body: { endDate: "2026-05-01" },
  });
  assert.equal(terminated.status, 200);

  const blockedReader = await api("/api/admin/positions", {
    cookie: readerCookie,
  });
  assert.equal(blockedReader.status, 403);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: readerUserId },
    select: { isActive: true },
  });
  assert.equal(user.isActive, true);
});

test("employee profile edit keeps employee code immutable", async () => {
  const position = await createPosition(`Correccion perfil ${runId}`);
  const employee = await createEmployee("Perfil", position.id, "2026-01-10");
  const originalCode = employee.code;

  const updated = await api(`/api/admin/employees/${employee.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      firstName: "PerfilEditado",
      lastName: "Seguro",
      email: `perfil-editado-${runId}@example.test`,
      phone: "+502 5555 0303",
      code: "EMP-000",
    },
  });
  assert.equal(updated.status, 200);
  const body = (await updated.json()) as {
    code: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  assert.equal(body.code, originalCode);
  assert.equal(body.firstName, "PerfilEditado");
  assert.equal(body.lastName, "Seguro");
  assert.equal(body.email, `perfil-editado-${runId}@example.test`);
  assert.equal(body.phone, "+502 5555 0303");
});

test("current employment start date can be corrected when it does not conflict", async () => {
  const position = await createPosition(`Correccion inicio ${runId}`);
  const futureEmployee = await createEmployee("InicioFuturo", position.id, "2030-01-01");
  const backwardEmployee = await createEmployee("InicioAtras", position.id, "2026-05-01");

  const correctedFuture = await api(
    `/api/admin/employees/${futureEmployee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { startDate: "2026-01-15" },
    },
  );
  assert.equal(correctedFuture.status, 200);
  assert.equal(
    ((await correctedFuture.json()) as { currentEmployment: { startDate: string } })
      .currentEmployment.startDate,
    "2026-01-15",
  );

  const correctedBackward = await api(
    `/api/admin/employees/${backwardEmployee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { startDate: "2026-04-01" },
    },
  );
  assert.equal(correctedBackward.status, 200);
  assert.equal(
    ((await correctedBackward.json()) as { currentEmployment: { startDate: string } })
      .currentEmployment.startDate,
    "2026-04-01",
  );
});

test("start date correction rejects conflicts with attendance, shifts and compensation", async () => {
  const position = await createPosition(`Correccion conflictos ${runId}`);

  const attendanceEmployee = await createEmployee("ConflictoAsistencia", position.id);
  const attendanceEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: attendanceEmployee.id },
    select: { id: true },
  });
  await prisma.attendanceRecord.create({
    data: {
      employeeId: attendanceEmployee.id,
      employmentId: attendanceEmployment.id,
      workDate: new Date("2026-01-20T00:00:00.000Z"),
      status: AttendanceStatus.PRESENT,
    },
  });
  const attendanceConflict = await api(
    `/api/admin/employees/${attendanceEmployee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { startDate: "2026-02-01" },
    },
  );
  assert.equal(attendanceConflict.status, 409);

  const shiftEmployee = await createEmployee("ConflictoTurno", position.id);
  const shiftEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: shiftEmployee.id },
    select: { id: true },
  });
  const shift = await createShift("CONFLICTO");
  await prisma.shiftAssignment.create({
    data: {
      employmentId: shiftEmployment.id,
      shiftId: shift.id,
      effectiveFrom: new Date("2026-01-18T00:00:00.000Z"),
    },
  });
  const shiftConflict = await api(
    `/api/admin/employees/${shiftEmployee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { startDate: "2026-02-01" },
    },
  );
  assert.equal(shiftConflict.status, 409);

  const compensationEmployee = await createEmployee("ConflictoSalario", position.id);
  const compensationEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: compensationEmployee.id },
    select: { id: true },
  });
  await prisma.compensationPeriod.create({
    data: {
      employmentId: compensationEmployment.id,
      amount: "4500.00",
      payFrequency: "MONTHLY",
      effectiveFrom: new Date("2026-01-12T00:00:00.000Z"),
    },
  });
  const compensationConflict = await api(
    `/api/admin/employees/${compensationEmployee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: adminCookie,
      body: { startDate: "2026-02-01" },
    },
  );
  assert.equal(compensationConflict.status, 409);
});

test("safe employee deletion only removes records without operational history", async () => {
  const position = await createPosition(`Eliminacion segura ${runId}`);
  const disposable = await createEmployee("Descartable", position.id);

  const deleted = await api(`/api/admin/employees/${disposable.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(deleted.status, 204);
  const missing = await api(`/api/admin/employees/${disposable.id}`, {
    cookie: adminCookie,
  });
  assert.equal(missing.status, 404);

  const attendanceEmployee = await createEmployee("NoEliminarAsistencia", position.id);
  const attendanceEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: attendanceEmployee.id },
    select: { id: true },
  });
  await prisma.attendanceRecord.create({
    data: {
      employeeId: attendanceEmployee.id,
      employmentId: attendanceEmployment.id,
      workDate: new Date("2026-01-20T00:00:00.000Z"),
      status: AttendanceStatus.PRESENT,
    },
  });
  const blockedAttendance = await api(`/api/admin/employees/${attendanceEmployee.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(blockedAttendance.status, 409);

  const salaryEmployee = await createEmployee("NoEliminarSalario", position.id);
  const salaryEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: salaryEmployee.id },
    select: { id: true },
  });
  await prisma.compensationPeriod.create({
    data: {
      employmentId: salaryEmployment.id,
      amount: "4500.00",
      payFrequency: "MONTHLY",
      effectiveFrom: new Date("2026-01-12T00:00:00.000Z"),
    },
  });
  const blockedSalary = await api(`/api/admin/employees/${salaryEmployee.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(blockedSalary.status, 409);

  const shiftEmployee = await createEmployee("NoEliminarTurno", position.id);
  const shiftEmployment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: shiftEmployee.id },
    select: { id: true },
  });
  const shift = await createShift("NO_ELIMINAR");
  await prisma.shiftAssignment.create({
    data: {
      employmentId: shiftEmployment.id,
      shiftId: shift.id,
      effectiveFrom: new Date("2026-01-18T00:00:00.000Z"),
    },
  });
  const blockedShift = await api(`/api/admin/employees/${shiftEmployee.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(blockedShift.status, 409);
});

test("employee code sequence is not reused after deleting a mistaken record", async () => {
  const position = await createPosition(`Secuencia eliminacion ${runId}`);
  const disposable = await createEmployee("SecuenciaUno", position.id);
  const deletedCodeNumber = Number(disposable.code.replace("EMP-", ""));
  const deleted = await api(`/api/admin/employees/${disposable.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(deleted.status, 204);

  const next = await createEmployee("SecuenciaDos", position.id);
  const nextCodeNumber = Number(next.code.replace("EMP-", ""));

  assert.ok(nextCodeNumber > deletedCodeNumber);
});

test("employee correction and deletion enforce RBAC", async () => {
  const position = await createPosition(`RBAC correccion ${runId}`);
  const employee = await createEmployee("RbacCorreccion", position.id);
  const noPermission = await register("employee-correction-no-permission");

  const unauthenticatedCorrection = await api(
    `/api/admin/employees/${employee.id}/correct-start-date`,
    {
      method: "POST",
      body: { startDate: "2026-01-01" },
    },
  );
  const forbiddenCorrection = await api(
    `/api/admin/employees/${employee.id}/correct-start-date`,
    {
      method: "POST",
      cookie: noPermission.cookie,
      body: { startDate: "2026-01-01" },
    },
  );
  const forbiddenDelete = await api(`/api/admin/employees/${employee.id}`, {
    method: "DELETE",
    cookie: readerCookie,
  });

  assert.equal(unauthenticatedCorrection.status, 401);
  assert.equal(forbiddenCorrection.status, 403);
  assert.equal(forbiddenDelete.status, 403);
});
