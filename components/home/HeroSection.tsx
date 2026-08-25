"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ProductImage,
  getFirstUsableProductImage,
} from "@/components/product/ProductImage";
import { Badge, IconCircleButton } from "@/components/ui";
import type { Product } from "@/lib/types";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { formatPrice, getProductPrice } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";
import { CurrencySelector } from "./CurrencySelector";

type HeroSectionProps = {
  products: Product[];
};

const AUTO_SCROLL_INTERVAL = 4500;

function getSlideDescription(product: Product) {
  return product.shortSpecs.slice(0, 2).join(" · ");
}

export function HeroSection({ products }: HeroSectionProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const slides = useMemo(() => products.slice(0, 4), [products]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: slides.length > 1,
    dragFree: false,
  });

  const updateSelectedIndex = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const restartAutoScroll = useCallback(() => {
    setAutoScrollResetKey((currentKey) => currentKey + 1);
  }, []);

  const scrollPrev = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.scrollPrev();
    restartAutoScroll();
  }, [emblaApi, restartAutoScroll]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.scrollNext();
    restartAutoScroll();
  }, [emblaApi, restartAutoScroll]);

  const scrollTo = useCallback(
    (index: number) => {
      if (!emblaApi) {
        return;
      }

      emblaApi.scrollTo(index);
      restartAutoScroll();
    },
    [emblaApi, restartAutoScroll],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.on("select", updateSelectedIndex);
    emblaApi.on("reInit", updateSelectedIndex);

    return () => {
      emblaApi.off("select", updateSelectedIndex);
      emblaApi.off("reInit", updateSelectedIndex);
    };
  }, [emblaApi, updateSelectedIndex]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(motionQuery.matches);

    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!emblaApi || reduceMotion || slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoScrollResetKey, emblaApi, reduceMotion, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section
      id="ofertas"
      aria-label="Ofertas principales"
      aria-roledescription="carrusel"
      className="artech-offers-section px-4 pb-10 pt-4 text-text-primary-on-dark sm:px-6 sm:pb-14 sm:pt-5 lg:pb-16 lg:pt-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="discount" label="Ofertas principales" />
            <CurrencySelector />
          </div>
          <div className="hidden gap-2 sm:flex">
            <IconCircleButton
              aria-label="Oferta anterior"
              icon={<ChevronLeft strokeWidth={1.5} />}
              onClick={scrollPrev}
            />
            <IconCircleButton
              aria-label="Oferta siguiente"
              icon={<ChevronRight strokeWidth={1.5} />}
              onClick={scrollNext}
            />
          </div>
        </div>

        <div
          className="hero-materialize artech-offer-carousel-viewport overflow-hidden rounded-card-large"
          ref={emblaRef}
        >
          <div className="flex touch-pan-y">
            {slides.map((product, index) => {
              const price = formatPrice(getProductPrice(product, currency), currency);
              const imageSrc = getFirstUsableProductImage(product.images);

              return (
                <div
                  key={product.id}
                  className="artech-offer-slide min-w-0 flex-[0_0_100%]"
                  data-active={index === selectedIndex ? "true" : "false"}
                >
                  <Link
                    href={`/producto/${product.slug}`}
                    aria-label={`Ver oferta de ${product.name}`}
                    className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    <article
                      aria-label={`${index + 1} de ${slides.length}: ${product.name}`}
                      aria-roledescription="slide"
                      className="artech-liquid-glass artech-offer-card grid min-h-[520px] overflow-hidden rounded-card-large lg:grid-cols-[1fr_0.95fr]"
                    >
                      <div className="artech-offer-copy flex min-w-0 flex-col justify-center px-6 py-9 sm:px-10 lg:px-12">
                        <p className="artech-offer-eyebrow text-sm font-medium uppercase tracking-normal">
                          Campaña Artech
                        </p>
                        <h2 className="artech-offer-title mt-4 max-w-3xl text-4xl font-medium tracking-normal sm:text-6xl">
                          {product.name}
                        </h2>
                        <p className="artech-offer-description mt-5 max-w-xl text-base leading-7 sm:text-lg">
                          {getSlideDescription(product)}
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-4">
                          <span className="artech-offer-price text-2xl font-medium">
                            {price}
                          </span>
                          {product.discountPercent ? (
                            <Badge
                              variant="discount"
                              label={`-${product.discountPercent}%`}
                            />
                          ) : null}
                        </div>
                        <span className="artech-offer-cta mt-8 inline-flex min-h-10 w-max items-center justify-center rounded-pill px-5 py-2 text-sm font-medium">
                          Ver oferta
                        </span>
                      </div>

                      <div className="artech-offer-media-wrap p-3 lg:p-4">
                        <div className="artech-offer-product-stage flex h-full min-h-[240px] items-center justify-center rounded-image-inset px-6 text-center text-sm leading-6 sm:min-h-[320px]">
                          <ProductImage
                            src={imageSrc}
                            alt={product.name}
                            loading={index === 0 ? "eager" : "lazy"}
                            priority={index === 0}
                            sizes="(max-width: 640px) 78vw, (max-width: 1024px) 60vw, 520px"
                            className="artech-offer-product-placeholder h-full w-full"
                          />
                        </div>
                      </div>
                    </article>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {slides.map((product, index) => (
              <button
                key={product.id}
                type="button"
                aria-label={`Mostrar oferta ${index + 1}`}
                aria-current={index === selectedIndex ? "true" : undefined}
                className={cn(
                  "artech-offer-indicator h-1.5 w-6 rounded-pill",
                  index === selectedIndex
                    ? "bg-text-primary-on-dark"
                    : "bg-border-on-dark",
                )}
                data-state={index === selectedIndex ? "active" : "idle"}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>

          <div className="flex gap-2 sm:hidden">
            <IconCircleButton
              aria-label="Oferta anterior"
              icon={<ChevronLeft strokeWidth={1.5} />}
              onClick={scrollPrev}
            />
            <IconCircleButton
              aria-label="Oferta siguiente"
              icon={<ChevronRight strokeWidth={1.5} />}
              onClick={scrollNext}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
