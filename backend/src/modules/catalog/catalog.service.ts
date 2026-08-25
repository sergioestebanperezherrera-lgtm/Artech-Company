import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import type {
  AdminCreateCategoryInput,
  AdminCreateProductInput,
  AdminProductListQuery,
  AdminUpdateCategoryInput,
  AdminUpdateProductInput,
} from "./catalog.validation";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function rethrowCatalogError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : "";
    if (target.includes("sku")) {
      throw new AppError("A product with that SKU already exists.", 409);
    }
    throw new AppError(
      "That unique value is already in use (slug, SKU or barcode).",
      409,
    );
  }

  throw error;
}

const adminProductInclude = {
  category: { select: { id: true, name: true, slug: true, isActive: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, altText: true, isPrimary: true },
  },
  specifications: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, label: true, value: true, isHighlighted: true },
  },
  inventory: {
    select: { physicalQuantity: true, reservedQuantity: true, updatedAt: true },
  },
} satisfies Prisma.ProductInclude;

type AdminProductRecord = Prisma.ProductGetPayload<{
  include: typeof adminProductInclude;
}>;

function mapAdminProduct(product: AdminProductRecord) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    previousPrice: product.previousPrice ? Number(product.previousPrice) : null,
    barcode: product.barcode,
    hasRgbLighting: product.hasRgbLighting,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    category: product.category,
    brand: product.brand
      ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug }
      : null,
    images: product.images,
    specifications: product.specifications,
    availableQuantity: product.inventory
      ? Math.max(0, product.inventory.physicalQuantity - product.inventory.reservedQuantity)
      : 0,
    hasInventoryRecord: Boolean(product.inventory),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function adminListProducts(query: AdminProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.status === "active" ? { isActive: true } : {}),
    ...(query.status === "inactive" ? { isActive: false } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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
    include: adminProductInclude,
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  return products.map(mapAdminProduct);
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: adminProductInclude,
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return mapAdminProduct(product);
}

async function requireValidCategory(transaction: Prisma.TransactionClient, categoryId: string) {
  const category = await transaction.category.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true },
  });

  if (!category || !category.isActive) {
    throw new AppError("The selected category is invalid or inactive.", 400);
  }
}

async function requireValidBrand(transaction: Prisma.TransactionClient, brandId: string) {
  const brand = await transaction.brand.findUnique({
    where: { id: brandId },
    select: { id: true },
  });

  if (!brand) {
    throw new AppError("The selected brand does not exist.", 400);
  }
}

function buildImageData(urls: string[]) {
  return urls.map((url, index) => ({
    url,
    altText: null,
    sortOrder: index,
    isPrimary: index === 0,
  }));
}

export async function adminCreateProduct(input: AdminCreateProductInput) {
  try {
    const productId = await prisma.$transaction(async (transaction) => {
      await requireValidCategory(transaction, input.categoryId);
      if (input.brandId) {
        await requireValidBrand(transaction, input.brandId);
      }

      let slug = input.slug ?? slugify(input.name);
      if (!slug) {
        throw new AppError("Could not derive a valid slug from the name.", 400);
      }

      const slugTaken = await transaction.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (slugTaken) {
        throw new AppError("A product with that slug already exists.", 409);
      }

      const product = await transaction.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          slug,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          previousPrice: input.previousPrice
            ? new Prisma.Decimal(input.previousPrice)
            : null,
          categoryId: input.categoryId,
          brandId: input.brandId ?? null,
          barcode: input.barcode ?? null,
          hasRgbLighting: input.hasRgbLighting,
          isFeatured: input.isFeatured,
          isActive: input.isActive,
          // Stock inicial siempre en 0: las entradas se registran desde el
          // modulo Inventario para garantizar movimientos trazables.
          inventory: input.isActive ? { create: { physicalQuantity: 0 } } : undefined,
          images: { create: buildImageData(input.images) },
          specifications: input.specifications
            ? {
                create: input.specifications.map((specification, index) => ({
                  label: specification.label,
                  value: specification.value,
                  isHighlighted: specification.isHighlighted,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });
      return product.id;
    });

    return adminGetProduct(productId);
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function adminUpdateProduct(id: string, input: AdminUpdateProductInput) {
  try {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.product.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new AppError("Product not found.", 404);
      }

      if (input.categoryId) {
        await requireValidCategory(transaction, input.categoryId);
      }
      if (input.brandId) {
        await requireValidBrand(transaction, input.brandId);
      }

      if (input.slug !== undefined) {
        const slugTaken = await transaction.product.findFirst({
          where: { slug: input.slug, NOT: { id } },
          select: { id: true },
        });
        if (slugTaken) {
          throw new AppError("A product with that slug already exists.", 409);
        }
      }

      const {
        images,
        specifications,
        ...scalarFields
      } = input;

      await transaction.product.update({
        where: { id },
        data: {
          ...scalarFields,
          ...(input.price !== undefined
            ? { price: new Prisma.Decimal(input.price) }
            : {}),
          ...(input.previousPrice !== undefined
            ? {
                previousPrice:
                  input.previousPrice === null
                    ? null
                    : new Prisma.Decimal(input.previousPrice),
              }
            : {}),
          ...(images !== undefined
            ? {
                images: {
                  deleteMany: {},
                  create: buildImageData(images),
                },
              }
            : {}),
          ...(specifications !== undefined
            ? {
                specifications: {
                  deleteMany: {},
                  create: specifications.map((specification, index) => ({
                    label: specification.label,
                    value: specification.value,
                    isHighlighted: specification.isHighlighted,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
      });
    });

    return adminGetProduct(id);
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function adminListBrands() {
  return prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function adminListCategories() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      isActive: true,
      _count: { select: { products: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    isActive: category.isActive,
    productCount: category._count.products,
  }));
}

export async function adminCreateCategory(input: AdminCreateCategoryInput) {
  try {
    const slug = slugify(input.name);
    if (!slug) {
      throw new AppError("Could not derive a valid slug from the name.", 400);
    }

    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      throw new AppError("A category with that name already exists.", 409);
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
      },
      select: { id: true },
    });
    return (await adminListCategories()).find((item) => item.id === category.id)!;
  } catch (error) {
    rethrowCatalogError(error);
  }
}

export async function adminUpdateCategory(id: string, input: AdminUpdateCategoryInput) {
  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError("Category not found.", 404);
    }

    // El slug nunca cambia: los URLs publicos y el POS dependen de el.
    await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return (await adminListCategories()).find((item) => item.id === id)!;
  } catch (error) {
    rethrowCatalogError(error);
  }
}
