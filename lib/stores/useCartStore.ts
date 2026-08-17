"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

type CartState = {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (productId, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.productId === productId);

          if (!existingItem) {
            return {
              items: [...state.items, { productId, quantity }],
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            ),
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.productId !== productId)
              : state.items.map((item) =>
                  item.productId === productId ? { ...item, quantity } : item,
                ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "artech-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
