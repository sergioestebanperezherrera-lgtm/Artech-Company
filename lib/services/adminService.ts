import { getApiUrl } from "@/lib/config/api";
import type { AdminContext } from "@/lib/types";

export class AdminServiceError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "AdminServiceError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAdminContext(value: unknown): value is AdminContext {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  const employee = value.employee;
  const employeeIsValid =
    employee === null ||
    (isRecord(employee) &&
      typeof employee.id === "string" &&
      typeof employee.code === "string" &&
      typeof employee.isActive === "boolean");

  return (
    typeof value.user.id === "string" &&
    typeof value.user.name === "string" &&
    typeof value.user.email === "string" &&
    employeeIsValid &&
    isStringArray(value.roles) &&
    isStringArray(value.permissions) &&
    value.canAccessAdmin === true
  );
}

async function getAdminContext(signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(getApiUrl("/api/admin/me"), {
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new AdminServiceError(
      "No se pudo cargar el panel administrativo.",
      null,
    );
  }

  if (!response.ok) {
    throw new AdminServiceError(
      "No se pudo cargar el panel administrativo.",
      response.status,
    );
  }

  try {
    const payload: unknown = await response.json();

    if (!isAdminContext(payload)) {
      throw new AdminServiceError(
        "No se pudo cargar el panel administrativo.",
        response.status,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AdminServiceError) {
      throw error;
    }

    throw new AdminServiceError(
      "No se pudo cargar el panel administrativo.",
      response.status,
    );
  }
}

export const adminService = {
  getContext: getAdminContext,
};
