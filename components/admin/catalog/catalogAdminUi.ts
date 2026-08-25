import { AdminServiceError } from "@/lib/services/adminService";

export function formatCatalogPrice(value: number) {
  return `Q${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getCatalogAdminError(error: unknown, fallback: string) {
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
    return "No tienes permiso para gestionar el catalogo.";
  }
  if (error.status === 404) {
    return "El registro solicitado ya no esta disponible.";
  }
  if (error.status === 409) {
    if (error.message.includes("SKU")) {
      return "Ya existe un producto con ese SKU.";
    }
    if (error.message.includes("slug")) {
      return "Ya existe un registro con ese slug o nombre.";
    }
    return "El valor unico ya esta en uso (slug, SKU o barcode).";
  }

  return fallback;
}

export function slugifyInput(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
