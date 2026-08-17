import type { Currency, Product } from "@/lib/types";

export function getProductPrice(product: Product, currency: Currency) {
  return currency === "GTQ" ? product.priceGTQ : product.priceUSD;
}

export function formatPrice(amount: number, currency: Currency) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
