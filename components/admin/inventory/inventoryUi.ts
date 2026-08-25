import { AdminServiceError } from "@/lib/services/adminService";
import type {
  InventoryMovementDirection,
  InventoryMovementType,
  InventoryStockStatus,
} from "@/lib/types";

export const stockStatusLabels: Record<InventoryStockStatus, string> = {
  AVAILABLE: "Disponible",
  LOW: "Stock bajo",
  OUT: "Sin stock",
};

export const stockStatusStyles: Record<InventoryStockStatus, string> = {
  AVAILABLE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  LOW: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  OUT: "border-red-400/30 bg-red-400/10 text-red-300",
};

export const movementTypeLabels: Record<InventoryMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  RETURN: "Devolucion",
  ADJUSTMENT: "Ajuste",
  DAMAGE: "Dano / merma",
};

export function getMovementOriginLabel(
  type: InventoryMovementType,
  sale: { saleNumber: string } | null,
) {
  if (sale) {
    return `Venta POS ${sale.saleNumber}`;
  }
  return movementTypeLabels[type];
}

export function formatMovementQuantity(
  direction: InventoryMovementDirection,
  quantity: number,
) {
  return direction === "IN" ? `+${quantity}` : `-${quantity}`;
}

export function getInventoryError(error: unknown, fallback: string) {
  if (!(error instanceof AdminServiceError)) {
    return fallback;
  }

  if (error.status === 400) {
    return "Revisa los datos ingresados e intenta nuevamente.";
  }
  if (error.status === 401) {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }
  if (error.status === 403) {
    return "No tienes permiso para realizar esta accion.";
  }
  if (error.status === 404) {
    return "El registro solicitado ya no esta disponible.";
  }
  if (error.status === 409) {
    return error.message.includes("Insufficient stock")
      ? "No hay stock suficiente para registrar la salida."
      : "La operacion entra en conflicto con el estado actual. Actualiza e intenta de nuevo.";
  }

  return fallback;
}
