export type AdminCatalogRef = {
  id: string;
  name: string;
  slug: string;
};

export type AdminBrand = AdminCatalogRef;

export type AdminProductImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
};

export type AdminProductSpecification = {
  id: string;
  label: string;
  value: string;
  isHighlighted: boolean;
};

export type AdminProduct = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  price: number;
  previousPrice: number | null;
  barcode: string | null;
  hasRgbLighting: boolean;
  isFeatured: boolean;
  isActive: boolean;
  category: AdminCatalogRef & { isActive: boolean };
  brand: AdminCatalogRef | null;
  images: AdminProductImage[];
  specifications: AdminProductSpecification[];
  availableQuantity: number;
  hasInventoryRecord: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductFilters = {
  search?: string;
  categoryId?: string;
  status?: "all" | "active" | "inactive";
};

export type AdminSaveProductInput = {
  name: string;
  sku: string;
  slug?: string;
  description: string;
  price: string | number;
  previousPrice?: string | number | null;
  categoryId: string;
  brandId?: string | null;
  barcode?: string | null;
  hasRgbLighting?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  images?: string[];
  specifications?: Array<{
    label: string;
    value: string;
    isHighlighted: boolean;
  }>;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  productCount: number;
};

export type AdminSaveCategoryInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
};
