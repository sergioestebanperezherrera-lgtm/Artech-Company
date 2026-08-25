import {
  AttendanceStatus,
  PayFrequency,
  PayrollPeriodStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import { rethrowCashError, runCashTransaction } from "../cash/cash.shared";
import type {
  AdjustPayrollSlipInput,
  CreatePayrollPeriodInput,
} from "./payroll.validation";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * MVP proration strategy (documented decision):
 * - Paid window = intersection of the employment date range and the payroll
 *   period. Slips are only generated for employments overlapping the period.
 * - If the employment covers the whole period and a single CompensationPeriod
 *   covers the whole paid window, grossAmount is the full amount.
 * - Otherwise (partial employment coverage, raise mid-period, or multiple
 *   segments), grossAmount is the linear day-based sum of each segment:
 *   amount * overlapDays / divisor, where divisor is 30 days for MONTHLY and
 *   14 for BIWEEKLY. Rounded to 2 decimals using Decimal only.
 * - If no CompensationPeriod overlaps at all, the slip is marked
 *   requiresReview with "Sin compensacion aplicable" and blocks closure.
 */
const PAY_FREQUENCY_DIVISOR: Record<PayFrequency, number> = {
  MONTHLY: 30,
  BIWEEKLY: 14,
};

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toUtcMidnight(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function inclusiveDays(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function overlapDays(rangeStart: Date, rangeEnd: Date, periodStart: Date, periodEnd: Date) {
  const start = rangeStart > periodStart ? rangeStart : periodStart;
  const end = rangeEnd < periodEnd ? rangeEnd : periodEnd;
  if (start > end) {
    return 0;
  }
  return inclusiveDays(start, end);
}

function round2(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

const periodListSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  closedAt: true,
  slips: {
    select: {
      id: true,
      netAmount: true,
      requiresReview: true,
    },
  },
} satisfies Prisma.PayrollPeriodSelect;

type PayrollSlipRecord = Prisma.PayrollSlipGetPayload<{
  include: typeof payrollSlipInclude;
}>;

const payrollSlipInclude = {
  employee: { select: { id: true } },
  employment: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
  adjustedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PayrollSlipInclude;

function serializeDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function mapPeriod(period: Prisma.PayrollPeriodGetPayload<{
  select: typeof periodListSelect;
}>) {
  const totalNet = period.slips.reduce(
    (total, slip) => total.plus(slip.netAmount),
    new Prisma.Decimal(0),
  );
  return {
    id: period.id,
    name: period.name,
    startDate: serializeDate(period.startDate),
    endDate: serializeDate(period.endDate),
    status: period.status,
    createdAt: period.createdAt.toISOString(),
    closedAt: period.closedAt?.toISOString() ?? null,
    employeeCount: period.slips.length,
    requiresReviewCount: period.slips.filter((slip) => slip.requiresReview).length,
    totalNet: Number(round2(totalNet)),
  };
}

function mapSlip(slip: PayrollSlipRecord) {
  return {
    id: slip.id,
    periodId: slip.periodId,
    employeeId: slip.employeeId,
    employmentId: slip.employmentId,
    employeeCode: slip.employeeCode,
    employeeName: slip.employeeName,
    positionName: slip.positionName,
    baseCompensation: Number(slip.baseCompensation),
    currency: slip.currency,
    payFrequency: slip.payFrequency,
    daysConsidered: slip.daysConsidered,
    presentDays: slip.presentDays,
    lateDays: slip.lateDays,
    absentDays: slip.absentDays,
    excusedDays: slip.excusedDays,
    lateMinutes: slip.lateMinutes,
    grossAmount: Number(slip.grossAmount),
    adjustmentsAmount: Number(slip.adjustmentsAmount),
    adjustmentReason: slip.adjustmentReason,
    adjustedBy: slip.adjustedBy,
    netAmount: Number(slip.netAmount),
    requiresReview: slip.requiresReview,
    reviewReason: slip.reviewReason,
    createdAt: slip.createdAt.toISOString(),
    updatedAt: slip.updatedAt.toISOString(),
  };
}

export async function listPayrollPeriods() {
  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ startDate: "desc" }],
    select: periodListSelect,
  });
  return periods.map(mapPeriod);
}

export async function getPayrollPeriod(id: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    select: periodListSelect,
  });

  if (!period) {
    throw new AppError("Payroll period not found.", 404);
  }

  const slips = await prisma.payrollSlip.findMany({
    where: { periodId: id },
    include: payrollSlipInclude,
    orderBy: [{ employeeCode: "asc" }],
  });

  return { ...mapPeriod(period), slips: slips.map(mapSlip) };
}

