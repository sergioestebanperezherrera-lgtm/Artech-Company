import { prisma } from "../../config/prisma";

export async function findActiveCategories() {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    select: {
      slug: true,
      name: true,
      icon: true,
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
