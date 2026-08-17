"use client";

import { useState } from "react";
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
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = () => {
    if (isEmpty || isProcessing) {
      return;
    }

    setMessage("");
    setIsProcessing(true);

    if (isAuthenticated) {
      setMessage("Compra mock preparada. El pago real se conectará con el backend.");
      setIsProcessing(false);
      return;
    }

    onCheckout();
    setIsProcessing(false);
  };

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
          ? "Compra mock lista para revisión. El cobro real queda pendiente de backend."
          : "Inicia sesión para continuar con la compra."}
      </p>
      <Button
        variant="primary-on-light"
        className="mt-5 w-full"
        disabled={isEmpty}
        isLoading={isProcessing}
        loadingLabel={isAuthenticated ? "Preparando compra..." : "Abriendo login..."}
        onClick={handleCheckout}
      >
        Proceder al pago
      </Button>
      {message ? (
        <p className="mt-3 text-sm text-text-secondary-on-light" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