async function createPayrollSlips(
  transaction: Prisma.TransactionClient,
  period: { id: string; startDate: Date; endDate: Date },
) {
  const periodStart = toUtcMidnight(period.startDate);
  const periodEnd = toUtcMidnight(period.endDate);

  const employments = await transaction.employment.findMany({
    where: {
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
      position: { select: { name: true } },
      employee: {
        select: {
          code: true,
          firstName: true,
          lastName: true,
        },
      },
      compensationPeriods: {
        where: {
          effectiveFrom: { lte: periodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
        },
        orderBy: { effectiveFrom: "asc" },
      },
    },
  });

  const byEmployee = new Map<string, (typeof employments)[number]>();
  for (const employment of employments) {
    const current = byEmployee.get(employment.employeeId);
    if (!current || employment.startDate > current.startDate) {
      byEmployee.set(employment.employeeId, employment);
    }
  }

  await transaction.payrollSlip.deleteMany({ where: { periodId: period.id } });

  for (const employment of byEmployee.values()) {
    const employee = employment.employee;
    const employeeName =
      [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() ||
      employee.code;
    const segments = employment.compensationPeriods.map((compensation) => ({
      amount: compensation.amount,
      currency: compensation.currency,
      payFrequency: compensation.payFrequency,
      start: toUtcMidnight(compensation.effectiveFrom),
      end: compensation.effectiveTo ? toUtcMidnight(compensation.effectiveTo) : null,
    }));

    const totalOverlapDays = segments.reduce(
      (total, segment) =>
        total + overlapDays(segment.start, segment.end ?? periodEnd, periodStart, periodEnd),
      0,
    );

    let grossAmount = new Prisma.Decimal(0);
    let baseCompensation = new Prisma.Decimal(0);
    let currency = segments[0]?.currency ?? ("GTQ" as const);
    let payFrequency = segments[0]?.payFrequency ?? PayFrequency.MONTHLY;
    let requiresReview = false;
    let reviewReason: string | null = null;

    if (segments.length === 0 || totalOverlapDays === 0) {
      requiresReview = true;
      reviewReason = "Sin compensacion aplicable";
    } else {
      const employmentStart = toUtcMidnight(employment.startDate);
      const employmentEnd = employment.endDate
        ? toUtcMidnight(employment.endDate)
        : periodEnd;
      const paidStart = employmentStart > periodStart ? employmentStart : periodStart;
      const paidEnd = employmentEnd < periodEnd ? employmentEnd : periodEnd;
      const periodDays = inclusiveDays(periodStart, periodEnd);
      const paidDays = inclusiveDays(paidStart, paidEnd);
      const coveringSegment = segments.find(
        (segment) =>
          segment.start <= paidStart &&
          (segment.end === null || segment.end >= paidEnd),
      );
      const lastSegment = segments[segments.length - 1];
      baseCompensation = lastSegment.amount;
      currency = lastSegment.currency;
      payFrequency = lastSegment.payFrequency;

      if (segments.length === 1 && coveringSegment && paidDays >= periodDays) {
        grossAmount = round2(coveringSegment.amount);
      } else {
        grossAmount = round2(
          segments.reduce((total, segment) => {
            const days = overlapDays(
              segment.start,
              segment.end ?? paidEnd,
              paidStart,
              paidEnd,
            );
            return total.plus(
              segment.amount
                .mul(days)
                .div(PAY_FREQUENCY_DIVISOR[segment.payFrequency]),
            );
          }, new Prisma.Decimal(0)),
        );
      }
    }

    const attendanceRows = await transaction.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        employeeId: employment.employeeId,
        workDate: { gte: periodStart, lte: periodEnd },
      },
      _count: { status: true },
      _sum: { lateMinutes: true },
    });
    const attendanceByStatus = new Map(
      attendanceRows.map((row) => [row.status, row]),
    );
    const lateSummary = attendanceByStatus.get(AttendanceStatus.LATE);

    const employmentOverlap = overlapDays(
      toUtcMidnight(employment.startDate),
      employment.endDate ? toUtcMidnight(employment.endDate) : periodEnd,
      periodStart,
      periodEnd,
    );

    const adjustmentsAmount = new Prisma.Decimal(0);

    await transaction.payrollSlip.create({
      data: {
        periodId: period.id,
        employeeId: employment.employeeId,
        employmentId: employment.id,
        employeeCode: employee.code,
        employeeName,
        positionName: employment.position.name,
        baseCompensation,
        currency,
        payFrequency,
        daysConsidered: employmentOverlap,
        presentDays: attendanceByStatus.get(AttendanceStatus.PRESENT)?._count.status ?? 0,
        lateDays: lateSummary?._count.status ?? 0,
        absentDays: attendanceByStatus.get(AttendanceStatus.ABSENT)?._count.status ?? 0,
        excusedDays: attendanceByStatus.get(AttendanceStatus.EXCUSED)?._count.status ?? 0,
        lateMinutes: lateSummary?._sum.lateMinutes ?? 0,
        grossAmount,
        adjustmentsAmount,
        netAmount: grossAmount.plus(adjustmentsAmount),
        requiresReview,
        reviewReason,
      },
    });
  }
}

