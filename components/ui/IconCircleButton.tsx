import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type IconCircleButtonSize = "navbar" | "social";
type IconCircleButtonSurface = "dark" | "light";

type IconCircleButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  icon: ReactNode;
  size?: IconCircleButtonSize;
  surface?: IconCircleButtonSurface;
  "aria-label": string;
};

const sizeClasses: Record<IconCircleButtonSize, string> = {
  navbar: "size-8 [&_svg]:size-[15px]",
  social: "size-7 [&_svg]:size-[13px]",
};

const surfaceClasses: Record<IconCircleButtonSurface, string> = {
  dark: "border-border-on-dark text-text-primary-on-dark hover:border-text-secondary-on-dark",
  light:
    "border-border-on-light text-text-primary-on-light hover:border-text-secondary-on-light",
};

export function IconCircleButton({
  icon,
  size = "navbar",
  surface = "dark",
  className,
  type = "button",
  ...props
}: IconCircleButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "press-feedback inline-flex shrink-0 items-center justify-center rounded-full border bg-transparent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        surfaceClasses[surface],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
