import { adminRequest } from "./adminService";
import type {
  CreateCompensationInput,
  CreateEmployeeInput,
  CreatePositionInput,
  CreateShiftAssignmentInput,
  CreateShiftInput,
  CorrectEmploymentStartDateInput,
  EmployeeCompensation,
  EmployeeDetail,
  EmployeeFilters,
  EmployeeShifts,
  EmployeeSummary,
  EmploymentTransitionInput,
  LinkEmployeeUserInput,
  Position,
  Shift,
  TerminateEmployeeInput,
  UpdateEmployeeInput,
  UpdatePositionInput,
  UpdateShiftInput,
} from "@/lib/types";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

function listEmployees(filters: EmployeeFilters, signal?: AbortSignal) {
  const query = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    query.set("status", filters.status);
  }
  if (filters.positionId) {
    query.set("positionId", filters.positionId);
  }
  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return adminRequest<EmployeeSummary[]>(`/api/admin/employees${suffix}`, {
    signal,
    errorMessage: "No se pudo cargar la lista de empleados.",
  });
}

export const employeeService = {
  list: listEmployees,
  get(id: string, signal?: AbortSignal) {
    return adminRequest<EmployeeDetail>(`/api/admin/employees/${id}`, {
      signal,
      errorMessage: "No se pudo cargar la ficha del empleado.",
    });
  },
  create(input: CreateEmployeeInput) {
    return adminRequest<EmployeeDetail>(
      "/api/admin/employees",
      withJsonBody("POST", input),
    );
  },
  update(id: string, input: UpdateEmployeeInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}`,
      withJsonBody("PATCH", input),
    );
  },
  linkUser(id: string, input: LinkEmployeeUserInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}/link-user`,
      withJsonBody("POST", input),
    );
  },
  changePosition(id: string, input: EmploymentTransitionInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}/change-position`,
      withJsonBody("POST", input),
    );
  },
  correctStartDate(id: string, input: CorrectEmploymentStartDateInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}/correct-start-date`,
      withJsonBody("POST", input),
    );
  },
  terminate(id: string, input: TerminateEmployeeInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}/terminate`,
      withJsonBody("POST", input),
    );
  },
  reactivate(id: string, input: EmploymentTransitionInput) {
    return adminRequest<EmployeeDetail>(
      `/api/admin/employees/${id}/reactivate`,
      withJsonBody("POST", input),
    );
  },
  deleteRecord(id: string) {
    return adminRequest<void>(`/api/admin/employees/${id}`, {
      method: "DELETE",
    });
  },
  getCompensation(id: string, signal?: AbortSignal) {
    return adminRequest<EmployeeCompensation>(
      `/api/admin/employees/${id}/compensation`,
      {
        signal,
        errorMessage: "No se pudo cargar la compensacion del empleado.",
      },
    );
  },
  createCompensation(id: string, input: CreateCompensationInput) {
    return adminRequest<EmployeeCompensation>(
      `/api/admin/employees/${id}/compensation`,
      withJsonBody("POST", input),
    );
  },
  getShifts(id: string, signal?: AbortSignal) {
    return adminRequest<EmployeeShifts>(`/api/admin/employees/${id}/shifts`, {
      signal,
      errorMessage: "No se pudo cargar el turno del empleado.",
    });
  },
  createShiftAssignment(id: string, input: CreateShiftAssignmentInput) {
    return adminRequest<EmployeeShifts>(
      `/api/admin/employees/${id}/shifts`,
      withJsonBody("POST", input),
    );
  },
};

export const positionService = {
  list(signal?: AbortSignal) {
    return adminRequest<Position[]>("/api/admin/positions", {
      signal,
      errorMessage: "No se pudo cargar la lista de puestos.",
    });
  },
  create(input: CreatePositionInput) {
    return adminRequest<Position>(
      "/api/admin/positions",
      withJsonBody("POST", input),
    );
  },
  update(id: string, input: UpdatePositionInput) {
    return adminRequest<Position>(
      `/api/admin/positions/${id}`,
      withJsonBody("PATCH", input),
    );
  },
};

export const shiftService = {
  list(signal?: AbortSignal) {
    return adminRequest<Shift[]>("/api/admin/shifts", {
      signal,
      errorMessage: "No se pudo cargar la lista de turnos.",
    });
  },
  create(input: CreateShiftInput) {
    return adminRequest<Shift>("/api/admin/shifts", withJsonBody("POST", input));
  },
  update(id: string, input: UpdateShiftInput) {
    return adminRequest<Shift>(
      `/api/admin/shifts/${id}`,
      withJsonBody("PATCH", input),
    );
  },
};
