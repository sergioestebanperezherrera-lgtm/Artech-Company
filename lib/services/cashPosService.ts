import { getApiUrl } from "@/lib/config/api";
import type {
  CashRegister,
  CashSession,
  CloseCashSessionInput,
  CreateCashMovementInput,
  CreateCashRegisterInput,
  CreatePosSaleInput,
  OpenCashSessionInput,
  PosSale,
  Product,
} from "@/lib/types";
import { adminRequest } from "./adminService";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const cashService = {
  listRegisters(signal?: AbortSignal) {
    return adminRequest<CashRegister[]>("/api/admin/cash/registers", {
      signal,
      errorMessage: "No se pudieron cargar las cajas.",
    });
  },
  createRegister(input: CreateCashRegisterInput) {
    return adminRequest<CashRegister>(
      "/api/admin/cash/registers",
      withJsonBody("POST", input),
    );
  },
  getCurrentSession(signal?: AbortSignal) {
    return adminRequest<CashSession | null>("/api/admin/cash/sessions/current", {
      signal,
      errorMessage: "No se pudo cargar la sesion de caja actual.",
    });
  },
  openSession(input: OpenCashSessionInput) {
    return adminRequest<CashSession>(
      "/api/admin/cash/sessions/open",
      withJsonBody("POST", input),
    );
  },
  getSession(id: string, signal?: AbortSignal) {
    return adminRequest<CashSession>(`/api/admin/cash/sessions/${id}`, {
      signal,
      errorMessage: "No se pudo cargar la sesion de caja.",
    });
  },
  createMovement(sessionId: string, input: CreateCashMovementInput) {
    return adminRequest<CashSession>(
      `/api/admin/cash/sessions/${sessionId}/movements`,
      withJsonBody("POST", input),
    );
  },
  closeSession(sessionId: string, input: CloseCashSessionInput) {
    return adminRequest<CashSession>(
      `/api/admin/cash/sessions/${sessionId}/close`,
      withJsonBody("POST", input),
    );
  },
};

export const posService = {
  listProducts(signal?: AbortSignal) {
    return adminRequest<Product[]>("/api/products", {
      signal,
      errorMessage: "No se pudieron cargar los productos.",
    });
  },
  listSales(filters: { cashSessionId?: string; limit?: number } = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();

    if (filters.cashSessionId) {
      query.set("cashSessionId", filters.cashSessionId);
    }
    if (filters.limit) {
      query.set("limit", String(filters.limit));
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return adminRequest<PosSale[]>(`/api/admin/pos/sales${suffix}`, {
      signal,
      errorMessage: "No se pudieron cargar las ventas POS.",
    });
  },
  getSale(id: string, signal?: AbortSignal) {
    return adminRequest<PosSale>(`/api/admin/pos/sales/${id}`, {
      signal,
      errorMessage: "No se pudo cargar el detalle de la venta.",
    });
  },
  createSale(input: CreatePosSaleInput) {
    return adminRequest<PosSale>(
      "/api/admin/pos/sales",
      withJsonBody("POST", input),
    );
  },
};

export async function checkBackendReachable(signal?: AbortSignal) {
  const response = await fetch(getApiUrl("/api/health"), {
    cache: "no-store",
    signal,
  });
  return response.ok;
}
