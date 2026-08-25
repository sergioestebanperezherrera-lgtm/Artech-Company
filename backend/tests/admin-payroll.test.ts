import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { EmploymentStatus, PayFrequency } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { grantSuperAdminByEmail } from "../src/modules/admin/admin.grant";
import { seedRbac } from "../prisma/seed-rbac";

const runId = randomUUID();
const testEmails = new Set<string>();
const employeeIds = new Set<string>();
const employmentIds = new Set<string>();
const positionIds = new Set<string>();
const roleIds = new Set<string>();
let apiServer: Server;
let apiBaseUrl: string;
let adminCookie: string;
let managerCookie: string;
let closerCookie: string;
let readerCookie: string;
let noPermissionCookie: string;
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
  const email = `payroll-${runId}-${label}@example.test`;
  testEmails.add(email);
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Payroll ${label}`,
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
      name: `PAY_QA_${label}_${runId}`,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
      users: { create: { userId } },
    },
    select: { id: true },
  });
  roleIds.add(role.id);
}

type EmployeeSeed = {
  label: string;
  startDate: string;
  endDate?: string;
  status?: EmploymentStatus;
  compensation: Array<{
    amount: string;
    effectiveFrom: string;
    effectiveTo?: string;
    payFrequency?: PayFrequency;
  }>;
};

async function seedEmployee(seed: EmployeeSeed) {
  const employee = await prisma.employee.create({
    data: {
      code: `PAY-${runId.slice(0, 8)}-${seed.label}`.toUpperCase(),
      firstName: seed.label,
      lastName: "Nomina",
      isActive: true,
      employments: {
        create: {
          positionId,
          startDate: new Date(`${seed.startDate}T00:00:00.000Z`),
          endDate: seed.endDate ? new Date(`${seed.endDate}T00:00:00.000Z`) : null,
          status: seed.status ?? EmploymentStatus.ACTIVE,
          compensationPeriods: {
            create: seed.compensation.map((item) => ({
              amount: item.amount,
              currency: "GTQ",
              payFrequency: item.payFrequency ?? PayFrequency.MONTHLY,
              effectiveFrom: new Date(`${item.effectiveFrom}T00:00:00.000Z`),
              effectiveTo: item.effectiveTo
                ? new Date(`${item.effectiveTo}T00:00:00.000Z`)
                : null,
            })),
          },
        },
      },
    },
  });
  employeeIds.add(employee.id);
  return employee;
}

async function markAttendance(
  label: string,
  workDate: string,
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED",
  lateMinutes = 0,
) {
  const employeeCode = `PAY-${runId.slice(0, 8)}-${label}`.toUpperCase();
  const employee = await prisma.employee.findFirstOrThrow({
    where: { code: employeeCode },
    select: { id: true },
  });
  const employment = await prisma.employment.findFirstOrThrow({
    where: { employeeId: employee.id },
    select: { id: true },
  });
  employmentIds.add(employment.id);
  await prisma.attendanceRecord.create({
    data: {
      employeeId: employee.id,
      employmentId: employment.id,
      workDate: new Date(`${workDate}T00:00:00.000Z`),
      status,
      lateMinutes,
    },
  });
}

before(async () => {
  await seedRbac(prisma);
  apiServer = await new Promise<Server>((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  apiBaseUrl = getServerUrl(apiServer);

  const position = await prisma.position.create({
    data: {
      name: `Tecnico Nomina ${runId}`,
      normalizedName: `tecnico nomina ${runId}`,
    },
  });
  positionId = position.id;
  positionIds.add(position.id);

  const admin = await register("admin");
  await grantSuperAdminByEmail(prisma, admin.email);
  adminCookie = admin.cookie;

  const manager = await register("manager");
  await createRoleWithPermissions(
    "MANAGER",
    ["payroll.read", "payroll.manage"],
    manager.userId,
  );
  managerCookie = manager.cookie;

  const closer = await register("closer");
  await createRoleWithPermissions(
    "CLOSER",
    ["payroll.read", "payroll.close"],
    closer.userId,
  );
  closerCookie = closer.cookie;

  const reader = await register("reader");
  await createRoleWithPermissions("READER", ["payroll.read"], reader.userId);
  readerCookie = reader.cookie;

  const noPermission = await register("no-permission");
  noPermissionCookie = noPermission.cookie;
});

after(async () => {
  const employeeIdList = Array.from(employeeIds);
  const employments = await prisma.employment.findMany({
    where: { OR: [
      { employeeId: { in: employeeIdList } },
      { id: { in: Array.from(employmentIds) } },
    ] },
    select: { id: true },
  });
  const employmentIdList = employments.map((employment) => employment.id);

  await prisma.payrollSlip.deleteMany({
    where: { OR: [
      { employeeId: { in: employeeIdList } },
      { employmentId: { in: employmentIdList } },
    ] },
  });
  await prisma.payrollPeriod.deleteMany({});
  await prisma.attendanceRecord.deleteMany({
    where: { employeeId: { in: employeeIdList } },
  });
  await prisma.compensationPeriod.deleteMany({
    where: { employmentId: { in: employmentIdList } },
  });
  await prisma.employment.deleteMany({ where: { id: { in: employmentIdList } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIdList } } });
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
  await prisma.user.deleteMany({ where: { email: { in: Array.from(testEmails) } } });

  await stopServer(apiServer);
  await prisma.$disconnect();
});

test("payroll endpoints enforce authentication and permissions", async () => {
  const unauthenticated = await api("/api/admin/payroll/periods");
  assert.equal(unauthenticated.status, 401);

  const forbiddenList = await api("/api/admin/payroll/periods", {
    cookie: noPermissionCookie,
  });
  assert.equal(forbiddenList.status, 403);

  const forbiddenCreate = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: readerCookie,
    body: { name: "No permitido", startDate: "2026-01-01", endDate: "2026-01-31" },
  });
  assert.equal(forbiddenCreate.status, 403);

  const allowedRead = await api("/api/admin/payroll/periods", {
    cookie: readerCookie,
  });
  assert.equal(allowedRead.status, 200);
});

test("create period validates dates and rejects exact duplicates", async () => {
  const invalidRange = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: managerCookie,
    body: { name: "Invertido", startDate: "2026-02-01", endDate: "2026-01-01" },
  });
  assert.equal(invalidRange.status, 400);

  const malformedDate = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: managerCookie,
    body: { name: "Invalida", startDate: "2026-02-30", endDate: "2026-02-28" },
  });
  assert.equal(malformedDate.status, 400);

  const created = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: managerCookie,
    body: {
      name: `Quincena enero ${runId.slice(0, 6)}`,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    },
  });
  assert.equal(created.status, 201);
  const period = (await created.json()) as {
    id: string;
    status: string;
    employeeCount: number;
  };
  assert.equal(period.status, "DRAFT");
  assert.equal(period.employeeCount, 0);

  const duplicate = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: managerCookie,
    body: {
      name: "Duplicado",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    },
  });
  assert.equal(duplicate.status, 409);
});

test("calculate includes overlapping employments with correct amounts and attendance", async () => {
  await seedEmployee({
    label: "NORMAL",
    startDate: "2025-12-01",
    compensation: [{ amount: "3000.00", effectiveFrom: "2025-11-01" }],
  });
  await seedEmployee({
    label: "MITAD",
    startDate: "2026-01-11",
    compensation: [{ amount: "3000.00", effectiveFrom: "2026-01-01" }],
  });
  await seedEmployee({
    label: "TERMINADO",
    startDate: "2026-01-01",
    endDate: "2026-01-21",
    status: EmploymentStatus.ENDED,
    compensation: [{ amount: "3000.00", effectiveFrom: "2025-12-01" }],
  });
  await seedEmployee({
    label: "SINSUELDO",
    startDate: "2026-01-01",
    compensation: [],
  });
  await seedEmployee({
    label: "FUERA",
    startDate: "2026-03-01",
    compensation: [{ amount: "5000.00", effectiveFrom: "2026-03-01" }],
  });

  await markAttendance("NORMAL", "2026-01-05", "PRESENT");
  await markAttendance("NORMAL", "2026-01-06", "LATE", 15);
  await markAttendance("NORMAL", "2026-01-07", "LATE", 25);
  await markAttendance("NORMAL", "2026-01-08", "ABSENT");
  await markAttendance("NORMAL", "2026-01-09", "EXCUSED");

  const periodsResponse = await api("/api/admin/payroll/periods", {
    cookie: adminCookie,
  });
  const periods = (await periodsResponse.json()) as Array<{
    id: string;
    startDate: string;
    endDate: string;
  }>;
  const period = periods.find(
    (item) => item.startDate === "2026-01-01" && item.endDate === "2026-01-31",
  );
  assert.ok(period);

  const forbiddenCalculate = await api(
    `/api/admin/payroll/periods/${period.id}/calculate`,
    { method: "POST", cookie: readerCookie },
  );
  assert.equal(forbiddenCalculate.status, 403);

  const calculated = await api(`/api/admin/payroll/periods/${period.id}/calculate`, {
    method: "POST",
    cookie: managerCookie,
  });
  assert.equal(calculated.status, 200);
  const detail = (await calculated.json()) as {
    slips: Array<{
      employeeCode: string;
      grossAmount: number;
      netAmount: number;
      daysConsidered: number;
      presentDays: number;
      lateDays: number;
      absentDays: number;
      excusedDays: number;
      lateMinutes: number;
      requiresReview: boolean;
      reviewReason: string | null;
    }>;
  };

  const findSlip = (label: string) =>
    detail.slips.find((slip) => slip.employeeCode.endsWith(label));

  const normalSlip = findSlip("NORMAL");
  assert.ok(normalSlip);
  assert.equal(normalSlip.grossAmount, 3000);
  assert.equal(normalSlip.netAmount, 3000);
  assert.equal(normalSlip.presentDays, 1);
  assert.equal(normalSlip.lateDays, 2);
  assert.equal(normalSlip.absentDays, 1);
  assert.equal(normalSlip.excusedDays, 1);
  assert.equal(normalSlip.lateMinutes, 40);
  assert.equal(normalSlip.daysConsidered, 31);
  assert.equal(normalSlip.requiresReview, false);

  const midSlip = findSlip("MITAD");
  assert.ok(midSlip);
  assert.equal(midSlip.grossAmount, 2100);
  assert.equal(midSlip.daysConsidered, 21);

  const endedSlip = findSlip("TERMINADO");
  assert.ok(endedSlip);
  assert.equal(endedSlip.grossAmount, 2100);
  assert.equal(endedSlip.daysConsidered, 21);

  const noSalarySlip = findSlip("SINSUELDO");
  assert.ok(noSalarySlip);
  assert.equal(noSalarySlip.requiresReview, true);
  assert.equal(noSalarySlip.reviewReason, "Sin compensacion aplicable");
  assert.equal(noSalarySlip.grossAmount, 0);

  const outsideSlip = findSlip("FUERA");
  assert.equal(outsideSlip, undefined);

  const reviewSlips = await api(`/api/admin/payroll/periods/${period!.id}`, {
    cookie: readerCookie,
  });
  assert.equal(reviewSlips.status, 200);
  const reviewDetail = (await reviewSlips.json()) as {
    requiresReviewCount: number;
  };
  assert.ok(reviewDetail.requiresReviewCount >= 1);
});

test("manual adjustments require reason and update net amount in DRAFT", async () => {
  await seedEmployee({
    label: "AJUSTE",
    startDate: "2025-12-01",
    compensation: [{ amount: "4000.00", effectiveFrom: "2025-11-01" }],
  });

  const createdPeriod = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Ajustes ${runId.slice(0, 6)}`,
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    },
  });
  assert.equal(createdPeriod.status, 201);
  const period = (await createdPeriod.json()) as { id: string };

  await api(`/api/admin/payroll/periods/${period.id}/calculate`, {
    method: "POST",
    cookie: adminCookie,
  });
  const detailResponse = await api(`/api/admin/payroll/periods/${period.id}`, {
    cookie: adminCookie,
  });
  const detail = (await detailResponse.json()) as {
    slips: Array<{ id: string; employeeCode: string; netAmount: number }>;
  };
  const slip = detail.slips.find((entry) => entry.employeeCode.endsWith("AJUSTE"));
  assert.ok(slip);

  const missingReason = await api(`/api/admin/payroll/slips/${slip.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { adjustmentsAmount: 250 },
  });
  assert.equal(missingReason.status, 400);

  const positive = await api(`/api/admin/payroll/slips/${slip.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { adjustmentsAmount: "250.50", adjustmentReason: "Bono manual" },
  });
  assert.equal(positive.status, 200);
  const positiveBody = (await positive.json()) as { adjustmentsAmount: number; netAmount: number };
  assert.equal(positiveBody.adjustmentsAmount, 250.5);
  assert.equal(positiveBody.netAmount, 4250.5);

  const negative = await api(`/api/admin/payroll/slips/${slip.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { adjustmentsAmount: "-100.25", adjustmentReason: "Descuento prestamo" },
  });
  assert.equal(negative.status, 200);
  const negativeBody = (await negative.json()) as { netAmount: number };
  assert.equal(negativeBody.netAmount, 3899.75);
});

test("close blocks slips requiring review and closed periods become immutable", async () => {
  await seedEmployee({
    label: "CERRABLE",
    startDate: "2025-12-01",
    compensation: [{ amount: "2500.00", effectiveFrom: "2025-11-01" }],
  });
  await seedEmployee({
    label: "SINSUELDOCIERRE",
    startDate: "2025-12-01",
    compensation: [],
  });

  const createdPeriod = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Cierre ${runId.slice(0, 6)}`,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    },
  });
  const period = (await createdPeriod.json()) as { id: string };

  const closeWithoutCalc = await api(
    `/api/admin/payroll/periods/${period.id}/close`,
    { method: "POST", cookie: adminCookie },
  );
  assert.equal(closeWithoutCalc.status, 409);

  const forbiddenClose = await api(`/api/admin/payroll/periods/${period.id}/close`, {
    method: "POST",
    cookie: managerCookie,
    body: {},
  });
  assert.equal(forbiddenClose.status, 403);

  await api(`/api/admin/payroll/periods/${period.id}/calculate`, {
    method: "POST",
    cookie: adminCookie,
  });

  const blockedByReview = await api(
    `/api/admin/payroll/periods/${period.id}/close`,
    { method: "POST", cookie: adminCookie },
  );
  assert.equal(blockedByReview.status, 409);
  assert.match(await blockedByReview.text(), /Sin compensacion aplicable/);

  const slipRows = await prisma.payrollSlip.findMany({
    where: { periodId: period.id },
    select: { id: true, requiresReview: true },
  });
  const reviewSlips = slipRows.filter((slip) => slip.requiresReview);
  assert.ok(reviewSlips.length >= 1);
  for (const reviewSlip of reviewSlips) {
    await prisma.payrollSlip.delete({ where: { id: reviewSlip.id } });
  }

  const allowedClose = await api(`/api/admin/payroll/periods/${period.id}/close`, {
    method: "POST",
    cookie: closerCookie,
  });
  assert.equal(allowedClose.status, 200);
  const closedBody = (await allowedClose.json()) as {
    status: string;
    closedAt: string | null;
  };
  assert.equal(closedBody.status, "CLOSED");
  assert.ok(closedBody.closedAt);

  const recalcClosed = await api(
    `/api/admin/payroll/periods/${period.id}/calculate`,
    { method: "POST", cookie: adminCookie },
  );
  assert.equal(recalcClosed.status, 409);

  const remainingSlip = slipRows.find((slip) => !slip.requiresReview);
  assert.ok(remainingSlip);
  const adjustClosed = await api(`/api/admin/payroll/slips/${remainingSlip.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { adjustmentsAmount: 10, adjustmentReason: "Tarde" },
  });
  assert.equal(adjustClosed.status, 409);

  const doubleClose = await api(`/api/admin/payroll/periods/${period.id}/close`, {
    method: "POST",
    cookie: adminCookie,
  });
  assert.equal(doubleClose.status, 409);
});

test("recalculate replaces DRAFT slips and resets manual adjustments", async () => {
  await seedEmployee({
    label: "RECALC",
    startDate: "2025-12-01",
    compensation: [{ amount: "2000.00", effectiveFrom: "2025-11-01" }],
  });

  const createdPeriod = await api("/api/admin/payroll/periods", {
    method: "POST",
    cookie: adminCookie,
    body: {
      name: `Recalculo ${runId.slice(0, 6)}`,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    },
  });
  const period = (await createdPeriod.json()) as { id: string };

  await api(`/api/admin/payroll/periods/${period.id}/calculate`, {
    method: "POST",
    cookie: adminCookie,
  });

  await prisma.payrollSlip.updateMany({
    where: { periodId: period.id },
    data: { adjustmentsAmount: "100", adjustmentReason: "Temporal" },
  });

  await api(`/api/admin/payroll/periods/${period.id}/calculate`, {
    method: "POST",
    cookie: adminCookie,
  });
  const detailResponse = await api(`/api/admin/payroll/periods/${period.id}`, {
    cookie: adminCookie,
  });
  const afterRecalc = (await detailResponse.json()) as {
    slips: Array<{
      adjustmentsAmount: number;
      adjustmentReason: string | null;
      employeeCode: string;
    }>;
  };
  const recalcSlip = afterRecalc.slips.find((slip) =>
    slip.employeeCode.endsWith("RECALC"),
  );
  assert.ok(recalcSlip);
  assert.equal(recalcSlip.adjustmentsAmount, 0);
  assert.equal(recalcSlip.adjustmentReason, null);
});
