"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { IconCircleButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type NavigationItem = {
  label: string;
  href: string;
};

type MobileMenuProps = {
  isOpen: boolean;
  items: NavigationItem[];
  onClose: () => void;
};

export function MobileMenu({ isOpen, items, onClose }: MobileMenuProps) {
  return (
    <div
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      className={cn(
        "fixed inset-x-0 top-[65px] z-40 border-b border-border-on-dark bg-bg-base/95 px-6 py-5 shadow-modal transition-[opacity,transform,backdrop-filter]",
        isOpen
          ? "translate-y-0 opacity-100 backdrop-blur-xl"
          : "pointer-events-none -translate-y-3 opacity-0 backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary-on-dark">
            Categorías
          </p>
          <IconCircleButton
            aria-label="Cerrar menú"
            icon={<X strokeWidth={1.5} />}
            onClick={onClose}
          />
        </div>
        <nav aria-label="Categorías mobile" className="grid gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-input px-1 py-2 text-base text-text-primary-on-dark transition-colors hover:text-text-secondary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
