import {
  CashMovementType,
  CashSessionStatus,
  InventoryMovementDirection,
  InventoryMovementType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SaleChannel,
  SaleStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import {
  decimalToNumber,
  lockCashSession,
  resolveActiveOperator,
  rethrowCashError,
  runCashTransaction,
} from "../cash/cash.shared";
import type {
  CreatePosSaleInput,
  PosSaleListQuery,
} from "./pos.validation";

const posSaleInclude = {
  employee: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
    },
  },
  cashSession: {
    select: {
      id: true,
      status: true,
      cashRegister: { select: { id: true, code: true, name: true } },
    },
  },
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      productId: true,
      productName: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      subtotal: true,
    },
  },
  payments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      changeAmount: true,
      externalReference: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SaleInclude;

type PosSaleRecord = Prisma.SaleGetPayload<{ include: typeof posSaleInclude }>;

function mapPosSale(sale: PosSaleRecord) {
  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    channel: sale.channel,
    status: sale.status,
    cashSession: sale.cashSession,
    employee: sale.employee,
    items: sale.items.map((item) => ({
      ...item,
      unitPrice: decimalToNumber(item.unitPrice),
      lineTotal: decimalToNumber(item.subtotal),
    })),
    payment: sale.payments[0]
      ? {
          ...sale.payments[0],
          amount: decimalToNumber(sale.payments[0].amount),
          changeAmount: decimalToNumber(sale.payments[0].changeAmount),
          createdAt: sale.payments[0].createdAt.toISOString(),
        }
      : null,
    subtotal: decimalToNumber(sale.subtotal),
    discount: decimalToNumber(sale.discount),
    total: decimalToNumber(sale.total),
    clientRequestId: sale.clientRequestId,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}

async function findPosSale(id: string) {
  return prisma.sale.findFirst({
    where: { id, channel: SaleChannel.POS },
    include: posSaleInclude,
  });
}

async function requirePosSale(id: string) {
  const sale = await findPosSale(id);

  if (!sale) {
    throw new AppError("POS sale not found.", 404);
  }

  return sale;
}

