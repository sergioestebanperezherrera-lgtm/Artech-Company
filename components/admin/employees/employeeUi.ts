import { AdminServiceError } from "@/lib/services/adminService";

export function formatAdminDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guatemala",
  }).format(new Date());
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getAdminActionError(error: unknown, fallback: string) {
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
