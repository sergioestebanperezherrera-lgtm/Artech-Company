import { AttendanceStatus, EmploymentStatus, Prisma, Weekday } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import type {
  AttendanceListQuery,
  ClockInInput,
  ClockOutInput,
  OverrideAttendanceInput,
} from "./attendance.validation";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

type AttendanceRecordWithRelations = Prisma.AttendanceRecordGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        code: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        isActive: true;
      };
    };
    employment: {
      select: {
        id: true;
        status: true;
        startDate: true;
        endDate: true;
        position: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    shiftAssignment: {
      select: {
        id: true;
        shiftId: true;
      };
    };
    adjustedBy: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

const attendanceInclude = {
  employee: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
    },
  },
  employment: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      position: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  shiftAssignment: {
    select: {
      id: true,
      shiftId: true,
    },
  },
  adjustedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AttendanceRecordInclude;

const weekdayByIndex: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function toTimeOnly(value: Date | null) {
  if (!value) {
    return null;
  }

  const hours = value.getUTCHours().toString().padStart(2, "0");
  const minutes = value.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeToMinutes(value: Date) {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function formatDateInBusinessZone(now: Date) {
  const parts = getZonedParts(now, env.businessTimeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function getZonedParts(value: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function addDaysToDateString(value: string, days: number) {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localDateTimeToUtc(workDate: string, minutes: number) {
  const [year, month, day] = workDate.split("-").map(Number);
  const targetUtcMs = Date.UTC(
    year,
    month - 1,
    day,
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );
  const zoned = getZonedParts(new Date(targetUtcMs), env.businessTimeZone);
  const zonedAsUtcMs = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    0,
  );

  return new Date(targetUtcMs + (targetUtcMs - zonedAsUtcMs));
}

function getWeekday(workDate: string) {
  return weekdayByIndex[toDate(workDate).getUTCDay()];
}

function getExpectedDateTimes(
  workDate: string,
  startMinutes: number,
  endMinutes: number,
) {
  const crossesMidnight = endMinutes <= startMinutes;
  const endWorkDate = crossesMidnight
    ? addDaysToDateString(workDate, 1)
    : workDate;

  return {
    expectedStartDateTime: localDateTimeToUtc(workDate, startMinutes),
    expectedEndDateTime: localDateTimeToUtc(endWorkDate, endMinutes),
    crossesMidnight,
  };
}

function calculateLateMinutes(clockInAt: Date, expectedStartDateTime: Date) {
  return Math.max(
    0,
    Math.floor((clockInAt.getTime() - expectedStartDateTime.getTime()) / 60_000),
  );
}

async function runAttendanceTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, transactionOptions);
    } catch (error) {
      const isWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!isWriteConflict || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new AppError("The attendance record changed during this operation. Try again.", 409);
}

async function lockEmployee(
  transaction: Prisma.TransactionClient,
  employeeId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Employee"
    WHERE "id" = ${employeeId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new AppError("Employee not found.", 404);
  }
}

async function resolveEmploymentAndShift(
  transaction: Prisma.TransactionClient,
  employeeId: string,
  workDate: string,
) {
  await lockEmployee(transaction, employeeId);
  const workDateValue = toDate(workDate);
  const employee = await transaction.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      isActive: true,
      employments: {
        where: {
          status: EmploymentStatus.ACTIVE,
          startDate: { lte: workDateValue },
          OR: [{ endDate: null }, { endDate: { gte: workDateValue } }],
        },
        orderBy: { startDate: "desc" },
        take: 1,
        include: {
          shiftAssignments: {
            where: {
              effectiveFrom: { lte: workDateValue },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: workDateValue } }],
            },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
            include: {
              shift: {
                include: {
                  workDays: {
                    select: { day: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!employee) {
    throw new AppError("Employee not found.", 404);
  }

  if (!employee.isActive) {
    throw new AppError("Inactive employees cannot record attendance.", 409);
  }

  const employment = employee.employments[0];

  if (!employment) {
    throw new AppError("Employee has no active employment for this date.", 409);
  }

  const shiftAssignment = employment.shiftAssignments[0];

  if (!shiftAssignment) {
    throw new AppError("No shift is assigned for this date.", 409);
  }

  const weekday = getWeekday(workDate);
  const isWorkDay = shiftAssignment.shift.workDays.some(
    (workDay) => workDay.day === weekday,
  );

  if (!isWorkDay) {
    throw new AppError("The assigned shift does not work on this date.", 409);
  }

  return {
    employee,
    employment,
    shiftAssignment,
  };
}

function rethrowAttendanceError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      throw new AppError(
        "An attendance record already exists or changed during this operation.",
        409,
      );
    }

    if (error.code === "P2003") {
      throw new AppError("The selected attendance relation is not available.", 409);
    }
  }

  throw error;
}

function mapAttendance(record: AttendanceRecordWithRelations) {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employmentId: record.employmentId,
    shiftAssignmentId: record.shiftAssignmentId,
    workDate: toDateOnly(record.workDate),
    expectedShiftName: record.expectedShiftName,
    expectedShiftType: record.expectedShiftType,
    expectedStartTime: toTimeOnly(record.expectedStartTime),
    expectedEndTime: toTimeOnly(record.expectedEndTime),
    expectedCrossesMidnight: record.expectedCrossesMidnight,
    clockInAt: record.clockInAt?.toISOString() ?? null,
    clockOutAt: record.clockOutAt?.toISOString() ?? null,
    status: record.status,
    lateMinutes: record.lateMinutes,
    notes: record.notes,
    adjustmentReason: record.adjustmentReason,
    adjustedBy: record.adjustedBy,
    employee: record.employee,
    employment: {
      id: record.employment.id,
      status: record.employment.status,
      startDate: toDateOnly(record.employment.startDate),
      endDate: toDateOnly(record.employment.endDate),
      position: record.employment.position,
    },
    shiftAssignment: record.shiftAssignment,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function getAttendanceById(id: string) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: attendanceInclude,
  });

  if (!record) {
    throw new AppError("Attendance record not found.", 404);
  }

  return record;
}

export async function listAttendance(query: AttendanceListQuery) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      ...(query.date ? { workDate: toDate(query.date) } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: attendanceInclude,
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    take: 250,
  });

  return records.map(mapAttendance);
}

export function listEmployeeAttendance(employeeId: string, query: AttendanceListQuery) {
  return listAttendance({ ...query, employeeId });
}

export async function clockIn(input: ClockInInput, now = new Date()) {
  const workDate = input.workDate ?? formatDateInBusinessZone(now);

  try {
    const attendanceId = await runAttendanceTransaction(async (transaction) => {
      const { employment, shiftAssignment } = await resolveEmploymentAndShift(
        transaction,
        input.employeeId,
        workDate,
      );
      const startMinutes = timeToMinutes(shiftAssignment.shift.startTime);
      const endMinutes = timeToMinutes(shiftAssignment.shift.endTime);
      const { expectedStartDateTime, crossesMidnight } = getExpectedDateTimes(
        workDate,
        startMinutes,
        endMinutes,
      );
      const lateMinutes = calculateLateMinutes(now, expectedStartDateTime);
      const status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      const attendance = await transaction.attendanceRecord.create({
        data: {
          employeeId: input.employeeId,
          employmentId: employment.id,
          shiftAssignmentId: shiftAssignment.id,
          workDate: toDate(workDate),
          expectedShiftName: shiftAssignment.shift.name,
          expectedShiftType: shiftAssignment.shift.type,
          expectedStartTime: shiftAssignment.shift.startTime,
          expectedEndTime: shiftAssignment.shift.endTime,
          expectedCrossesMidnight: crossesMidnight,
          clockInAt: now,
          status,
          lateMinutes,
        },
        select: { id: true },
      });

      return attendance.id;
    });

    return mapAttendance(await getAttendanceById(attendanceId));
  } catch (error) {
    rethrowAttendanceError(error);
  }
}

export async function clockOut(input: ClockOutInput, now = new Date()) {
  try {
    const attendanceId = await runAttendanceTransaction(async (transaction) => {
      await lockEmployee(transaction, input.employeeId);
      const record = await transaction.attendanceRecord.findFirst({
        where: {
          employeeId: input.employeeId,
          ...(input.workDate ? { workDate: toDate(input.workDate) } : {}),
          clockInAt: { not: null },
          clockOutAt: null,
        },
        orderBy: [{ workDate: "desc" }, { clockInAt: "desc" }],
        select: {
          id: true,
          clockInAt: true,
        },
      });

      if (!record) {
        throw new AppError("No open attendance record is available for clock-out.", 409);
      }

      if (record.clockInAt && now <= record.clockInAt) {
        throw new AppError("Clock-out must be after clock-in.", 400);
      }

      await transaction.attendanceRecord.update({
        where: { id: record.id },
        data: { clockOutAt: now },
      });

      return record.id;
    });

    return mapAttendance(await getAttendanceById(attendanceId));
  } catch (error) {
    rethrowAttendanceError(error);
  }
}

function parseManualDateTime(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : new Date(value);
}

function deriveStatusAndLateMinutes(
  record: AttendanceRecordWithRelations,
  input: OverrideAttendanceInput,
) {
  const nextClockInAt =
    input.clockInAt === undefined
      ? record.clockInAt
      : parseManualDateTime(input.clockInAt);
  const nextStatus = input.status ?? record.status;
  let lateMinutes = record.lateMinutes;
  let status = nextStatus;

  if (
    input.status === undefined &&
    nextClockInAt &&
    record.expectedStartTime
  ) {
    const startMinutes = timeToMinutes(record.expectedStartTime);
    const expected = getExpectedDateTimes(
      toDateOnly(record.workDate) ?? "",
      startMinutes,
      record.expectedEndTime ? timeToMinutes(record.expectedEndTime) : startMinutes,
    );
    lateMinutes = calculateLateMinutes(nextClockInAt, expected.expectedStartDateTime);
    status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  }

  if (status === AttendanceStatus.ABSENT || status === AttendanceStatus.EXCUSED) {
    lateMinutes = 0;
  }

  return { status, lateMinutes };
}

export async function overrideAttendance(
  id: string,
  input: OverrideAttendanceInput,
  adjustedByUserId: string,
) {
  const existing = await getAttendanceById(id);
  const clockInAt = parseManualDateTime(input.clockInAt);
  const clockOutAt = parseManualDateTime(input.clockOutAt);
  const nextClockInAt = clockInAt === undefined ? existing.clockInAt : clockInAt;
  const nextClockOutAt = clockOutAt === undefined ? existing.clockOutAt : clockOutAt;

  if (nextClockInAt && nextClockOutAt && nextClockOutAt <= nextClockInAt) {
    throw new AppError("Clock-out must be after clock-in.", 400);
  }

  const { status, lateMinutes } = deriveStatusAndLateMinutes(existing, input);

  try {
    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        ...(clockInAt !== undefined ? { clockInAt } : {}),
        ...(clockOutAt !== undefined ? { clockOutAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        status,
        lateMinutes,
        adjustedByUserId,
        adjustmentReason: input.adjustmentReason.trim(),
      },
      include: attendanceInclude,
    });

    return mapAttendance(updated);
  } catch (error) {
    rethrowAttendanceError(error);
  }
}

export const attendanceTime = {
  formatDateInBusinessZone,
  getExpectedDateTimes,
  localDateTimeToUtc,
};
