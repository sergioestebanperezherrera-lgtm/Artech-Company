import { AdminServiceError } from "@/lib/services/adminService";

export function formatAdminMoney(value: number) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatAdminDateTime(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

export function normalizeMoneyInput(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(",", ".");
}

export function getAdminCommerceError(error: unknown, fallback: string) {
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
    return "La operacion entra en conflicto con el estado actual. Actualiza e intenta de nuevo.";
  }

  return fallback;
}

export function getEmployeeName(employee: { firstName: string; lastName: string }) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}
