import { PrismaClient } from "@prisma/client";
import { brands } from "./seed-data/brands";
import { categories } from "./seed-data/categories";
import { products, type ProductSeed } from "./seed-data/products";

const prisma = new PrismaClient();

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toMoney(value: number) {
  return value.toFixed(2);
}

function calculatePreviousPrice(price: number, discountPercent: number | null) {
  if (!discountPercent) {
    return null;
  }

  return toMoney(price / (1 - discountPercent / 100));
}

function buildSku(categoryId: string, slug: string) {
  const categoryCode = categoryId
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  const productCode = slug
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  return `ART-${categoryCode}-${productCode}`;
}

function getHighlightedSpecIndexes(product: ProductSeed) {
  const shortSpecs = product.shortSpecs.map(normalizeText);
  const matchedIndexes = product.fullSpecs
    .map((spec, index) => {
      const label = normalizeText(spec.label);
      const value = normalizeText(spec.value);
      const matches = shortSpecs.some((shortSpec) => {
        return (
          shortSpec === value ||
          shortSpec.includes(value) ||
          (value.length >= 3 && value.includes(shortSpec)) ||
          shortSpec.includes(label)
        );
      });

      return matches ? index : -1;
    })
    .filter((index) => index >= 0)
    .slice(0, 3);

  if (matchedIndexes.length === Math.min(3, product.fullSpecs.length)) {
    return new Set(matchedIndexes);
  }

  return new Set(product.fullSpecs.slice(0, 3).map((_spec, index) => index));
}

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.id },
      update: {
        name: category.name,
        icon: category.icon,
        isActive: true,
      },
      create: {
        id: category.id,
        name: category.name,
        slug: category.id,
        icon: category.icon,
        isActive: true,
      },
    });
  }
}

async function seedBrands() {
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.id },
      update: {
        name: brand.name,
        logoUrl: brand.logo,
        isActive: true,
      },
      create: {
        id: brand.id,
        name: brand.name,
        slug: brand.id,
        logoUrl: brand.logo,
        isActive: true,
      },
    });
  }
}

async function seedProducts() {
  for (const product of products) {
    const highlightedSpecIndexes = getHighlightedSpecIndexes(product);

    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        slug: product.slug,
        description: "",
        sku: buildSku(product.category, product.slug),
        barcode: null,
        price: toMoney(product.priceGTQ),
        previousPrice: calculatePreviousPrice(
          product.priceGTQ,
          product.discountPercent,
        ),
        hasRgbLighting: product.hasRgbLighting,
        isActive: true,
        isFeatured: product.discountPercent !== null,
        category: {
          connect: { slug: product.category },
        },
        brand: {
          connect: { slug: product.brand },
        },
      },
      create: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: "",
        sku: buildSku(product.category, product.slug),
        barcode: null,
        price: toMoney(product.priceGTQ),
        previousPrice: calculatePreviousPrice(
          product.priceGTQ,
          product.discountPercent,
        ),
        hasRgbLighting: product.hasRgbLighting,
        isActive: true,
        isFeatured: product.discountPercent !== null,
        category: {
          connect: { slug: product.category },
        },
        brand: {
          connect: { slug: product.brand },
        },
      },
    });

    await prisma.$transaction([
      prisma.productImage.deleteMany({
        where: { productId: product.id },
      }),
      prisma.productSpecification.deleteMany({
        where: { productId: product.id },
      }),
      prisma.inventory.upsert({
        where: { productId: product.id },
        update: {
          physicalQuantity: product.stock,
          reservedQuantity: 0,
        },
        create: {
          id: `inventory-${product.id}`,
          productId: product.id,
          physicalQuantity: product.stock,
          reservedQuantity: 0,
        },
      }),
    ]);

    if (product.images.length > 0) {
      await prisma.productImage.createMany({
        data: product.images.map((url, index) => ({
          id: `${product.id}-image-${index + 1}`,
          productId: product.id,
          url,
          altText: `${product.name} imagen ${index + 1}`,
          sortOrder: index,
          isPrimary: index === 0,
        })),
      });
    }

    if (product.fullSpecs.length > 0) {
      await prisma.productSpecification.createMany({
        data: product.fullSpecs.map((spec, index) => ({
          id: `${product.id}-spec-${index + 1}`,
          productId: product.id,
          label: spec.label,
          value: spec.value,
          sortOrder: index,
          isHighlighted: highlightedSpecIndexes.has(index),
        })),
      });
    }
  }
}

async function main() {
  await seedCategories();
  await seedBrands();
  await seedProducts();

  const [
    categoryCount,
    brandCount,
    productCount,
    imageCount,
    specificationCount,
    inventoryCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.productImage.count(),
    prisma.productSpecification.count(),
    prisma.inventory.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        categories: categoryCount,
        brands: brandCount,
        products: productCount,
        images: imageCount,
        specifications: specificationCount,
        inventories: inventoryCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
