"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import {
  ProductImage,
  getFirstUsableProductImage,
} from "@/components/product/ProductImage";
import { IconCircleButton } from "@/components/ui";
import type { ResolvedCartItem } from "@/lib/utils/cart";
import { formatPrice } from "@/lib/utils/formatPrice";
import type { Currency } from "@/lib/types";

type CartItemProps = {
  item: ResolvedCartItem;
  currency: Currency;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
};

export function CartItem({
  item,
  currency,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const image = getFirstUsableProductImage(item.product.images);

  return (
    <article className="grid grid-cols-[72px_1fr] gap-3 rounded-card border border-border-on-light p-3">
      <div className="flex aspect-square items-center justify-center rounded-image-inset bg-surface-card-inset px-2 text-center text-[10px] leading-4 text-text-secondary-on-dark">
        <ProductImage
          src={image}
          alt={item.product.name}
          className="h-full w-full"
          sizes="72px"
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-text-primary-on-light">
          {item.product.name}
        </h3>
        <p className="mt-1 text-sm text-text-secondary-on-light">
          {formatPrice(item.unitPrice, currency)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconCircleButton
              aria-label={`Reducir cantidad de ${item.product.name}`}
              icon={<Minus strokeWidth={1.5} />}
              size="social"
              surface="light"
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            />
            <span
              key={item.quantity}
              className="cart-quantity-ticker min-w-5 text-center text-sm text-text-primary-on-light"
            >
              {item.quantity}
            </span>
            <IconCircleButton
              aria-label={`Aumentar cantidad de ${item.product.name}`}
              icon={<Plus strokeWidth={1.5} />}
              size="social"
              surface="light"
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            />
          </div>
          <IconCircleButton
            aria-label={`Eliminar ${item.product.name}`}
            icon={<Trash2 strokeWidth={1.5} />}
            size="social"
            surface="light"
            onClick={() => onRemove(item.productId)}
          />
        </div>
      </div>
    </article>
  );
}
