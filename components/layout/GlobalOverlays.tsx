"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/auth";
import { CartDrawer } from "@/components/cart";
import { useCartStore } from "@/lib/stores/useCartStore";
import type { Product } from "@/lib/types";

type AuthOpenEvent = CustomEvent<{
  redirectTo?: string;
}>;

type AddToCartEvent = CustomEvent<{
  productId: string;
  quantity?: number;
}>;

type GlobalOverlaysProps = {
  products: Product[];
};

export function GlobalOverlays({ products }: GlobalOverlaysProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>("/cuenta");

  useEffect(() => {
    const openCart = () => setIsCartOpen(true);
    const openAuth = (event: Event) => {
      const authEvent = event as AuthOpenEvent;
      setAuthRedirectTo(authEvent.detail?.redirectTo ?? "/cuenta");
      setIsAuthOpen(true);
    };
    const addToCart = (event: Event) => {
      const cartEvent = event as AddToCartEvent;

      if (!cartEvent.detail?.productId) {
        return;
      }

      addItem(cartEvent.detail.productId, cartEvent.detail.quantity ?? 1);
      setIsCartOpen(true);
    };

    window.addEventListener("artech:cart-open", openCart);
    window.addEventListener("artech:auth-open", openAuth);
    window.addEventListener("artech:add-to-cart", addToCart);

    return () => {
      window.removeEventListener("artech:cart-open", openCart);
      window.removeEventListener("artech:auth-open", openAuth);
      window.removeEventListener("artech:add-to-cart", addToCart);
    };
  }, [addItem]);

  return (
    <>
      <CartDrawer
        isOpen={isCartOpen}
        products={products}
        onClose={() => setIsCartOpen(false)}
        onRequireAuth={() => {
          setIsCartOpen(false);
          setAuthRedirectTo("/carrito");
          setIsAuthOpen(true);
        }}
      />
      <AuthPanel
        isOpen={isAuthOpen}
        redirectTo={authRedirectTo}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
}
