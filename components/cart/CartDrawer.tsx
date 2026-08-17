"use client";

import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { IconCircleButton, getButtonClassName } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { useCartStore } from "@/lib/stores/useCartStore";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { productService } from "@/lib/services/productService";
import { getCartSubtotal, resolveCartItems } from "@/lib/utils/cart";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
};

export function CartDrawer({ isOpen, onClose, onRequireAuth }: CartDrawerProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const resolvedItems = resolveCartItems(items, productService.getAll(), currency);
  const subtotal = getCartSubtotal(resolvedItems);

  if (!isOpen) {
    return null;
  }

  const handleCheckout = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar panel del carrito"
        className="cart-drawer-scrim fixed inset-0 z-[79] bg-black/50"
        onClick={onClose}
      />
      <aside
        aria-label="Carrito"
        className="cart-drawer-surface artech-dark-card fixed inset-y-0 right-0 z-[80] w-full max-w-sm bg-surface-card text-text-primary-on-light shadow-modal sm:w-[360px]"
      >
        <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border-on-light px-5">
          <h2 className="text-lg font-medium">Carrito</h2>
          <IconCircleButton
            aria-label="Cerrar carrito"
            icon={<X strokeWidth={1.5} />}
            surface="light"
            onClick={onClose}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {resolvedItems.length > 0 ? (
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
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag
                aria-hidden="true"
                size={38}
                strokeWidth={1.5}
                className="text-text-secondary-on-light"
              />
              <h3 className="mt-5 text-xl font-medium">Tu carrito está vacío</h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary-on-light">
                Agrega productos desde el catálogo para revisarlos aquí.
              </p>
              <Link
                href="/catalogo"
                onClick={onClose}
                className={getButtonClassName("primary-on-light", "mt-6")}
              >
                Ir al catálogo
              </Link>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <CartSummary
            subtotal={subtotal}
            currency={currency}
            isEmpty={resolvedItems.length === 0}
            isAuthenticated={Boolean(user)}
            onCheckout={handleCheckout}
          />
        </div>
        </div>
      </aside>
    </>
  );
}
