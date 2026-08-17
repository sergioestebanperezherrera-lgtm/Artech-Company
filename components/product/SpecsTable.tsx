"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import type { ProductSpec } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type SpecsTableProps = {
  specs: ProductSpec[];
  initialCount?: number;
};

export function SpecsTable({ specs, initialCount = 3 }: SpecsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleSpecs = isExpanded ? specs : specs.slice(0, initialCount);
  const canExpand = specs.length > initialCount;

  if (specs.length === 0) {
    return (
      <div className="rounded-card border border-border-on-dark p-6 text-sm text-text-secondary-on-dark">
        Las especificaciones de este producto estarán disponibles pronto.
      </div>
    );
  }

  return (
    <section aria-labelledby="product-specs-title" className="grid gap-4">
      <div>
        <h2
          id="product-specs-title"
          className="text-2xl font-medium text-text-primary-on-dark"
        >
          Especificaciones
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary-on-dark">
          Vista resumida con opción de ampliar la tabla completa.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-border-on-dark">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {visibleSpecs.map((spec) => (
              <tr
                key={`${spec.label}-${spec.value}`}
                className="border-b border-border-on-dark last:border-b-0"
              >
                <th
                  scope="row"
                  className="w-2/5 bg-surface-panel-dark px-4 py-4 font-medium text-text-primary-on-dark"
                >
                  {spec.label}
                </th>
                <td className="px-4 py-4 text-text-secondary-on-dark">
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canExpand ? (
        <Button
          variant="outline-on-dark"
          className="w-max gap-2"
          aria-expanded={isExpanded}
          aria-controls="product-specs-title"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "Ver menos" : "Más info"}
          <ChevronDown
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className={cn("transition-transform", isExpanded && "rotate-180")}
          />
        </Button>
      ) : null}
    </section>
  );
}
