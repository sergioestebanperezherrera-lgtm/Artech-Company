import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const productInclude = {
  category: {
    select: {
      slug: true,
    },
  },
  brand: {
    select: {
      slug: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },
    select: {
      url: true,
    },
  },
  specifications: {
    orderBy: {
      sortOrder: "asc" as const,
    },
    select: {
      label: true,
      value: true,
      isHighlighted: true,
    },
  },
  inventory: {
    select: {
      physicalQuantity: true,
      reservedQuantity: true,
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

export async function findActiveProducts() {
  return prisma.product.findMany({
    where: {
      isActive: true,
    },
    include: productInclude,
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function findActiveProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
    },
    include: productInclude,
  });
}
