"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, SearchX, X } from "lucide-react";
import { Button, IconCircleButton } from "@/components/ui";
import { ProductCard } from "@/components/product";
import type { Brand, Category, Product } from "@/lib/types";
import { useCurrencyStore } from "@/lib/stores/useCurrencyStore";
import { getProductPrice } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";
import { matchesSearchQuery } from "@/lib/utils/search";
import { FilterPanel, type CatalogFilters, type SpecOption } from "./FilterPanel";
import { Pagination } from "./Pagination";

type CatalogViewProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  initialCategory?: string;
  initialSearch?: string;
};

const ITEMS_PER_PAGE = 6;

function createSpecId(label: string, value: string) {
  return `${label}:${value}`;
}

function createEmptyFilters(initialCategory?: string): CatalogFilters {
  return {
    categories: initialCategory ? [initialCategory] : [],
    brands: [],
    minPrice: "",
    maxPrice: "",
    specs: [],
    inStockOnly: false,
  };
}

export function CatalogView({
  products,
  categories,
  brands,
  initialCategory,
  initialSearch = "",
}: CatalogViewProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const [filters, setFilters] = useState<CatalogFilters>(() =>
    createEmptyFilters(initialCategory),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterCloseRef = useRef<HTMLButtonElement | null>(null);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const brandNameById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  );
  const searchQuery = initialSearch.trim();

  useEffect(() => {
    if (!isMobileFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileFilterOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => mobileFilterCloseRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileFilterOpen]);

  const specSourceProducts = useMemo(() => {
    if (filters.categories.length === 0) {
      return [];
    }

    return products.filter((product) => filters.categories.includes(product.category));
  }, [filters.categories, products]);

  const specOptions = useMemo<SpecOption[]>(() => {
    const options = new Map<string, SpecOption>();

    for (const product of specSourceProducts) {
      for (const spec of product.fullSpecs) {
        const id = createSpecId(spec.label, spec.value);
        options.set(id, { id, label: `${spec.label}: ${spec.value}` });
      }
    }

    return Array.from(options.values());
  }, [specSourceProducts]);

  const filteredProducts = useMemo(() => {
    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;

    return products.filter((product) => {
      const categoryName = categoryNameById.get(product.category) ?? product.category;
      const brandName = brandNameById.get(product.brand) ?? product.brand;
      const searchableText = [
        product.name,
        categoryName,
        brandName,
        product.category,
        product.brand,
        ...product.shortSpecs,
      ].join(" ");
      const productPrice = getProductPrice(product, currency);
      const productSpecIds = product.fullSpecs.map((spec) =>
        createSpecId(spec.label, spec.value),
      );

      return (
        (!searchQuery || matchesSearchQuery(searchableText, searchQuery)) &&
        (filters.categories.length === 0 ||
          filters.categories.includes(product.category)) &&
        (filters.brands.length === 0 || filters.brands.includes(product.brand)) &&
        (minPrice === null || productPrice >= minPrice) &&
        (maxPrice === null || productPrice <= maxPrice) &&
        (!filters.inStockOnly || product.stock > 0) &&
        (filters.specs.length === 0 ||
          filters.specs.every((spec) => productSpecIds.includes(spec)))
      );
    });
  }, [
    brandNameById,
    categoryNameById,
    currency,
    filters,
    searchQuery,
    products,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const updateFilters = (nextFilters: CatalogFilters) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(createEmptyFilters());
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="artech-page-shell min-h-screen px-4 py-10 text-text-primary-on-dark sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-border-on-dark pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-normal text-text-secondary-on-dark">
              Catálogo
            </p>
            <h1 className="text-3xl font-medium tracking-normal sm:text-5xl">
              Productos Artech
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary-on-dark">
              Filtra por categoría, marca, precio y especificaciones técnicas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline-on-dark"
              className="hidden lg:inline-flex"
              onClick={() => setIsDesktopFilterOpen((current) => !current)}
            >
              {isDesktopFilterOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </Button>
            <Button
              variant="primary-on-dark"
              className="gap-2 lg:hidden"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={1.5} />
              Filtros
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-8 pt-8 lg:grid-cols-[280px_1fr]",
            !isDesktopFilterOpen && "lg:grid-cols-1",
          )}
        >
          {isDesktopFilterOpen ? (
            <FilterPanel
              categories={categories}
              brands={brands}
              filters={filters}
              specOptions={specOptions}
              onFiltersChange={updateFilters}
              onClear={clearFilters}
              className="hidden h-max lg:block"
            />
          ) : null}

          <section className="min-w-0" aria-label="Resultados del catálogo">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-text-secondary-on-dark">
                {filteredProducts.length} productos encontrados
              </p>
              {initialSearch ? (
                <p className="text-sm text-text-secondary-on-dark">
                  Búsqueda: “{initialSearch}”
                </p>
              ) : null}
            </div>

            {paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <div className="rounded-card border border-border-on-dark bg-bg-base/70 px-6 py-12 text-center">
                <SearchX
                  className="mx-auto text-text-secondary-on-dark"
                  size={36}
                  strokeWidth={1.5}
                />
                <h2 className="mt-5 text-xl font-medium">
                  No encontramos productos
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary-on-dark">
                  Prueba ajustar los filtros o limpiar la selección para ver más
                  opciones del catálogo.
                </p>
                <Button
                  variant="primary-on-dark"
                  className="mt-6"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      {isMobileFilterOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros del catálogo"
          className="catalog-mobile-filter-dialog fixed inset-0 z-[70] flex flex-col bg-bg-base text-text-primary-on-dark lg:hidden"
        >
          <div className="flex h-16 items-center justify-between border-b border-border-on-dark px-6">
            <p className="text-base font-medium">Filtros</p>
            <IconCircleButton
              ref={mobileFilterCloseRef}
              aria-label="Cerrar filtros"
              icon={<X strokeWidth={1.5} />}
              className="size-11"
              onClick={() => setIsMobileFilterOpen(false)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <FilterPanel
              categories={categories}
              brands={brands}
              filters={filters}
              specOptions={specOptions}
              onFiltersChange={updateFilters}
              onClear={clearFilters}
              className="border-0 p-0"
            />
            <Button
              variant="primary-on-dark"
              className="mt-6 w-full"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
