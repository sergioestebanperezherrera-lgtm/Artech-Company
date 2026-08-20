import { AppError } from "../../errors/app-error";
import {
  findActiveProductBySlug,
  findActiveProducts,
  type ProductRecord,
} from "./products.repository";

type ApiProductSpec = {
  label: string;
  value: string;
};

export type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  priceGTQ: number;
  priceUSD: number | null;
  discountPercent: number | null;
  shortSpecs: string[];
  fullSpecs: ApiProductSpec[];
  images: string[];
  stock: number;
  hasRgbLighting: boolean;
};

function decimalToNumber(value: ProductRecord["price"]) {
  return Number(value.toFixed(2));
}

function calculateDiscountPercent(
  price: ProductRecord["price"],
  previousPrice: ProductRecord["previousPrice"],
) {
  if (!previousPrice) {
    return null;
  }

  const current = decimalToNumber(price);
  const previous = decimalToNumber(previousPrice);

  if (previous <= 0 || current >= previous) {
    return null;
  }

  return Math.round(((previous - current) / previous) * 100);
}

function calculateStock(product: ProductRecord) {
  if (!product.inventory) {
    return 0;
  }

  return Math.max(
    0,
    product.inventory.physicalQuantity - product.inventory.reservedQuantity,
  );
}

function mapPriceUsd() {
  return null;
}

function formatShortSpec(specification: ProductRecord["specifications"][number]) {
  const lowerLabel = specification.label.toLowerCase();

  if (lowerLabel === "núcleos" || lowerLabel === "nucleos" || lowerLabel === "hilos") {
    return `${specification.value} ${lowerLabel}`;
  }

  if (
    lowerLabel === "socket" ||
    lowerLabel === "resolución" ||
    lowerLabel === "resolucion" ||
    lowerLabel === "iluminación" ||
    lowerLabel === "iluminacion"
  ) {
    return `${specification.label} ${specification.value}`;
  }

  return specification.value;
}

function mapProduct(product: ProductRecord): ApiProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category.slug,
    brand: product.brand?.slug ?? null,
    priceGTQ: decimalToNumber(product.price),
    priceUSD: mapPriceUsd(),
    discountPercent: calculateDiscountPercent(product.price, product.previousPrice),
    shortSpecs: product.specifications
      .filter((specification) => specification.isHighlighted)
      .map(formatShortSpec),
    fullSpecs: product.specifications.map((specification) => ({
      label: specification.label,
      value: specification.value,
    })),
    images: product.images.map((image) => image.url),
    stock: calculateStock(product),
    hasRgbLighting: product.hasRgbLighting,
  };
}

export async function getProducts() {
  const products = await findActiveProducts();
  return products.map(mapProduct);
}

export async function getProductBySlug(slug: string) {
  const product = await findActiveProductBySlug(slug);

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return mapProduct(product);
}