export async function createPayrollPeriod(
  input: CreatePayrollPeriodInput,
  userId: string,
) {
  try {
    const periodId = await runCashTransaction(async (transaction) => {
      const existing = await transaction.payrollPeriod.findFirst({
        where: { startDate: toDate(input.startDate), endDate: toDate(input.endDate) },
        select: { id: true },
      });

      if (existing) {
        throw new AppError(
          "A payroll period already exists for those dates.",
          409,
        );
      }

      const period = await transaction.payrollPeriod.create({
        data: {
          name: input.name,
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          createdByUserId: userId,
        },
        select: { id: true },
      });
      return period.id;
    });

    return getPayrollPeriod(periodId);
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function calculatePayrollPeriod(id: string) {
  try {
    await runCashTransaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ status: string }>>`
        SELECT "status"::text AS "status"
        FROM "PayrollPeriod"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const periodRow = rows[0];

      if (!periodRow) {
        throw new AppError("Payroll period not found.", 404);
      }

      if (periodRow.status !== PayrollPeriodStatus.DRAFT) {
        throw new AppError("Closed payroll periods cannot be recalculated.", 409);
      }

      const period = await transaction.payrollPeriod.findUniqueOrThrow({
        where: { id },
        select: { startDate: true, endDate: true },
      });
      await createPayrollSlips(transaction, {
        id,
        startDate: period.startDate,
        endDate: period.endDate,
      });
    });

    return getPayrollPeriod(id);
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function adjustPayrollSlip(
  slipId: string,
  input: AdjustPayrollSlipInput,
  userId: string,
) {
  try {
    await runCashTransaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ status: string }>>`
        SELECT p."status"::text AS "status"
        FROM "PayrollPeriod" p
        INNER JOIN "PayrollSlip" s ON s."periodId" = p."id"
        WHERE s."id" = ${slipId}
        FOR UPDATE OF p
      `;
      const periodRow = rows[0];

      if (!periodRow) {
        throw new AppError("Payroll slip not found.", 404);
      }

      if (periodRow.status !== PayrollPeriodStatus.DRAFT) {
        throw new AppError(
          "Closed payroll slips cannot be modified.",
          409,
        );
      }

      const slip = await transaction.payrollSlip.findUniqueOrThrow({
        where: { id: slipId },
        select: { grossAmount: true },
      });
      const adjustmentsAmount = new Prisma.Decimal(input.adjustmentsAmount);
      await transaction.payrollSlip.update({
        where: { id: slipId },
        data: {
          adjustmentsAmount,
          adjustmentReason: input.adjustmentReason,
          adjustedByUserId: userId,
          netAmount: slip.grossAmount.plus(adjustmentsAmount),
        },
      });
    });

    const slip = await prisma.payrollSlip.findUniqueOrThrow({
      where: { id: slipId },
      include: payrollSlipInclude,
    });
    return mapSlip(slip);
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function closePayrollPeriod(id: string, userId: string) {
  try {
    await runCashTransaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ status: string }>>`
        SELECT "status"::text AS "status"
        FROM "PayrollPeriod"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const periodRow = rows[0];

      if (!periodRow) {
        throw new AppError("Payroll period not found.", 404);
      }

      if (periodRow.status !== PayrollPeriodStatus.DRAFT) {
        throw new AppError("Payroll period is already closed.", 409);
      }

      const slips = await transaction.payrollSlip.findMany({
        where: { periodId: id },
        select: { id: true, requiresReview: true, reviewReason: true },
      });

      if (slips.length === 0) {
        throw new AppError(
          "Run the calculation before closing the payroll period.",
          409,
        );
      }

      const pendingReview = slips.filter((slip) => slip.requiresReview);
      if (pendingReview.length > 0) {
        throw new AppError(
          `${pendingReview.length} slip(s) require review before closing: ${pendingReview
            .map((slip) => slip.reviewReason)
            .filter(Boolean)
            .join("; ")}`,
          409,
        );
      }

      await transaction.payrollPeriod.update({
        where: { id },
        data: {
          status: PayrollPeriodStatus.CLOSED,
          closedAt: new Date(),
          closedByUserId: userId,
        },
      });
    });

    return getPayrollPeriod(id);
  } catch (error) {
    rethrowCashError(error);
  }
}
