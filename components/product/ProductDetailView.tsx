"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { AutoScrollCarousel } from "@/components/carousel";
import { Badge, Button } from "@/components/ui";
import type { Product } from "@/lib/types";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { formatPrice, getProductPrice } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "./ProductCard";
import { ProductGallery } from "./ProductGallery";
import { SpecsTable } from "./SpecsTable";

type ProductDetailViewProps = {
  product: Product;
  relatedProducts: Product[];
  categoryName: string;
};

export function ProductDetailView({
  product,
  relatedProducts,
  categoryName,
}: ProductDetailViewProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const [isAdding, setIsAdding] = useState(false);
  const addResetTimer = useRef<number | null>(null);
  const isOutOfStock = product.stock === 0;
  const price = formatPrice(getProductPrice(product, currency), currency);

  useEffect(() => {
    return () => {
      if (addResetTimer.current) {
        window.clearTimeout(addResetTimer.current);
      }
    };
  }, []);

  const handleAddToCart = () => {
    if (isOutOfStock || isAdding) {
      return;
    }

    setIsAdding(true);
    window.dispatchEvent(
      new CustomEvent("artech:add-to-cart", {
        detail: { productId: product.id, quantity: 1 },
      }),
    );

    addResetTimer.current = window.setTimeout(() => {
      setIsAdding(false);
    }, 450);
  };

  const infoCard = (
    <div className="artech-dark-card rounded-card bg-surface-card p-6 text-text-primary-on-light shadow-card">
      <div className="flex flex-wrap gap-2">
        {product.discountPercent ? (
          <Badge variant="discount" label={`-${product.discountPercent}%`} />
        ) : null}
        {isOutOfStock ? <Badge variant="outOfStock" label="Agotado" /> : null}
      </div>

      <h1 className="mt-5 text-3xl font-medium tracking-normal sm:text-5xl">
        {product.name}
      </h1>
      <p className="mt-4 text-2xl font-medium">{price}</p>

      <ul className="mt-6 grid gap-3 text-sm leading-6 text-text-secondary-on-light">
        {product.shortSpecs.map((spec) => (
          <li key={spec}>{spec}</li>
        ))}
      </ul>

      {isOutOfStock ? (
        <p className="mt-6 rounded-input border border-border-on-light px-4 py-3 text-sm text-text-secondary-on-light">
          Este producto está agotado. Puedes revisar sus detalles o explorar
          alternativas relacionadas.
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button
          variant="primary-on-light"
          className="w-full gap-2"
          disabled={isOutOfStock}
          isLoading={isAdding}
          loadingLabel="Añadiendo..."
          onClick={handleAddToCart}
        >
          <ShoppingCart aria-hidden="true" size={16} strokeWidth={1.5} />
          Añadir al carrito
        </Button>
        <Button
          variant="outline-on-light"
          className="w-full"
          onClick={() => {
            const reduceMotion = window.matchMedia(
              "(prefers-reduced-motion: reduce)",
            ).matches;

            const specsTitle = document.getElementById("product-specs-title");

            if (!specsTitle) {
              return;
            }

            const offsetTop =
              specsTitle.getBoundingClientRect().top + window.scrollY - 88;

            window.scrollTo({
              top: Math.max(0, offsetTop),
              behavior: reduceMotion ? "auto" : "smooth",
            });
          }}
        >
          Ver especificaciones
        </Button>
      </div>
    </div>
  );

  return (
    <main className="artech-page-shell min-h-screen px-6 py-10 text-text-primary-on-dark">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-2 text-sm text-text-secondary-on-dark"
        >
          <Link
            href="/"
            className="transition-colors hover:text-text-primary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/catalogo?categoria=${product.category}`}
            className="transition-colors hover:text-text-primary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {categoryName}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text-primary-on-dark">{product.name}</span>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <ProductGallery productName={product.name} images={product.images} />

          <div
            data-rgb-lighting={product.hasRgbLighting || undefined}
            className={cn("rounded-card", product.hasRgbLighting && "relative")}
          >
            {infoCard}
          </div>
        </section>

        <section className="mt-14">
          <SpecsTable specs={product.fullSpecs} />
        </section>

        <section className="mt-16 pb-12">
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium uppercase tracking-normal text-text-secondary-on-dark">
              Relacionados
            </p>
            <h2 className="text-2xl font-medium tracking-normal sm:text-3xl">
              También te puede interesar
            </h2>
          </div>

          {relatedProducts.length > 0 ? (
            <AutoScrollCarousel ariaLabel="También te puede interesar">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </AutoScrollCarousel>
          ) : (
            <div className="rounded-card border border-border-on-dark p-6 text-sm text-text-secondary-on-dark">
              No hay productos relacionados disponibles por ahora.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
