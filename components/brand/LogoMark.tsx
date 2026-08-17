import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type LogoMarkProps = Omit<ComponentPropsWithoutRef<"span">, "children">;

export function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block font-medium leading-none", className)}
      {...props}
    >
      λ
    </span>
  );
}
