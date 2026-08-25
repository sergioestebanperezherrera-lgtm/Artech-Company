"use client";

import { Button } from "@/components/ui";
import type { Currency } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatPrice";

type CartSummaryProps = {
  subtotal: number;
  currency: Currency;
  isEmpty: boolean;
  isAuthenticated: boolean;
  onCheckout: () => void;
};

export function CartSummary({
  subtotal,
  currency,
  isEmpty,
  isAuthenticated,
  onCheckout,
}: CartSummaryProps) {
  return (
    <div className="border-t border-border-on-light pt-5">
      <div className="flex items-center justify-between gap-4 text-text-primary-on-light">
        <span className="text-sm font-medium">Subtotal</span>
        <span key={subtotal} className="cart-total-ticker text-lg font-medium">
          {formatPrice(subtotal, currency)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-text-secondary-on-light">
        {isAuthenticated
          ? "Revisa los productos y cantidades antes de continuar."
          : "Inicia sesión para continuar con tu carrito."}
      </p>
      {!isAuthenticated ? (
        <Button
          variant="primary-on-light"
          className="mt-5 w-full"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          Iniciar sesión para continuar
        </Button>
      ) : null}
    </div>
  );
}
