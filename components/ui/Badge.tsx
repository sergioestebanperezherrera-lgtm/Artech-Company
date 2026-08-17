import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "discount" | "outOfStock";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant: BadgeVariant;
  label: string;
};

const badgeVariants: Record<BadgeVariant, string> = {
  discount: "bg-surface-panel-dark text-text-primary-on-dark",
  outOfStock:
    "border border-border-on-light bg-surface-card text-text-secondary-on-light",
};

export function Badge({ variant, label, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-pill px-3 py-1 text-xs font-medium tracking-normal",
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
