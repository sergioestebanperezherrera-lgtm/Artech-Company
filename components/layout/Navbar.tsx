"use client";

import {
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingCart, User } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { IconCircleButton } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { useCartStore } from "@/lib/stores/useCartStore";
import type { Brand, Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { matchesSearchQuery } from "@/lib/utils/search";
import { MobileMenu, type NavigationItem } from "./MobileMenu";

const navigationItems: NavigationItem[] = [
  { label: "Celulares", href: "/catalogo?categoria=celulares" },
  { label: "GPU", href: "/catalogo?categoria=tarjetas-graficas" },
  { label: "CPU/RAM", href: "/catalogo?categoria=cpu-ram" },
  { label: "Monitores", href: "/catalogo?categoria=monitores" },
  { label: "Periféricos", href: "/catalogo?categoria=perifericos" },
];


type NavbarProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

export function Navbar({ products, categories, brands }: NavbarProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) =>
    state.items.reduce((count, item) => count + item.quantity, 0),
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [query, setQuery] = useState("");

  const activeSearchScopes = useMemo(
    () => [
      ...products.map((product) => ({
        label: product.name,
        href: `/producto/${product.slug}`,
        meta: "Producto",
      })),
      ...categories.map((category) => ({
        label: category.name,
        href: `/catalogo?categoria=${category.id}`,
        meta: "Categoría",
      })),
      ...brands.map((brand) => ({
        label: brand.name,
        href: `/catalogo?buscar=${encodeURIComponent(brand.name)}`,
        meta: "Marca",
      })),
    ],
    [brands, categories, products],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return activeSearchScopes
      .filter((scope) => matchesSearchQuery(`${scope.label} ${scope.meta}`, query))
      .slice(0, 6);
  }, [activeSearchScopes, query]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setQuery("");
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      router.push(`/catalogo?buscar=${encodeURIComponent(normalizedQuery)}`);
      closeSearch();
    }
  };

  const handleAccountClick = () => {
    if (user) {
      router.push("/cuenta");
      return;
    }

    window.dispatchEvent(new CustomEvent("artech:auth-open"));
  };

  const handleCartClick = () => {
    window.dispatchEvent(new CustomEvent("artech:cart-open"));
  };

  const handleGlassPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    event.currentTarget.style.setProperty("--glass-x", `${x.toFixed(2)}%`);
    event.currentTarget.style.setProperty("--glass-y", `${y.toFixed(2)}%`);
  };

  const handleGlassPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--glass-x", "50%");
    event.currentTarget.style.setProperty("--glass-y", "0%");
  };

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch, isSearchOpen]);

  useEffect(() => {
    let animationFrame = 0;

    const updateScrollState = () => {
      animationFrame = 0;
      const scrollProgress = Math.min(window.scrollY / 120, 1);
      const header = headerRef.current;

      if (header) {
        header.style.setProperty("--glass-scroll-progress", scrollProgress.toFixed(3));
        header.style.setProperty(
          "--glass-current-bg-opacity",
          (0.28 + 0.18 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-current-border-opacity",
          (0.09 + 0.13 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-current-highlight-opacity",
          (0.16 + 0.08 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-current-blur",
          `${(18 + 10 * scrollProgress).toFixed(2)}px`,
        );
        header.style.setProperty(
          "--glass-current-shadow-opacity",
          (0.18 + 0.14 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-reflection-opacity",
          (0.42 + 0.18 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-edge-soft-opacity",
          (0.2 + 0.22 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-edge-strong-opacity",
          (0.34 + 0.16 * scrollProgress).toFixed(3),
        );
        header.style.setProperty(
          "--glass-edge-opacity",
          (0.38 + 0.34 * scrollProgress).toFixed(3),
        );
      }
      setHasScrolled(window.scrollY > 12);
    };

    const requestScrollUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", requestScrollUpdate);
    };
  }, []);

  const glassStyle = {
    "--glass-scroll-progress": "0",
    "--glass-current-bg-opacity": "0.28",
    "--glass-current-border-opacity": "0.09",
    "--glass-current-highlight-opacity": "0.16",
    "--glass-current-blur": "18px",
    "--glass-current-shadow-opacity": "0.18",
    "--glass-reflection-opacity": "0.42",
    "--glass-edge-soft-opacity": "0.2",
    "--glass-edge-strong-opacity": "0.34",
    "--glass-edge-opacity": "0.38",
    "--glass-x": "50%",
    "--glass-y": "0%",
  } as CSSProperties;

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled={hasScrolled ? "true" : "false"}
        style={glassStyle}
        className="hero-materialize artech-liquid-glass artech-navbar-glass sticky top-0 z-50"
        onPointerLeave={handleGlassPointerLeave}
        onPointerMove={handleGlassPointerMove}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
            <IconCircleButton
              aria-label="Abrir menú"
              icon={<Menu strokeWidth={1.5} />}
              className="artech-liquid-glass-control lg:hidden"
              onClick={() => setIsMenuOpen((current) => !current)}
            />
            <Link
              href="/"
              className="artech-navbar-logo flex items-center gap-2 text-text-primary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              onClick={() => setIsMenuOpen(false)}
            >
              <LogoMark className="text-2xl" />
              <span className="text-base font-medium tracking-normal">
                Artech
              </span>
            </Link>
          </div>

          <nav
            aria-label="Categorías"
            className="hidden flex-1 items-center justify-center gap-6 lg:flex"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="artech-navbar-link text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex items-center justify-end gap-2">
            <form
              role="search"
              aria-hidden={!isSearchOpen}
              inert={!isSearchOpen ? true : undefined}
              onSubmit={handleSearchSubmit}
              className={cn(
                "absolute right-[88px] top-1/2 hidden -translate-y-1/2 items-center transition-[opacity,width] sm:flex",
                isSearchOpen
                  ? "w-64 opacity-100"
                  : "pointer-events-none w-0 opacity-0",
              )}
            >
              <label htmlFor="site-search" className="sr-only">
                Buscar productos
              </label>
              <input
                id="site-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                className="artech-liquid-glass-field h-9 w-full rounded-pill px-4 text-sm text-text-primary-on-dark placeholder:text-text-secondary-on-dark"
              />
              {isSearchOpen && query.trim() ? (
                <div className="artech-liquid-glass-popover absolute right-0 top-11 w-72 rounded-card p-3">
                  {searchResults.length > 0 ? (
                    <ul className="grid gap-1">
                      {searchResults.map((result) => (
                        <li key={result.href + result.label}>
                          <Link
                            href={result.href}
                            onClick={closeSearch}
                            className="block rounded-input px-3 py-2 text-sm text-text-primary-on-dark transition-colors hover:bg-surface-panel-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                          >
                            <span>{result.label}</span>
                            <span className="ml-2 text-xs text-text-secondary-on-dark">
                              {result.meta}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-sm text-text-secondary-on-dark">
                      Sin resultados por ahora.
                    </p>
                  )}
                </div>
              ) : null}
            </form>

            <IconCircleButton
              aria-label="Buscar"
              icon={<Search strokeWidth={1.5} />}
              className="artech-liquid-glass-control"
              onClick={() => setIsSearchOpen((current) => !current)}
            />
            <IconCircleButton
              aria-label="Cuenta"
              icon={<User strokeWidth={1.5} />}
              className="artech-liquid-glass-control"
              onClick={handleAccountClick}
            />
            <div className="relative">
              <IconCircleButton
                aria-label="Carrito"
                icon={<ShoppingCart strokeWidth={1.5} />}
                className="artech-liquid-glass-control"
                onClick={handleCartClick}
              />
              {cartCount > 0 ? (
                <span
                  key={cartCount}
                  aria-live="polite"
                  className="cart-count-pop absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-btn-primary-on-dark-bg text-[10px] font-medium text-btn-primary-on-dark-text"
                >
                  {cartCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isSearchOpen ? (
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="artech-navbar-mobile-search px-4 py-3 sm:hidden"
          >
            <label htmlFor="site-search-mobile" className="sr-only">
              Buscar productos
            </label>
            <input
              id="site-search-mobile"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar"
              className="artech-liquid-glass-field h-10 w-full rounded-pill px-4 text-base text-text-primary-on-dark placeholder:text-text-secondary-on-dark"
            />
            {query.trim() ? (
              <div className="artech-liquid-glass-popover mt-3 rounded-card p-3">
                {searchResults.length > 0 ? (
                  <ul className="grid gap-1">
                    {searchResults.map((result) => (
                      <li key={result.href + result.label}>
                        <Link
                          href={result.href}
                          onClick={closeSearch}
                          className="block rounded-input px-3 py-2 text-sm text-text-primary-on-dark transition-colors hover:bg-surface-panel-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                        >
                          <span>{result.label}</span>
                          <span className="ml-2 text-xs text-text-secondary-on-dark">
                            {result.meta}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-sm text-text-secondary-on-dark">
                    Sin resultados por ahora.
                  </p>
                )}
              </div>
            ) : null}
          </form>
        ) : null}
      </header>

      <MobileMenu
        isOpen={isMenuOpen}
        items={navigationItems}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
