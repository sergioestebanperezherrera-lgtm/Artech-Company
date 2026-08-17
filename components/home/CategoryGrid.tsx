import Link from "next/link";
import {
  ArrowUpRight,
  Cpu,
  Gamepad2,
  Headphones,
  Keyboard,
  MemoryStick,
  Monitor,
  Puzzle,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/lib/types";

type CategoryGridProps = {
  categories: Category[];
};

const iconMap = {
  smartphone: Smartphone,
  gpu: MemoryStick,
  cpu: Cpu,
  monitor: Monitor,
  keyboard: Keyboard,
  component: Puzzle,
  gamepad: Gamepad2,
  headphones: Headphones,
};

const categorySpanClasses = [
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-3",
];

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="artech-category-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
      {categories.map((category, index) => {
        const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Puzzle;

        return (
          <Link
            key={category.id}
            href={`/catalogo?categoria=${category.id}`}
            className={cn(
              "artech-liquid-glass artech-category-card group",
              categorySpanClasses[index] ?? "lg:col-span-3",
            )}
          >
            <span>
              <span className="artech-category-name">{category.name}</span>
              <span className="artech-category-hint">
                Explorar
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
              </span>
            </span>

            <span
              className="artech-category-visual"
              data-category-visual={category.icon}
              aria-hidden="true"
            >
              <span className="artech-category-shape" />
              <span className="artech-category-line" />
              <span className="artech-category-core" />
              <Icon className="artech-category-icon" size={24} strokeWidth={1.25} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
