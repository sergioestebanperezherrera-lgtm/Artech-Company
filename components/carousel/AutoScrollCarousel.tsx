"use client";

import { Children, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconCircleButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type AutoScrollCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

const AUTO_SCROLL_INTERVAL = 3500;
const slideOpacity = ["opacity-100", "opacity-75", "opacity-60", "opacity-45"];

function getForwardDistance(index: number, selectedIndex: number, slideCount: number) {
  return (index - selectedIndex + slideCount) % slideCount;
}

export function AutoScrollCarousel({
  children,
  ariaLabel,
  className,
}: AutoScrollCarouselProps) {
  const slides = useMemo(() => Children.toArray(children), [children]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
  });

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const updateSelectedIndex = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

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
    if (!emblaApi || isPaused || reduceMotion || slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [emblaApi, isPaused, reduceMotion, slides.length]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);

  return (
    <section
      aria-label={ariaLabel}
      className={cn("relative", className)}
      onMouseDown={pause}
      onMouseLeave={resume}
      onMouseUp={resume}
      onTouchEnd={resume}
      onTouchStart={pause}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, index) => {
            const distance = getForwardDistance(index, selectedIndex, slides.length);
            const opacityClass = slideOpacity[Math.min(distance, slideOpacity.length - 1)];

            return (
              <div
                key={index}
                className={cn(
                  "min-w-0 flex-[0_0_78%] pl-4 transition-opacity duration-500 ease-out sm:flex-[0_0_45%] lg:flex-[0_0_25%]",
                  opacityClass,
                )}
              >
                {slide}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-2" aria-hidden="true">
          {slides.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 w-6 rounded-pill transition-colors",
                index === selectedIndex
                  ? "bg-text-primary-on-dark"
                  : "bg-border-on-dark",
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <IconCircleButton
            aria-label="Producto anterior"
            icon={<ChevronLeft strokeWidth={1.5} />}
            onClick={scrollPrev}
          />
          <IconCircleButton
            aria-label="Producto siguiente"
            icon={<ChevronRight strokeWidth={1.5} />}
            onClick={scrollNext}
          />
        </div>
      </div>
    </section>
  );
}
