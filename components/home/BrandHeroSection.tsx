import Link from "next/link";
import { LogoMark } from "@/components/brand";
import { getButtonClassName } from "@/components/ui";
import { HeroVideoBackground } from "./HeroVideoBackground";

export function BrandHeroSection() {
  return (
    <section className="artech-hero-section relative isolate overflow-hidden px-4 text-text-primary-on-dark sm:px-6">
      <HeroVideoBackground />
      <div className="artech-hero-video-scrim" aria-hidden="true" />
      <div className="mx-auto grid min-h-[68svh] max-w-6xl items-center py-16 sm:min-h-[72svh] lg:grid-cols-[0.86fr_1.14fr] lg:py-20">
        <div className="relative z-10 max-w-3xl">
          <h1 className="hero-copy-reveal flex max-w-4xl items-center gap-3 text-5xl font-medium tracking-normal sm:gap-5 sm:text-7xl lg:text-8xl">
            <LogoMark className="shrink-0 text-[0.78em]" />
            <span>Artech</span>
          </h1>
          <p
            data-delay="1"
            className="hero-copy-reveal mt-5 max-w-3xl text-xl font-medium text-text-primary-on-dark sm:text-2xl"
          >
            Tecnología que impulsa tu futuro
          </p>
          <p
            data-delay="2"
            className="hero-copy-reveal mt-6 max-w-2xl text-base leading-7 text-text-secondary-on-dark sm:text-lg"
          >
            Una tienda de electrónica pensada para descubrir celulares, componentes y
            periféricos con una experiencia minimalista, moderna y fácil de recorrer.
          </p>
          <div
            data-delay="3"
            className="hero-copy-reveal mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/catalogo" className={getButtonClassName("primary-on-dark")}>
              Explorar catálogo
            </Link>
            <Link href="#ofertas" className={getButtonClassName("outline-on-dark")}>
              Ver ofertas
            </Link>
          </div>
        </div>

        <div className="pointer-events-none hidden min-h-[32rem] lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}
