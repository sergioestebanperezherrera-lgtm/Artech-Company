import { categories as mockCategories } from "@/lib/data/categories";
import { getApiUrl } from "@/lib/config/api";
import type { Category } from "@/lib/types";

async function fetchCategoriesFromApi(): Promise<Category[]> {
  const response = await fetch(getApiUrl("/api/categories"), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Categories API responded with ${response.status}`);
  }

  return response.json() as Promise<Category[]>;
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    try {
      return await fetchCategoriesFromApi();
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn(
        "[ARTECH] Categories API unavailable. Using frontend mock categories as development fallback.",
        error,
      );
      return mockCategories;
    }
  },
};
