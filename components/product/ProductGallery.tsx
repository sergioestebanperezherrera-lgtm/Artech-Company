"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type ProductGalleryProps = {
  productName: string;
  images: string[];
};

export function ProductGallery({ productName, images }: ProductGalleryProps) {
  const galleryImages =
    images.length > 0 ? images : ["/placeholders/productos/producto.png"];
  const [selectedImage, setSelectedImage] = useState(galleryImages[0]);

  return (
    <section aria-label={`Galería de ${productName}`} className="grid gap-4">
      <div className="artech-dark-card rounded-card bg-surface-card p-3 shadow-card">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-image-inset bg-surface-card-inset px-6 text-center text-sm leading-6 text-text-secondary-on-dark sm:aspect-[4/3]">
          {/* IMAGEN PRODUCTO AQUÍ: reemplazar con archivo del cliente. */}
          <span className="transition-transform duration-300 ease-out hover:scale-[1.03] hover:rotate-1 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0">
            [IMAGEN PRODUCTO: {productName}]
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3" aria-label="Miniaturas">
        {galleryImages.map((image, index) => (
          <button
            key={image}
            type="button"
            aria-label={`Ver imagen ${index + 1} de ${productName}`}
            aria-pressed={selectedImage === image}
            onClick={() => setSelectedImage(image)}
            className={cn(
              "artech-dark-card rounded-image-inset border bg-surface-card p-2 shadow-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
              selectedImage === image
                ? "border-text-primary-on-dark"
                : "border-border-on-light",
            )}
          >
            <span className="flex aspect-square items-center justify-center rounded-input bg-surface-card-inset px-2 text-center text-[10px] leading-4 text-text-secondary-on-dark">
              {/* MINIATURA PRODUCTO AQUÍ: reemplazar con archivo del cliente. */}
              [IMAGEN {index + 1}]
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
