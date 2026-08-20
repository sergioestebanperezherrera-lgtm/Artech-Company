import { prisma } from "../../config/prisma";

export async function findActiveBrands() {
  return prisma.brand.findMany({
    where: {
      isActive: true,
    },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
    },
    orderBy: [
      {
        name: "asc",
      },
      {
        slug: "asc",
      },
    ],
  });
}
