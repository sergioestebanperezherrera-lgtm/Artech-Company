import {
  InventoryMovementDirection,
  InventoryMovementType,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import { rethrowCashError, runCashTransaction } from "../cash/cash.shared";
import type {
  CreateManualMovementInput,
  InventoryListQuery,
  MovementListQuery,
} from "./inventory.validation";

export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "AVAILABLE" | "LOW" | "OUT";

const inventoryProductSelect = {
  id: true,
  name: true,
  sku: true,
  isActive: true,
  category: {
    select: { id: true, name: true },
  },
  inventory: {
    select: {
      id: true,
      physicalQuantity: true,
      reservedQuantity: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProductSelect;

type InventoryProductRecord = Prisma.ProductGetPayload<{
  select: typeof inventoryProductSelect;
}>;

const movementInclude = {
  product: {
    select: { id: true, name: true, sku: true },
  },
  sale: {
    select: { id: true, saleNumber: true, channel: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.InventoryMovementInclude;

type MovementRecord = Prisma.InventoryMovementGetPayload<{
  include: typeof movementInclude;
}>;

function getAvailableQuantity(product: InventoryProductRecord) {
  if (!product.inventory) {
    return 0;
  }

  return product.inventory.physicalQuantity - product.inventory.reservedQuantity;
}

function getStockStatus(product: InventoryProductRecord): StockStatus {
  const available = getAvailableQuantity(product);

  if (available <= 0) {
    return "OUT";
  }
  if (available <= LOW_STOCK_THRESHOLD) {
    return "LOW";
  }
  return "AVAILABLE";
}

function mapInventoryItem(product: InventoryProductRecord) {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    isActive: product.isActive,
    category: product.category,
    hasInventoryRecord: Boolean(product.inventory),
    physicalQuantity: product.inventory?.physicalQuantity ?? 0,
    reservedQuantity: product.inventory?.reservedQuantity ?? 0,
    availableQuantity: getAvailableQuantity(product),
    stockStatus: getStockStatus(product),
    updatedAt: product.inventory?.updatedAt.toISOString() ?? null,
  };
}

const inMovementTypes = new Set<InventoryMovementType>([
  InventoryMovementType.PURCHASE,
  InventoryMovementType.RETURN,
]);

function mapMovement(movement: MovementRecord) {
  return {
    id: movement.id,
    product: movement.product,
    type: movement.type,
    direction: movement.direction,
    quantity: movement.quantity,
    reference: movement.reference,
    note: movement.note,
    sale: movement.sale
      ? {
          id: movement.sale.id,
          saleNumber: movement.sale.saleNumber,
          channel: movement.sale.channel,
        }
      : null,
    createdBy: movement.createdBy,
    occurredAt: movement.occurredAt.toISOString(),
  };
}

export async function listInventory(query: InventoryListQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.search?.trim()
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: "insensitive" } },
            { sku: { contains: query.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    select: inventoryProductSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return products
    .map(mapInventoryItem)
    .filter(
      (item) =>
        query.stockStatus === "all" || item.stockStatus === query.stockStatus.toUpperCase(),
    );
}

export async function listMovements(query: MovementListQuery) {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
    },
    include: movementInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: query.limit,
  });
  return movements.map(mapMovement);
}

export async function createManualMovement(
  input: CreateManualMovementInput,
  userId: string,
) {
  const direction = inMovementTypes.has(input.type)
    ? InventoryMovementDirection.IN
    : InventoryMovementDirection.OUT;

  try {
    const movementId = await runCashTransaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "Inventory"
        WHERE "productId" = ${input.productId}
        FOR UPDATE
      `;

      const product = await transaction.product.findUnique({
        where: { id: input.productId },
        select: {
          id: true,
          name: true,
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

      if (!product) {
        throw new AppError("Product not found.", 404);
      }

      if (!product.isActive) {
        throw new AppError("Inactive products cannot receive inventory movements.", 409);
      }

      let inventoryId: string;

      if (!product.inventory) {
        if (direction === InventoryMovementDirection.OUT) {
          throw new AppError(
            `Product ${product.name} has no inventory record to withdraw from.`,
            409,
          );
        }

        const created = await transaction.inventory.create({
          data: {
            productId: product.id,
            physicalQuantity: input.quantity,
            reservedQuantity: 0,
          },
          select: { id: true },
        });
        inventoryId = created.id;
      } else {
        inventoryId = product.inventory.id;
        const available =
          product.inventory.physicalQuantity - product.inventory.reservedQuantity;

        if (
          direction === InventoryMovementDirection.OUT &&
          available < input.quantity
        ) {
          throw new AppError(
            `Insufficient stock for ${product.name}. Available: ${available}.`,
            409,
          );
        }

        await transaction.inventory.update({
          where: { id: inventoryId },
          data: {
            physicalQuantity:
              direction === InventoryMovementDirection.IN
                ? { increment: input.quantity }
                : { decrement: input.quantity },
          },
        });
      }

      return (await transaction.inventoryMovement.create({
        data: {
          productId: product.id,
          type: input.type,
          direction,
          quantity: input.quantity,
          note: input.reason,
          createdByUserId: userId,
        },
        select: { id: true },
      })).id;
    });

    const movement = await prisma.inventoryMovement.findUniqueOrThrow({
      where: { id: movementId },
      include: movementInclude,
    });

    return mapMovement(movement);
  } catch (error) {
    rethrowCashError(error);
  }
}
