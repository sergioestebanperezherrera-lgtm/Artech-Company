import { EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import {
  findActiveEmploymentForShiftAssignment,
  findEmployeeShiftsById,
  findShifts,
  shiftInclude,
  type EmployeeShiftsRecord,
  type ShiftAssignmentRecord,
  type ShiftRecord,
} from "./shifts.repository";
import type {
  CreateShiftAssignmentInput,
  CreateShiftInput,
  UpdateShiftInput,
} from "./shifts.validation";
import { weekdays } from "./shifts.validation";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

async function runShiftTransaction<T>(
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

  throw new AppError("The shift record changed during this operation. Try again.", 409);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function previousDay(value: Date) {
  return new Date(value.getTime() - 24 * 60 * 60 * 1000);
}

function toTime(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function toTimeOnly(value: Date) {
  const hours = value.getUTCHours().toString().padStart(2, "0");
  const minutes = value.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function sortWorkDays(days: Array<{ day: string }>) {
  const order = new Map(weekdays.map((day, index) => [day, index]));
  return days
    .map((day) => day.day)
    .sort((left, right) => (order.get(left as never) ?? 0) - (order.get(right as never) ?? 0));
}

function mapShift(shift: ShiftRecord) {
  return {
    id: shift.id,
    name: shift.name,
    code: shift.code,
    type: shift.type,
    startTime: toTimeOnly(shift.startTime),
    endTime: toTimeOnly(shift.endTime),
    workDays: sortWorkDays(shift.workDays),
    isActive: shift.isActive,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
  };
}

function mapShiftAssignment(assignment: ShiftAssignmentRecord) {
  return {
    id: assignment.id,
    employmentId: assignment.employmentId,
    shiftId: assignment.shiftId,
    effectiveFrom: toDateOnly(assignment.effectiveFrom),
    effectiveTo: toDateOnly(assignment.effectiveTo),
    shift: mapShift(assignment.shift),
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

function mapEmployeeShifts(employee: EmployeeShiftsRecord) {
  const assignments = employee.employments
    .flatMap((employment) => employment.shiftAssignments)
    .sort((left, right) => {
      const byDate = right.effectiveFrom.getTime() - left.effectiveFrom.getTime();
      return byDate || right.createdAt.getTime() - left.createdAt.getTime();
    });
  const activeEmployment =
    employee.employments.find(
      (employment) => employment.status === EmploymentStatus.ACTIVE,
    ) ?? null;
  const current =
    activeEmployment?.shiftAssignments.find(
      (assignment) => assignment.effectiveTo === null,
    ) ?? null;

  return {
    employee: {
      id: employee.id,
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      isActive: employee.isActive,
    },
    currentEmployment: activeEmployment
      ? {
          id: activeEmployment.id,
          startDate: toDateOnly(activeEmployment.startDate),
          endDate: toDateOnly(activeEmployment.endDate),
          status: activeEmployment.status,
          position: activeEmployment.position,
        }
      : null,
    current: current ? mapShiftAssignment(current) : null,
    history: assignments.map(mapShiftAssignment),
  };
}

function normalizeShiftName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeShiftCode(code: string) {
  return code.trim().replace(/\s+/g, "_").toUpperCase();
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

function rethrowShiftError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      throw new AppError(
        "The shift record changed during this operation. Try again.",
        409,
      );
    }

    if (error.code === "P2003") {
      throw new AppError("The selected shift or employment is not available.", 409);
    }
  }

  throw error;
}

export async function listShifts() {
  const shifts = await findShifts();
  return shifts.map(mapShift);
}

export async function createShift(input: CreateShiftInput) {
  try {
    const shift = await prisma.shift.create({
      data: {
        name: normalizeShiftName(input.name),
        code: normalizeShiftCode(input.code),
        type: input.type,
        startTime: toTime(input.startTime),
        endTime: toTime(input.endTime),
        workDays: {
          create: input.workDays.map((day) => ({ day })),
        },
      },
      include: shiftInclude,
    });

    return mapShift(shift);
  } catch (error) {
    rethrowShiftError(error);
  }
}

export async function updateShift(id: string, input: UpdateShiftInput) {
  const existing = await prisma.shift.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Shift not found.", 404);
  }

  try {
    const shift = await prisma.$transaction(async (transaction) => {
      if (input.workDays) {
        await transaction.shiftWorkDay.deleteMany({
          where: { shiftId: id },
        });
      }

      return transaction.shift.update({
        where: { id },
        data: {
          ...(input.name !== undefined
            ? { name: normalizeShiftName(input.name) }
            : {}),
          ...(input.code !== undefined
            ? { code: normalizeShiftCode(input.code) }
            : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.startTime !== undefined
            ? { startTime: toTime(input.startTime) }
            : {}),
          ...(input.endTime !== undefined ? { endTime: toTime(input.endTime) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.workDays
            ? {
                workDays: {
                  create: input.workDays.map((day) => ({ day })),
                },
              }
            : {}),
        },
        include: shiftInclude,
      });
    });

    return mapShift(shift);
  } catch (error) {
    rethrowShiftError(error);
  }
}

export async function getEmployeeShifts(employeeId: string) {
  const employee = await findEmployeeShiftsById(employeeId);

  if (!employee) {
    throw new AppError("Employee not found.", 404);
  }

  return mapEmployeeShifts(employee);
}

export async function createShiftAssignment(
  employeeId: string,
  input: CreateShiftAssignmentInput,
) {
  try {
    await runShiftTransaction(async (transaction) => {
      await lockEmployee(transaction, employeeId);
      const employee = await findActiveEmploymentForShiftAssignment(
        transaction,
        employeeId,
      );

      if (!employee) {
        throw new AppError("Employee not found.", 404);
      }

      const activeEmployment = employee.employments[0];

      if (!employee.isActive || !activeEmployment) {
        throw new AppError("Employee has no active employment for shift changes.", 409);
      }

      const shift = await transaction.shift.findUnique({
        where: { id: input.shiftId },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (!shift) {
        throw new AppError("Shift not found.", 404);
      }

      if (!shift.isActive) {
        throw new AppError("The selected shift is inactive.", 409);
      }

      const effectiveFrom = toDate(input.effectiveFrom);
      const assignments = activeEmployment.shiftAssignments;
      const currentAssignment = assignments.find(
        (assignment) => assignment.effectiveTo === null,
      );
      const latestAssignment = assignments[0];

      if (effectiveFrom < activeEmployment.startDate) {
        throw new AppError(
          "Shift assignment cannot start before the employment start date.",
          400,
        );
      }

      if (currentAssignment) {
        if (currentAssignment.shiftId === shift.id) {
          throw new AppError("Employee already has the selected shift.", 409);
        }

        if (effectiveFrom <= currentAssignment.effectiveFrom) {
          throw new AppError(
            "New shift must start after the current shift start date.",
            400,
          );
        }

        await transaction.shiftAssignment.update({
          where: { id: currentAssignment.id },
          data: { effectiveTo: previousDay(effectiveFrom) },
        });
      } else if (
        latestAssignment?.effectiveTo &&
        effectiveFrom <= latestAssignment.effectiveTo
      ) {
        throw new AppError(
          "New shift must start after the latest shift assignment ended.",
          400,
        );
      }

      await transaction.shiftAssignment.create({
        data: {
          employmentId: activeEmployment.id,
          shiftId: shift.id,
          effectiveFrom,
        },
      });
    });

    return getEmployeeShifts(employeeId);
  } catch (error) {
    rethrowShiftError(error);
  }
}
