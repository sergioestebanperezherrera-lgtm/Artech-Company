import { brands as mockBrands } from "@/lib/data/brands";
import { getApiUrl } from "@/lib/config/api";
import type { Brand } from "@/lib/types";

async function fetchBrandsFromApi(): Promise<Brand[]> {
  const response = await fetch(getApiUrl("/api/brands"), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Brands API responded with ${response.status}`);
  }

  return response.json() as Promise<Brand[]>;
}

export const brandService = {
  async getAll(): Promise<Brand[]> {
    try {
      return await fetchBrandsFromApi();
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn(
        "[ARTECH] Brands API unavailable. Using frontend mock brands as development fallback.",
        error,
      );
      return mockBrands;
    }
  },
};
