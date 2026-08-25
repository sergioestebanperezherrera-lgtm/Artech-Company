"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ProductImage, isUsableProductImage } from "./ProductImage";

type ProductGalleryProps = {
  productName: string;
  images: string[];
};

export function ProductGallery({ productName, images }: ProductGalleryProps) {
  const galleryImages = images.filter(isUsableProductImage);
  const [selectedImage, setSelectedImage] = useState(galleryImages[0]);
  const activeImage = selectedImage && galleryImages.includes(selectedImage)
    ? selectedImage
    : galleryImages[0];

  return (
    <section aria-label={`Galería de ${productName}`} className="grid gap-4">
      <div className="artech-dark-card rounded-card bg-surface-card p-3 shadow-card">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-image-inset bg-surface-card-inset p-6 text-text-secondary-on-dark sm:aspect-[4/3]">
          <ProductImage
            src={activeImage}
            alt={productName}
            className="h-full w-full transition-transform duration-300 ease-out hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
            sizes="(max-width: 1024px) 88vw, 560px"
            priority
          />
        </div>
      </div>

      {galleryImages.length > 1 ? (
        <div className="grid grid-cols-3 gap-3" aria-label="Miniaturas">
          {galleryImages.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={`Ver imagen ${index + 1} de ${productName}`}
              aria-pressed={activeImage === image}
              onClick={() => setSelectedImage(image)}
              className={cn(
                "artech-dark-card rounded-image-inset border bg-surface-card p-2 shadow-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
                activeImage === image
                  ? "border-text-primary-on-dark"
                  : "border-border-on-light",
              )}
            >
              <ProductImage
                src={image}
                alt={`${productName}, vista ${index + 1}`}
                className="aspect-square w-full rounded-input bg-surface-card-inset"
                sizes="160px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
