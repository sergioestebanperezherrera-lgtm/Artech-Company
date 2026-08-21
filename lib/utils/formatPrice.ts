import type { Currency, Product } from "@/lib/types";

export function getProductPrice(product: Product, currency: Currency) {
  if (currency === "USD" && product.priceUSD !== null) {
    return product.priceUSD;
  }

  return product.priceGTQ;
}

export function formatPrice(amount: number, currency: Currency) {
  const displayCurrency = currency === "USD" ? "GTQ" : currency;

  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: displayCurrency,
    minimumFractionDigits: 2,
  }).format(amount);
}
