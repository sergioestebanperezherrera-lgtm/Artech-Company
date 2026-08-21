"use client";

import { useEffect } from "react";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { cn } from "@/lib/utils/cn";

const currencies = ["GTQ"] as const;

export function CurrencySelector() {
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);

  useEffect(() => {
    if (currency !== "GTQ") {
      setCurrency("GTQ");
    }
  }, [currency, setCurrency]);

  return (
    <div
      aria-label="Selector de moneda"
      className="inline-flex rounded-pill border border-border-on-dark p-1"
    >
      {currencies.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={currency === item}
          onClick={() => setCurrency(item)}
          className={cn(
            "h-8 rounded-pill px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
            currency === item
              ? "bg-btn-primary-on-dark-bg text-btn-primary-on-dark-text"
              : "text-text-secondary-on-dark hover:text-text-primary-on-dark",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
