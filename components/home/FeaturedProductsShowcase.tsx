"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/motion";
import { ProductImage } from "@/components/product/ProductImage";
import { RgbLightingFrame } from "@/components/product/RgbLightingFrame";
import type { Category, Product } from "@/lib/types";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { cn } from "@/lib/utils/cn";
import { formatPrice, getProductPrice } from "@/lib/utils/formatPrice";
import { SectionHeader } from "./SectionHeader";

type SpotlightReason = "new" | "featured" | "monthlyBestSeller";

type FeaturedProductsShowcaseProps = {
  categories: Category[];
  products: Product[];
};

const spotlightLabels: Record<SpotlightReason, string> = {
  new: "Nuevo",
  featured: "Destacado",
  monthlyBestSeller: "Más vendido del mes",
};

function getProductImageLabel(product: Product) {
  return product.images[0] ?? "/placeholders/productos/producto.png";
}

function getProductLighting(product: Product) {
  if (product.category === "tarjetas-graficas") {
    return "gpu";
  }

  if (product.category === "cpu-ram") {
    return product.name.toLowerCase().includes("memoria") ? "ram" : "cpu";
  }

  if (product.category === "monitores") {
    return "monitor";
  }

  if (product.category === "celulares") {
    return "phone";
  }

  return "default";
}

function selectSpotlight(products: Product[]) {
  const product =
    products.find((candidate) => candidate.hasRgbLighting) ??
    products.find((candidate) => candidate.discountPercent !== null) ??
    products[0];

  return {
    product,
    reason: "featured" as SpotlightReason,
  };
}

