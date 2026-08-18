"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import type { Product } from "@/lib/types";
import { formatPrice, getProductPrice } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { ProductImage } from "./ProductImage";
import { RgbLightingFrame } from "./RgbLightingFrame";

type ProductCardProps = {
  product: Product;
  className?: string;
};

export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const currency = useCurrencyStore((state) => state.currency);
  const [isAdding, setIsAdding] = useState(false);
  const addResetTimer = useRef<number | null>(null);
  const isOutOfStock = product.stock === 0;
  const price = formatPrice(getProductPrice(product, currency), currency);
  const imagePlaceholder =
    product.images[0] ?? "/placeholders/productos/producto.png";
  const productHref = `/producto/${product.slug}`;

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

  const card = (
    <Card
      className={cn(
        "premium-hover group relative flex h-full min-w-0 flex-col overflow-hidden p-2 transition-[opacity,transform,box-shadow] sm:p-3",
        "hover:shadow-card-elevated motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0",
        isOutOfStock && "opacity-60",
        !product.hasRgbLighting && className,
      )}
    >
      <Link
        href={productHref}
        aria-label={`Ver detalle de ${product.name}`}
        className="artech-product-card-media relative block aspect-[4/3] overflow-hidden rounded-image-inset bg-surface-card-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-2 sm:left-3 sm:top-3">
          {product.discountPercent ? (
            <Badge variant="discount" label={`-${product.discountPercent}%`} />
          ) : null}
          {isOutOfStock ? (
            <Badge variant="outOfStock" label="Agotado" />
          ) : null}
        </div>

        <div className="artech-product-card-image flex h-full items-center justify-center px-3 text-center text-[11px] leading-4 text-text-secondary-on-dark transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:px-5 sm:text-xs sm:leading-5">
          {/* IMAGEN PRODUCTO AQUÍ: reemplazar con archivo del cliente. */}
          <ProductImage
            src={imagePlaceholder}
            alt={product.name}
            className="h-full w-full"
          />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-3 sm:pt-4">
        <Link
          href={productHref}
          className="block min-h-[7rem] rounded-input focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:min-h-[7.5rem]"
        >
          <h2 className="break-words text-sm font-medium leading-5 text-text-primary-on-light sm:text-base sm:leading-6">
            {product.name}
          </h2>
          <ul className="mt-3 grid gap-1 text-xs leading-5 text-text-secondary-on-light sm:text-sm">
            {product.shortSpecs.slice(0, 3).map((spec) => (
              <li className="break-words" key={spec}>
                {spec}
              </li>
            ))}
          </ul>
        </Link>

        <Link
          href={productHref}
          className="mt-4 block rounded-input break-words text-base font-medium text-text-primary-on-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-lg"
        >
          {price}
        </Link>

        <div className="mt-5 grid gap-2">
          <Button
            variant="outline-on-light"
            className="w-full px-3 text-[13px] leading-5 sm:px-4 sm:text-sm"
            onClick={() => router.push(productHref)}
          >
            Más información
          </Button>
          <Button
            variant="primary-on-light"
            className="w-full gap-2 px-3 text-[13px] leading-5 sm:px-4 sm:text-sm"
            disabled={isOutOfStock}
            isLoading={isAdding}
            loadingLabel="Añadiendo..."
            onClick={handleAddToCart}
          >
            <ShoppingCart aria-hidden="true" size={15} strokeWidth={1.5} />
            Añadir al carrito
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <RgbLightingFrame enabled={product.hasRgbLighting} className={className}>
      {card}
    </RgbLightingFrame>
  );
}
