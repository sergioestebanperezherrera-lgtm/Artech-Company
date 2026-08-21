import { products as mockProducts } from "@/lib/data/products";
import { getApiUrl } from "@/lib/config/api";
import type { Product } from "@/lib/types";

const productRevalidateSeconds = 60;

function isAvailableForPromotion(product: Product) {
  return product.stock > 0;
}

async function fetchProductsFromApi(): Promise<Product[]> {
  const response = await fetch(getApiUrl("/api/products"), {
    next: { revalidate: productRevalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(`Products API responded with ${response.status}`);
  }

  return response.json() as Promise<Product[]>;
}

async function fetchProductBySlugFromApi(slug: string): Promise<Product | undefined> {
  const response = await fetch(getApiUrl(`/api/products/${slug}`), {
    next: { revalidate: productRevalidateSeconds },
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Product API responded with ${response.status}`);
  }

  return response.json() as Promise<Product>;
}

function warnMockFallback(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[ARTECH] Products API unavailable. Using frontend mock products as development fallback.",
      error,
    );
    return;
  }

  throw error;
}

export const productService = {
  async getAll(): Promise<Product[]> {
    try {
      return await fetchProductsFromApi();
    } catch (error) {
      warnMockFallback(error);
      return mockProducts;
    }
  },

  async getFeatured(): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter(isAvailableForPromotion).slice(0, 8);
  },

  async getHero(): Promise<Product | undefined> {
    const products = await this.getFeatured();
    return products[0];
  },

  async getOffers(): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter(
      (product) => product.discountPercent !== null && isAvailableForPromotion(product),
    );
  },

  async getNewArrivals(): Promise<Product[]> {
    return this.getFeatured();
  },

  async getBySlug(slug: string): Promise<Product | undefined> {
    try {
      return await fetchProductBySlugFromApi(slug);
    } catch (error) {
      warnMockFallback(error);
      return mockProducts.find((product) => product.slug === slug);
    }
  },

  async getRelated(product: Product, limit = 8): Promise<Product[]> {
    const products = await this.getAll();
    const sameCategory = products.filter(
      (candidate) =>
        candidate.id !== product.id && candidate.category === product.category,
    );
    const fallback = products.filter((candidate) => candidate.id !== product.id);

    return [...sameCategory, ...fallback]
      .filter(
        (candidate, index, collection) =>
          collection.findIndex((item) => item.id === candidate.id) === index,
      )
      .slice(0, limit);
  },
};