async function nextSaleNumber(transaction: Prisma.TransactionClient) {
  const [row] = await transaction.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('"sale_number_seq"') AS value
  `;

  if (!row) {
    throw new AppError("Could not generate a sale number.", 500);
  }

  return `SALE-${row.value.toString().padStart(6, "0")}`;
}

async function lockInventories(
  transaction: Prisma.TransactionClient,
  productIds: string[],
) {
  if (productIds.length === 0) {
    return;
  }

  await transaction.$queryRaw`
    SELECT "id"
    FROM "Inventory"
    WHERE "productId" IN (${Prisma.join(productIds)})
    ORDER BY "productId"
    FOR UPDATE
  `;
}

async function findIdempotentSale(
  transaction: Prisma.TransactionClient,
  clientRequestId: string,
  cashSessionId: string,
  employeeId: string,
) {
  const sale = await transaction.sale.findUnique({
    where: { clientRequestId },
    select: { id: true, cashSessionId: true, employeeId: true, channel: true },
  });

  if (!sale) {
    return null;
  }

  if (
    sale.channel !== SaleChannel.POS ||
    sale.cashSessionId !== cashSessionId ||
    sale.employeeId !== employeeId
  ) {
    throw new AppError("Client request ID is already in use.", 409);
  }

  return sale.id;
}

export async function listPosSales(query: PosSaleListQuery) {
  const sales = await prisma.sale.findMany({
    where: {
      channel: SaleChannel.POS,
      ...(query.cashSessionId ? { cashSessionId: query.cashSessionId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: posSaleInclude,
  });
  return sales.map(mapPosSale);
}

export async function getPosSale(id: string) {
  return mapPosSale(await requirePosSale(id));
}

export async function createPosSale(
  input: CreatePosSaleInput,
  userId: string,
) {
  try {
    const result = await runCashTransaction(async (transaction) => {
      const operator = await resolveActiveOperator(transaction, userId);
      await lockCashSession(transaction, input.cashSessionId);
      const cashSession = await transaction.cashSession.findUniqueOrThrow({
        where: { id: input.cashSessionId },
        select: {
          id: true,
          employmentId: true,
          status: true,
          cashRegister: { select: { isActive: true } },
        },
      });

      if (cashSession.status !== CashSessionStatus.OPEN) {
        throw new AppError("Cash session is closed.", 409);
      }

      if (!cashSession.cashRegister.isActive) {
        throw new AppError("Cash register is inactive.", 409);
      }

      if (cashSession.employmentId !== operator.employment.id) {
        throw new AppError("Cash session belongs to another employee.", 403);
      }

      if (input.clientRequestId) {
        const existingId = await findIdempotentSale(
          transaction,
          input.clientRequestId,
          cashSession.id,
          operator.employee.id,
        );
        if (existingId) {
          return { id: existingId, created: false };
        }
      }

      const productIds = [...input.items.map((item) => item.productId)].sort();
      await lockInventories(transaction, productIds);
      const products = await transaction.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          isActive: true,
          inventory: {
            select: {
              id: true,
              physicalQuantity: true,
              reservedQuantity: true,
            },
          },
        },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));
      let subtotal = new Prisma.Decimal(0);
      const saleItems = input.items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new AppError(`Product ${item.productId} was not found.`, 404);
        }

        if (!product.isActive) {
          throw new AppError(`Product ${product.name} is inactive.`, 409);
        }

        if (!product.inventory) {
          throw new AppError(`Product ${product.name} has no inventory record.`, 409);
        }

        const available =
          product.inventory.physicalQuantity - product.inventory.reservedQuantity;
        if (available < item.quantity) {
          throw new AppError(`Insufficient stock for ${product.name}.`, 409);
        }

        const lineTotal = product.price.mul(item.quantity);
        subtotal = subtotal.plus(lineTotal);
        return { item, product, lineTotal };
      });

      const paidAmount = new Prisma.Decimal(input.payment.amount);
      if (input.payment.method === PaymentMethod.CASH && paidAmount.lessThan(subtotal)) {
        throw new AppError("Cash payment is less than the sale total.", 400);
      }
      if (input.payment.method === PaymentMethod.CARD && !paidAmount.equals(subtotal)) {
        throw new AppError("Card payment must equal the sale total.", 400);
      }

      const changeAmount =
        input.payment.method === PaymentMethod.CASH
          ? paidAmount.minus(subtotal)
          : new Prisma.Decimal(0);
      const saleNumber = await nextSaleNumber(transaction);
      const sale = await transaction.sale.create({
        data: {
          saleNumber,
          channel: SaleChannel.POS,
          employeeId: operator.employee.id,
          cashSessionId: cashSession.id,
          clientRequestId: input.clientRequestId,
          status: SaleStatus.CONFIRMED,
          subtotal,
          discount: new Prisma.Decimal(0),
          total: subtotal,
          items: {
            create: saleItems.map(({ item, product, lineTotal }) => ({
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              quantity: item.quantity,
              unitPrice: product.price,
              subtotal: lineTotal,
            })),
          },
          payments: {
            create: {
              method: input.payment.method,
              status: PaymentStatus.PAID,
              amount: paidAmount,
              changeAmount,
            },
          },
        },
        select: { id: true },
      });

      for (const { item, product } of saleItems) {
        await transaction.inventory.update({
          where: { id: product.inventory!.id },
          data: { physicalQuantity: { decrement: item.quantity } },
        });
        await transaction.inventoryMovement.create({
          data: {
            productId: product.id,
            saleId: sale.id,
            type: InventoryMovementType.SALE,
            direction: InventoryMovementDirection.OUT,
            quantity: item.quantity,
            reference: saleNumber,
            note: "POS sale",
          },
        });
      }

      if (input.payment.method === PaymentMethod.CASH) {
        await transaction.cashMovement.create({
          data: {
            cashSessionId: cashSession.id,
            type: CashMovementType.SALE,
            amount: subtotal,
            createdByUserId: userId,
            saleId: sale.id,
          },
        });
      }

      return { id: sale.id, created: true };
    });

    return {
      data: mapPosSale(await requirePosSale(result.id)),
      created: result.created,
    };
  } catch (error) {
    if (
      input.clientRequestId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.sale.findUnique({
        where: { clientRequestId: input.clientRequestId },
        include: posSaleInclude,
      });
      if (existing) {
        return { data: mapPosSale(existing), created: false };
      }
    }
    rethrowCashError(error);
  }
}
