import { adminRequest } from "./adminService";
import type {
  CreateInventoryMovementInput,
  InventoryFilters,
  InventoryItem,
  InventoryMovement,
  InventoryMovementFilters,
} from "@/lib/types";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const inventoryService = {
  list(filters: InventoryFilters = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();

    if (filters.search?.trim()) {
      query.set("search", filters.search.trim());
    }
    if (filters.stockStatus && filters.stockStatus !== "all") {
      query.set("stockStatus", filters.stockStatus);
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return adminRequest<InventoryItem[]>(`/api/admin/inventory${suffix}`, {
      signal,
      errorMessage: "No se pudo cargar el inventario.",
    });
  },
  listMovements(
    filters: InventoryMovementFilters = {},
    signal?: AbortSignal,
  ) {
    const query = new URLSearchParams();

    if (filters.productId) {
      query.set("productId", filters.productId);
    }
    if (filters.type) {
      query.set("type", filters.type);
    }
    if (filters.limit) {
      query.set("limit", String(filters.limit));
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return adminRequest<InventoryMovement[]>(
      `/api/admin/inventory/movements${suffix}`,
      {
        signal,
        errorMessage: "No se pudo cargar el historial de movimientos.",
      },
    );
  },
  createMovement(input: CreateInventoryMovementInput) {
    return adminRequest<InventoryMovement>(
      "/api/admin/inventory/movements",
      withJsonBody("POST", input),
    );
  },
};