export function FeaturedProductsShowcase({
  categories,
  products,
}: FeaturedProductsShowcaseProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const spotlight = selectSpotlight(products);

  if (!spotlight.product) {
    return null;
  }

  const spotlightProduct = spotlight.product;
  const secondaryProducts = products
    .filter((product) => product.id !== spotlightProduct.id)
    .slice(0, 4);
  const spotlightPrice = formatPrice(
    getProductPrice(spotlightProduct, currency),
    currency,
  );
  const spotlightCategory =
    categoryNames.get(spotlightProduct.category) ?? "Producto";

  return (
    <section className="artech-featured-products-section px-4 py-16 text-text-primary-on-dark sm:px-6 lg:py-20">
      <ScrollReveal
        aria-hidden="true"
        className="artech-featured-atmosphere"
        delay={80}
      >
        <svg
          className="artech-featured-atmosphere-map"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <filter id="featuredNodeGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="featuredFilamentFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="28%" stopColor="white" stopOpacity="0.22" />
              <stop offset="62%" stopColor="white" stopOpacity="0.1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="featuredTerrainFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="18%" stopColor="white" stopOpacity="0.08" />
              <stop offset="50%" stopColor="white" stopOpacity="0.19" />
              <stop offset="86%" stopColor="white" stopOpacity="0.06" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="artech-featured-filaments">
            <path d="M70 248 C220 128 372 220 528 148 S918 52 1302 188" />
            <path d="M172 412 C338 270 548 350 702 256 S1024 204 1340 92" />
            <path d="M182 640 C380 512 580 586 758 480 S1044 328 1372 386" />
            <path d="M26 722 C252 616 420 692 638 604 S1092 468 1424 546" />
            <path d="M640 88 C734 232 872 260 1008 214 S1240 184 1440 246" />
          </g>

          <g className="artech-featured-node-field">
            <circle className="artech-featured-node artech-featured-node-main" cx="732" cy="174" r="2.8" />
            <circle className="artech-featured-node artech-featured-node-main" cx="1118" cy="212" r="2.4" />
            <circle className="artech-featured-node artech-featured-node-main" cx="344" cy="728" r="2.2" />
            <circle className="artech-featured-node artech-featured-node-mid" cx="184" cy="246" r="1.6" />
            <circle className="artech-featured-node artech-featured-node-mid" cx="518" cy="156" r="1.4" />
            <circle className="artech-featured-node artech-featured-node-mid" cx="904" cy="252" r="1.5" />
            <circle className="artech-featured-node artech-featured-node-mid" cx="1264" cy="354" r="1.5" />
            <circle className="artech-featured-node artech-featured-node-mid" cx="578" cy="604" r="1.4" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="264" cy="198" r="0.8" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="604" cy="116" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="834" cy="142" r="0.75" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="1048" cy="166" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="1218" cy="244" r="0.9" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="116" cy="462" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="438" cy="412" r="0.8" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="652" cy="396" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="866" cy="522" r="0.8" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="1088" cy="496" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="1314" cy="612" r="0.8" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="462" cy="786" r="0.75" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="780" cy="746" r="0.7" />
            <circle className="artech-featured-node artech-featured-node-micro" cx="1012" cy="802" r="0.8" />
          </g>

          <g className="artech-featured-terrain">
            <path d="M0 772 C178 724 302 766 480 728 S812 690 1018 722 S1282 802 1440 742" />
            <path d="M56 812 C210 764 384 820 540 786 S828 728 1018 768 S1284 830 1404 792" />
            <path d="M132 850 C308 818 436 860 620 828 S892 786 1098 820 S1320 864 1440 842" />
            <path d="M254 742 C394 704 532 744 672 716 S912 674 1118 708" />
            <path d="M474 872 C628 828 832 856 968 836 S1192 812 1354 846" />
            <circle className="artech-featured-terrain-node" cx="314" cy="766" r="1.2" />
            <circle className="artech-featured-terrain-node" cx="628" cy="724" r="1" />
            <circle className="artech-featured-terrain-node" cx="1018" cy="722" r="1.4" />
            <circle className="artech-featured-terrain-node" cx="1248" cy="812" r="1.1" />
          </g>
        </svg>
      </ScrollReveal>

      <div className="relative z-10 mx-auto max-w-6xl">
        <ScrollReveal>
          <SectionHeader
            eyebrow="Novedades"
            title="Productos destacados"
            description="Una selección rápida de piezas relevantes para descubrir y comprar sin perder el ritmo."
          />
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <ScrollReveal className="h-full" delay={140}>
            <RgbLightingFrame
              enabled={spotlightProduct.hasRgbLighting}
              className="rounded-card-large"
            >
              <article
                className="artech-liquid-glass artech-product-glass-card artech-product-glass-card-featured group h-full rounded-card-large p-4 sm:p-5"
                data-product-lighting={getProductLighting(spotlightProduct)}
              >
                <div className="relative z-10 flex h-full min-h-[30rem] flex-col sm:min-h-[34rem]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="artech-glass-badge">
                        {spotlightLabels[spotlight.reason]}
                      </span>
                      <span className="text-xs text-text-secondary-on-dark">
                        {spotlightCategory}
                      </span>
                    </div>
                    {spotlightProduct.discountPercent ? (
                      <span className="artech-glass-badge">
                        -{spotlightProduct.discountPercent}%
                      </span>
                    ) : null}
                  </div>

                  <div className="artech-featured-product-stage mt-6 flex flex-1 items-center justify-center rounded-card">
                    <ProductImage
                      src={getProductImageLabel(spotlightProduct)}
                      alt={spotlightProduct.name}
                      sizes="(max-width: 640px) 82vw, (max-width: 1024px) 50vw, 520px"
                      className="relative z-10 h-full w-full max-w-[92%] text-xs leading-5 text-text-secondary-on-dark"
                    />
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="min-w-0">
                      <h3 className="text-3xl font-medium tracking-normal sm:text-4xl">
                        {spotlightProduct.name}
                      </h3>
                      <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary-on-dark">
                        {spotlightProduct.shortSpecs.slice(0, 2).join(" · ")}
                      </p>
                      <p className="mt-5 text-2xl font-medium">{spotlightPrice}</p>
                    </div>
                    <Link
                      href={`/producto/${spotlightProduct.slug}`}
                      aria-label={`Ver producto ${spotlightProduct.name}`}
                      className="artech-glass-cta"
                    >
                      Ver producto
                      <ArrowRight aria-hidden="true" size={15} strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              </article>
            </RgbLightingFrame>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
            {secondaryProducts.map((product, index) => {
              const price = formatPrice(getProductPrice(product, currency), currency);
              const categoryName = categoryNames.get(product.category) ?? "Producto";
              const isOutOfStock = product.stock === 0;

              const card = (
                <Link
                  href={`/producto/${product.slug}`}
                  aria-label={`Ver producto ${product.name}`}
                  className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  <article
                    className={cn(
                      "artech-liquid-glass artech-product-glass-card artech-product-glass-card-secondary h-full rounded-card p-3",
                      isOutOfStock && "opacity-70",
                    )}
                    data-product-lighting={getProductLighting(product)}
                  >
                    <div className="relative z-10 flex h-full min-h-[15rem] flex-col sm:min-h-[16rem]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="artech-glass-badge">{categoryName}</span>
                        {isOutOfStock ? (
                          <span className="text-xs text-text-secondary-on-dark">
                            Agotado
                          </span>
                        ) : null}
                      </div>

                      <div className="artech-featured-product-stage mt-4 flex flex-1 items-center justify-center rounded-image-inset">
                        <ProductImage
                          src={getProductImageLabel(product)}
                          alt={product.name}
                          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 38vw, 220px"
                          className="relative z-10 h-full w-full max-w-[92%] text-[11px] leading-4 text-text-secondary-on-dark"
                        />
                      </div>

                      <div className="mt-4">
                        <h3 className="line-clamp-2 text-base font-medium leading-6">
                          {product.name}
                        </h3>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-base font-medium">{price}</p>
                          <ArrowRight
                            aria-hidden="true"
                            className="artech-product-card-arrow"
                            size={15}
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              );

              return (
                <ScrollReveal key={product.id} className="h-full" delay={260 + index * 80}>
                  <RgbLightingFrame
                    enabled={product.hasRgbLighting}
                    className="rounded-card"
                  >
                    {card}
                  </RgbLightingFrame>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
