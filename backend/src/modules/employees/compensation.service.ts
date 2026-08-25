import { EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import {
  findActiveEmploymentForCompensation,
  findEmployeeCompensationById,
  type CompensationPeriodRecord,
  type EmployeeCompensationRecord,
} from "./compensation.repository";
import type { CreateCompensationPeriodInput } from "./compensation.validation";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

async function runCompensationTransaction<T>(
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

  throw new AppError(
    "The compensation record changed during this operation. Try again.",
    409,
  );
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

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toFixed(2));
}

function mapCompensationPeriod(period: CompensationPeriodRecord) {
  return {
    id: period.id,
    employmentId: period.employmentId,
    amount: decimalToNumber(period.amount),
    currency: period.currency,
    payFrequency: period.payFrequency,
    effectiveFrom: toDateOnly(period.effectiveFrom),
    effectiveTo: toDateOnly(period.effectiveTo),
    employment: {
      id: period.employment.id,
      status: period.employment.status,
      startDate: toDateOnly(period.employment.startDate),
      endDate: toDateOnly(period.employment.endDate),
      position: period.employment.position,
    },
    createdAt: period.createdAt.toISOString(),
    updatedAt: period.updatedAt.toISOString(),
  };
}

function mapEmployeeCompensation(employee: EmployeeCompensationRecord) {
  const periods = employee.employments
    .flatMap((employment) => employment.compensationPeriods)
    .sort((left, right) => {
      const byDate = right.effectiveFrom.getTime() - left.effectiveFrom.getTime();
      return byDate || right.createdAt.getTime() - left.createdAt.getTime();
    });
  const activeEmployment =
    employee.employments.find(
      (employment) => employment.status === EmploymentStatus.ACTIVE,
    ) ?? null;
  const current =
    activeEmployment?.compensationPeriods.find((period) => period.effectiveTo === null) ??
    null;

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
    current: current ? mapCompensationPeriod(current) : null,
    history: periods.map(mapCompensationPeriod),
  };
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

function rethrowCompensationError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      throw new AppError(
        "The compensation record changed during this operation. Try again.",
        409,
      );
    }

    if (error.code === "P2003") {
      throw new AppError("The selected employment is not available.", 409);
    }
  }

  throw error;
}

export async function getEmployeeCompensation(employeeId: string) {
  const employee = await findEmployeeCompensationById(employeeId);

  if (!employee) {
    throw new AppError("Employee not found.", 404);
  }

  return mapEmployeeCompensation(employee);
}

export async function createCompensationPeriod(
  employeeId: string,
  input: CreateCompensationPeriodInput,
) {
  try {
    await runCompensationTransaction(async (transaction) => {
      await lockEmployee(transaction, employeeId);
      const employee = await findActiveEmploymentForCompensation(
        transaction,
        employeeId,
      );

      if (!employee) {
        throw new AppError("Employee not found.", 404);
      }

      const activeEmployment = employee.employments[0];

      if (!employee.isActive || !activeEmployment) {
        throw new AppError(
          "Employee has no active employment for compensation changes.",
          409,
        );
      }

      const effectiveFrom = toDate(input.effectiveFrom);
      const periods = activeEmployment.compensationPeriods;
      const currentPeriod = periods.find((period) => period.effectiveTo === null);
      const latestPeriod = periods[0];

      if (currentPeriod) {
        if (effectiveFrom <= currentPeriod.effectiveFrom) {
          throw new AppError(
            "New compensation must start after the current compensation start date.",
            400,
          );
        }

        await transaction.compensationPeriod.update({
          where: { id: currentPeriod.id },
          data: { effectiveTo: previousDay(effectiveFrom) },
        });
      } else if (
        latestPeriod?.effectiveTo &&
        effectiveFrom <= latestPeriod.effectiveTo
      ) {
        throw new AppError(
          "New compensation must start after the latest compensation period ended.",
          400,
        );
      }

      await transaction.compensationPeriod.create({
        data: {
          employmentId: activeEmployment.id,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency,
          payFrequency: input.payFrequency,
          effectiveFrom,
        },
      });
    });

    return getEmployeeCompensation(employeeId);
  } catch (error) {
    rethrowCompensationError(error);
  }
}
