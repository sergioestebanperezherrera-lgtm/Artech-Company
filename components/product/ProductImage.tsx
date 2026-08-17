"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  placeholderText?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
  sizes?: string;
};

export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  placeholderText,
  loading = "lazy",
  priority = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px",
}: ProductImageProps) {
  const imageSrc = src;

  if (!imageSrc || imageSrc.includes("/placeholders/")) {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center justify-center text-center",
          className,
        )}
      >
        <span className="break-words">
          {placeholderText ?? `[IMAGEN PRODUCTO: ${imageSrc ?? "producto.png"}]`}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex min-w-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={alt}
        fill
        loading={priority ? undefined : loading}
        preload={priority}
        quality={86}
        sizes={sizes}
        draggable={false}
        className={cn("pointer-events-none max-h-full max-w-full object-contain", imageClassName)}
      />
    </span>
  );
}
