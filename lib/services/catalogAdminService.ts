import { adminRequest } from "./adminService";
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductFilters,
  AdminSaveCategoryInput,
  AdminSaveProductInput,
} from "@/lib/types/catalogAdmin";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const catalogAdminService = {
  listProducts(filters: AdminProductFilters = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();

    if (filters.search?.trim()) {
      query.set("search", filters.search.trim());
    }
    if (filters.categoryId) {
      query.set("categoryId", filters.categoryId);
    }
    if (filters.status && filters.status !== "all") {
      query.set("status", filters.status);
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return adminRequest<AdminProduct[]>(`/api/admin/products${suffix}`, {
      signal,
      errorMessage: "No se pudieron cargar los productos.",
    });
  },
  getProduct(id: string, signal?: AbortSignal) {
    return adminRequest<AdminProduct>(`/api/admin/products/${id}`, {
      signal,
      errorMessage: "No se pudo cargar el producto.",
    });
  },
  createProduct(input: AdminSaveProductInput) {
    return adminRequest<AdminProduct>(
      "/api/admin/products",
      withJsonBody("POST", input),
    );
  },
  updateProduct(id: string, input: Partial<AdminSaveProductInput>) {
    return adminRequest<AdminProduct>(
      `/api/admin/products/${id}`,
      withJsonBody("PATCH", input),
    );
  },
  listBrands(signal?: AbortSignal) {
    return adminRequest<AdminBrand[]>("/api/admin/products/brands", {
      signal,
      errorMessage: "No se pudieron cargar las marcas.",
    });
  },
  listCategories(signal?: AbortSignal) {
    return adminRequest<AdminCategory[]>("/api/admin/categories", {
      signal,
      errorMessage: "No se pudieron cargar las categorias.",
    });
  },
  createCategory(input: AdminSaveCategoryInput) {
    return adminRequest<AdminCategory>(
      "/api/admin/categories",
      withJsonBody("POST", input),
    );
  },
  updateCategory(id: string, input: Partial<AdminSaveCategoryInput> & { isActive?: boolean }) {
    return adminRequest<AdminCategory>(
      `/api/admin/categories/${id}`,
      withJsonBody("PATCH", input),
    );
  },
};
