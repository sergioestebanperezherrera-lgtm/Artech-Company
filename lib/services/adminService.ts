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

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload: unknown = await response.json();

    if (
      isRecord(payload) &&
      typeof payload.message === "string" &&
      payload.message.trim()
    ) {
      return payload.message;
    }
  } catch {
    // The status code still provides a stable failure signal.
  }

  return fallback;
}

export async function adminRequest<T>(
  path: string,
  options: RequestInit & { errorMessage?: string } = {},
): Promise<T> {
  const { errorMessage, ...requestOptions } = options;
  const fallback = errorMessage ?? "No pudimos completar la accion.";
  let response: Response;

  try {
    response = await fetch(getApiUrl(path), {
      ...requestOptions,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
        ...requestOptions.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new AdminServiceError(fallback, null);
  }

  if (!response.ok) {
    throw new AdminServiceError(
      await readErrorMessage(response, fallback),
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new AdminServiceError(fallback, response.status);
  }
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
