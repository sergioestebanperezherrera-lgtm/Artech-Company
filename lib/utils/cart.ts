import type { CartItem, Currency, Product } from "@/lib/types";
import { getProductPrice } from "./formatPrice";

export type ResolvedCartItem = CartItem & {
  product: Product;
  unitPrice: number;
  lineTotal: number;
};

export function resolveCartItems(
  cartItems: CartItem[],
  products: Product[],
  currency: Currency,
) {
  return cartItems
    .map((item): ResolvedCartItem | null => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        return null;
      }

      const unitPrice = getProductPrice(product, currency);

      return {
        ...item,
        product,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    })
    .filter((item): item is ResolvedCartItem => item !== null);
}

export function getCartSubtotal(items: ResolvedCartItem[]) {
  return items.reduce((subtotal, item) => subtotal + item.lineTotal, 0);
}
