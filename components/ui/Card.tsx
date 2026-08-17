import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "artech-dark-card rounded-card bg-surface-card text-text-primary-on-light shadow-card",
        className,
      )}
      {...props}
    />
  );
});
