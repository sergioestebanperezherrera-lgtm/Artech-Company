"use client";

import type { Brand, Category } from "@/lib/types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type CatalogFilters = {
  categories: string[];
  brands: string[];
  minPrice: string;
  maxPrice: string;
  specs: string[];
  inStockOnly: boolean;
};

export type SpecOption = {
  id: string;
  label: string;
};

type FilterPanelProps = {
  categories: Category[];
  brands: Brand[];
  filters: CatalogFilters;
  specOptions: SpecOption[];
  onFiltersChange: (filters: CatalogFilters) => void;
  onClear: () => void;
  className?: string;
};

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function FilterPanel({
  categories,
  brands,
  filters,
  specOptions,
  onFiltersChange,
  onClear,
  className,
}: FilterPanelProps) {
  const updateFilters = (nextFilters: Partial<CatalogFilters>) => {
    onFiltersChange({ ...filters, ...nextFilters });
  };

  return (
    <aside
      className={cn(
        "min-w-0 rounded-card border border-border-on-dark bg-bg-base/80 p-5 text-text-primary-on-dark backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">Filtros</h2>
        <Button variant="outline-on-dark" className="min-h-8 px-3 py-1" onClick={onClear}>
          Limpiar
        </Button>
      </div>

      <div className="mt-6 grid gap-7">
        <fieldset>
          <legend className="text-sm font-medium">Categoría</legend>
          <div className="mt-3 grid gap-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-3 text-sm text-text-secondary-on-dark"
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={() =>
                    updateFilters({
                      categories: toggleValue(filters.categories, category.id),
                      specs: [],
                    })
                  }
                  className="size-4 accent-white"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Marca</legend>
          <div className="mt-3 grid gap-3">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-3 text-sm text-text-secondary-on-dark"
              >
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand.id)}
                  onChange={() =>
                    updateFilters({
                      brands: toggleValue(filters.brands, brand.id),
                    })
                  }
                  className="size-4 accent-white"
                />
                {brand.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Precio</legend>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="grid min-w-0 gap-2 text-xs text-text-secondary-on-dark">
              Mínimo
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(event) => updateFilters({ minPrice: event.target.value })}
                className="h-10 w-full min-w-0 rounded-input border border-border-on-dark bg-bg-base px-3 text-sm text-text-primary-on-dark"
              />
            </label>
            <label className="grid min-w-0 gap-2 text-xs text-text-secondary-on-dark">
              Máximo
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => updateFilters({ maxPrice: event.target.value })}
                className="h-10 w-full min-w-0 rounded-input border border-border-on-dark bg-bg-base px-3 text-sm text-text-primary-on-dark"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Especificaciones</legend>
          <div className="mt-3 grid max-h-48 gap-3 overflow-auto pr-1">
            {specOptions.length > 0 ? (
              specOptions.map((spec) => (
                <label
                  key={spec.id}
                  className="flex items-center gap-3 text-sm text-text-secondary-on-dark"
                >
                  <input
                    type="checkbox"
                    checked={filters.specs.includes(spec.id)}
                    onChange={() =>
                      updateFilters({
                        specs: toggleValue(filters.specs, spec.id),
                      })
                    }
                    className="size-4 accent-white"
                  />
                  {spec.label}
                </label>
              ))
            ) : (
              <p className="text-sm leading-6 text-text-secondary-on-dark">
                Selecciona una categoría para ver filtros técnicos.
              </p>
            )}
          </div>
        </fieldset>

        <label className="flex items-center gap-3 text-sm text-text-secondary-on-dark">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => updateFilters({ inStockOnly: event.target.checked })}
            className="size-4 accent-white"
          />
          Solo productos con stock
        </label>
      </div>
    </aside>
  );
}
