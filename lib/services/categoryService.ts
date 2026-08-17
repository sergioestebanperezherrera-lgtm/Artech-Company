import { categories } from "@/lib/data/categories";
import type { Category } from "@/lib/types";

export const categoryService = {
  getAll(): Category[] {
    return categories;
  },
};
