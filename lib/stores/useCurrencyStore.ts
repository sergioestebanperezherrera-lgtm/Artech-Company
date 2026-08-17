"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Currency } from "@/lib/types";

type CurrencyState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "GTQ",
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "artech-currency",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currency: state.currency }),
    },
  ),
);
