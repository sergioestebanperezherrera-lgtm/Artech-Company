"use client";

import Image from "next/image";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
  sizes?: string;
};

export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  loading = "lazy",
  priority = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px",
}: ProductImageProps) {
  const imageSrc = src;

  if (!isUsableProductImage(imageSrc)) {
    return (
      <span
        role="img"
        aria-label={`${alt}: imagen no disponible`}
        className={cn(
          "inline-flex min-w-0 items-center justify-center text-text-secondary-on-dark/55",
          className,
        )}
      >
        <PackageOpen aria-hidden="true" size={40} strokeWidth={1.25} />
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

export function isUsableProductImage(src?: string): src is string {
  return Boolean(src && !src.includes("/placeholders/"));
}

export function getFirstUsableProductImage(images: string[]) {
  return images.find(isUsableProductImage);
}
