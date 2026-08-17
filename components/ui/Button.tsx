import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary-on-dark"
  | "primary-on-light"
  | "outline-on-dark"
  | "outline-on-light";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant;
  children: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
};

const buttonVariants: Record<ButtonVariant, string> = {
  "primary-on-dark":
    "bg-btn-primary-on-dark-bg text-btn-primary-on-dark-text hover:bg-text-secondary-on-dark",
  "primary-on-light":
    "bg-btn-primary-on-light-bg text-btn-primary-on-light-text hover:bg-text-secondary-on-light",
  "outline-on-dark":
    "border border-btn-outline-on-dark bg-transparent text-text-primary-on-dark hover:border-text-secondary-on-dark",
  "outline-on-light":
    "border border-btn-outline-on-light bg-transparent text-text-primary-on-light hover:border-text-secondary-on-light",
};

export function getButtonClassName(variant: ButtonVariant, className?: string) {
  return cn(
    "press-feedback inline-flex min-h-10 items-center justify-center rounded-pill px-5 py-2 text-sm font-medium tracking-normal",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  variant,
  children,
  className,
  type = "button",
  disabled,
  isLoading = false,
  loadingLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={getButtonClassName(variant, className)}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="button-loading-spinner" aria-hidden="true" />
          <span>{loadingLabel ?? "Procesando..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
