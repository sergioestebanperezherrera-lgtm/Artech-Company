import { products } from "@/lib/data/products";
import type { Product } from "@/lib/types";

export const productService = {
  getAll(): Product[] {
    return products;
  },

  getFeatured(): Product[] {
    return products.slice(0, 8);
  },

  getHero(): Product {
    return products[1];
  },

  getOffers(): Product[] {
    return products.filter((product) => product.discountPercent !== null);
  },

  getNewArrivals(): Product[] {
    return products.slice(0, 8);
  },

  getBySlug(slug: string): Product | undefined {
    return products.find((product) => product.slug === slug);
  },

  getRelated(product: Product, limit = 8): Product[] {
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
