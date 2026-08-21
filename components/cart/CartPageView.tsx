"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { getButtonClassName } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { useCartStore } from "@/lib/stores/useCartStore";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import type { Product } from "@/lib/types";
import { getCartSubtotal, resolveCartItems } from "@/lib/utils/cart";

type CartPageViewProps = {
  products: Product[];
};

export function CartPageView({ products }: CartPageViewProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const resolvedItems = resolveCartItems(items, products, currency);
  const subtotal = getCartSubtotal(resolvedItems);

  const handleCheckout = () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("artech:auth-open", {
          detail: { redirectTo: "/carrito" },
        }),
      );
    }
  };

  return (
    <main className="artech-page-shell min-h-screen px-6 py-10 text-text-primary-on-dark">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-medium sm:text-5xl">Carrito</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary-on-dark">
          Revisa productos y cantidades antes de continuar.
        </p>

        <div className="artech-dark-card mt-8 rounded-card bg-surface-card p-5 text-text-primary-on-light shadow-card">
          {resolvedItems.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="grid gap-3">
                {resolvedItems.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    currency={currency}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>
              <CartSummary
                subtotal={subtotal}
                currency={currency}
                isEmpty={false}
                isAuthenticated={Boolean(user)}
                onCheckout={handleCheckout}
              />
            </div>
          ) : (
            <div className="py-14 text-center">
              <ShoppingBag
                aria-hidden="true"
                size={42}
                strokeWidth={1.5}
                className="mx-auto text-text-secondary-on-light"
              />
              <h2 className="mt-5 text-xl font-medium">Tu carrito está vacío</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary-on-light">
                Cuando agregues productos, aparecerán aquí para revisar cantidades
                y subtotal.
              </p>
              <Link
                href="/catalogo"
                className={getButtonClassName("primary-on-light", "mt-7")}
              >
                Explorar catálogo
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
