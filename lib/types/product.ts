export type Currency = "GTQ" | "USD";

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string;
  priceGTQ: number;
  priceUSD: number;
  discountPercent: number | null;
  shortSpecs: string[];
  fullSpecs: ProductSpec[];
  images: string[];
  stock: number;
  hasRgbLighting: boolean;
};
