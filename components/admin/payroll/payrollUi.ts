import { AdminServiceError } from "@/lib/services/adminService";
import type { PayrollPeriodStatus } from "@/lib/types";

export const periodStatusLabels: Record<PayrollPeriodStatus, string> = {
  DRAFT: "Borrador",
  CLOSED: "Cerrado",
};

export const periodStatusStyles: Record<PayrollPeriodStatus, string> = {
  DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  CLOSED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

export const payFrequencyLabels: Record<string, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
};

export function getPayrollError(error: unknown, fallback: string) {
  if (!(error instanceof AdminServiceError)) {
    return fallback;
  }

  if (error.status === 400) {
    return error.message.includes("reason")
      ? "El motivo del ajuste es obligatorio."
      : "Revisa los datos ingresados e intenta nuevamente.";
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
    if (error.message.includes("Sin compensacion aplicable")) {
      return "Hay empleados sin compensacion aplicable. Resuelve o excluye esos casos antes de cerrar.";
    }
    if (error.message.includes("already closed")) {
      return "El periodo ya fue cerrado.";
    }
    if (error.message.includes("cannot be recalculated")) {
      return "Un periodo cerrado no puede recalcularse.";
    }
    if (error.message.includes("cannot be modified")) {
      return "Los recibos de un periodo cerrado no pueden modificarse.";
    }
    if (error.message.includes("Run the calculation")) {
      return "Calcula la nomina antes de cerrar el periodo.";
    }
    if (error.message.includes("already exists")) {
      return "Ya existe un periodo con esas fechas.";
    }
    return "La operacion entra en conflicto con el estado actual. Actualiza e intenta de nuevo.";
  }

  return fallback;
}
