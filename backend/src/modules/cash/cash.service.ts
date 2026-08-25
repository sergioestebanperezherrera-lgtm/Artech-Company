import {
  CashMovementType,
  CashSessionStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import {
  decimalToNumber,
  lockCashRegister,
  lockCashSession,
  resolveActiveOperator,
  rethrowCashError,
  runCashTransaction,
} from "./cash.shared";
import type {
  CloseCashSessionInput,
  CreateCashMovementInput,
  CreateCashRegisterInput,
  OpenCashSessionInput,
} from "./cash.validation";

const cashSessionInclude = {
  cashRegister: true,
  employment: {
    include: {
      employee: {
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  openedBy: { select: { id: true, name: true, email: true } },
  closedBy: { select: { id: true, name: true, email: true } },
  movements: {
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      sale: { select: { id: true, saleNumber: true } },
    },
  },
  sales: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      saleNumber: true,
      status: true,
      total: true,
      createdAt: true,
    },
  },
} satisfies Prisma.CashSessionInclude;

type CashSessionRecord = Prisma.CashSessionGetPayload<{
  include: typeof cashSessionInclude;
}>;

function mapCashRegister(register: {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...register,
    createdAt: register.createdAt.toISOString(),
    updatedAt: register.updatedAt.toISOString(),
  };
}

function mapCashSession(session: CashSessionRecord) {
  return {
    id: session.id,
    status: session.status,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openingAmount: decimalToNumber(session.openingAmount),
    expectedClosingAmount: decimalToNumber(session.expectedClosingAmount),
    actualClosingAmount: decimalToNumber(session.actualClosingAmount),
    differenceAmount: decimalToNumber(session.differenceAmount),
    cashRegister: mapCashRegister(session.cashRegister),
    employment: {
      id: session.employment.id,
      employee: session.employment.employee,
    },
    openedBy: session.openedBy,
    closedBy: session.closedBy,
    movements: session.movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: decimalToNumber(movement.amount),
      reason: movement.reason,
      sale: movement.sale,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt.toISOString(),
    })),
    sales: session.sales.map((sale) => ({
      ...sale,
      total: decimalToNumber(sale.total),
      createdAt: sale.createdAt.toISOString(),
    })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

async function findCashSession(id: string) {
  return prisma.cashSession.findUnique({
    where: { id },
    include: cashSessionInclude,
  });
}

async function requireCashSession(id: string) {
  const session = await findCashSession(id);

  if (!session) {
    throw new AppError("Cash session not found.", 404);
  }

  return session;
}

export async function listCashRegisters() {
  const registers = await prisma.cashRegister.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
  return registers.map(mapCashRegister);
}

export async function createCashRegister(input: CreateCashRegisterInput) {
  try {
    const register = await prisma.cashRegister.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name.replace(/\s+/g, " "),
      },
    });
    return mapCashRegister(register);
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function openCashSession(
  input: OpenCashSessionInput,
  userId: string,
) {
  try {
    const sessionId = await runCashTransaction(async (transaction) => {
      const operator = await resolveActiveOperator(transaction, userId);
      await lockCashRegister(transaction, input.cashRegisterId);
      const register = await transaction.cashRegister.findUniqueOrThrow({
        where: { id: input.cashRegisterId },
        select: { id: true, isActive: true },
      });

      if (!register.isActive) {
        throw new AppError("Cash register is inactive.", 409);
      }

      const openSession = await transaction.cashSession.findFirst({
        where: {
          cashRegisterId: register.id,
          status: CashSessionStatus.OPEN,
        },
        select: { id: true },
      });

      if (openSession) {
        throw new AppError("Cash register already has an open session.", 409);
      }

      const session = await transaction.cashSession.create({
        data: {
          cashRegisterId: register.id,
          employmentId: operator.employment.id,
          openedByUserId: userId,
          openingAmount: new Prisma.Decimal(input.openingAmount),
        },
        select: { id: true },
      });
      return session.id;
    });

    return mapCashSession(await requireCashSession(sessionId));
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function getCurrentCashSession(userId: string) {
  const sessionId = await prisma.$transaction(async (transaction) => {
    const operator = await resolveActiveOperator(transaction, userId);
    const session = await transaction.cashSession.findFirst({
      where: {
        employmentId: operator.employment.id,
        status: CashSessionStatus.OPEN,
      },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    return session?.id ?? null;
  });

  if (!sessionId) {
    return null;
  }

  return mapCashSession(await requireCashSession(sessionId));
}

export async function getCashSession(id: string) {
  return mapCashSession(await requireCashSession(id));
}

export async function createCashMovement(
  id: string,
  input: CreateCashMovementInput,
  userId: string,
) {
  try {
    await runCashTransaction(async (transaction) => {
      await resolveActiveOperator(transaction, userId);
      await lockCashSession(transaction, id);
      const session = await transaction.cashSession.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });

      if (session.status !== CashSessionStatus.OPEN) {
        throw new AppError("Cash session is closed.", 409);
      }

      await transaction.cashMovement.create({
        data: {
          cashSessionId: id,
          type: input.type,
          amount: new Prisma.Decimal(input.amount),
          reason: input.reason,
          createdByUserId: userId,
        },
      });
    });

    return mapCashSession(await requireCashSession(id));
  } catch (error) {
    rethrowCashError(error);
  }
}

export async function closeCashSession(
  id: string,
  input: CloseCashSessionInput,
  userId: string,
) {
  try {
    await runCashTransaction(async (transaction) => {
      await resolveActiveOperator(transaction, userId);
      await lockCashSession(transaction, id);
      const session = await transaction.cashSession.findUniqueOrThrow({
        where: { id },
        include: { movements: true },
      });

      if (session.status !== CashSessionStatus.OPEN) {
        throw new AppError("Cash session is already closed.", 409);
      }

      const expected = session.movements.reduce((total, movement) => {
        if (
          movement.type === CashMovementType.CASH_IN ||
          movement.type === CashMovementType.SALE
        ) {
          return total.plus(movement.amount);
        }
        return total.minus(movement.amount);
      }, session.openingAmount);

      if (expected.isNegative()) {
        throw new AppError(
          "Cash movements produce a negative expected closing amount.",
          409,
        );
      }

      const actual = new Prisma.Decimal(input.actualClosingAmount);
      await transaction.cashSession.update({
        where: { id },
        data: {
          status: CashSessionStatus.CLOSED,
          closedAt: new Date(),
          closedByUserId: userId,
          expectedClosingAmount: expected,
          actualClosingAmount: actual,
          differenceAmount: actual.minus(expected),
        },
      });
    });

    return mapCashSession(await requireCashSession(id));
  } catch (error) {
    rethrowCashError(error);
  }
}
