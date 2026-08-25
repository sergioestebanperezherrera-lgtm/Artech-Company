import { EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

function isSerializationConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2034") {
    return true;
  }

  return (
    error.code === "P2010" &&
    typeof error.meta?.code === "string" &&
    error.meta.code === "40001"
  );
}

export async function runCashTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, transactionOptions);
    } catch (error) {
      const retryable = isSerializationConflict(error);

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new AppError("The cash operation changed concurrently. Try again.", 409);
}

export async function resolveActiveOperator(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const employee = await transaction.employee.findUnique({
    where: { userId },
    select: {
      id: true,
      code: true,
      isActive: true,
      employments: {
        where: { status: EmploymentStatus.ACTIVE },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
  const employment = employee?.employments[0];

  if (!employee?.isActive || !employment) {
    throw new AppError(
      "An active employee and employment are required for cash operations.",
      403,
    );
  }

  return { employee, employment };
}

export async function lockCashRegister(
  transaction: Prisma.TransactionClient,
  cashRegisterId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "CashRegister"
    WHERE "id" = ${cashRegisterId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new AppError("Cash register not found.", 404);
  }
}

export async function lockCashSession(
  transaction: Prisma.TransactionClient,
  cashSessionId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "CashSession"
    WHERE "id" = ${cashSessionId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new AppError("Cash session not found.", 404);
  }
}

export function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value.toFixed(2));
}

export function rethrowCashError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || isSerializationConflict(error)) {
      throw new AppError(
        "The cash operation conflicts with another completed operation.",
        409,
      );
    }

    if (error.code === "P2003") {
      throw new AppError("A related cash record is no longer available.", 409);
    }
  }

  throw error;
}
