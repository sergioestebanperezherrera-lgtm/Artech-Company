import { adminRequest } from "./adminService";
import type {
  AttendanceFilters,
  AttendanceRecord,
  ClockAttendanceInput,
  OverrideAttendanceInput,
} from "@/lib/types";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

function getAttendanceQuery(filters: AttendanceFilters) {
  const query = new URLSearchParams();

  if (filters.date) {
    query.set("date", filters.date);
  }
  if (filters.employeeId) {
    query.set("employeeId", filters.employeeId);
  }
  if (filters.status) {
    query.set("status", filters.status);
  }

  return query.size > 0 ? `?${query.toString()}` : "";
}

export const attendanceService = {
  list(filters: AttendanceFilters = {}, signal?: AbortSignal) {
    return adminRequest<AttendanceRecord[]>(
      `/api/admin/attendance${getAttendanceQuery(filters)}`,
      {
        signal,
        errorMessage: "No se pudo cargar la asistencia.",
      },
    );
  },
  listByEmployee(
    employeeId: string,
    filters: Omit<AttendanceFilters, "employeeId"> = {},
    signal?: AbortSignal,
  ) {
    return adminRequest<AttendanceRecord[]>(
      `/api/admin/employees/${employeeId}/attendance${getAttendanceQuery(filters)}`,
      {
        signal,
        errorMessage: "No se pudo cargar la asistencia del empleado.",
      },
    );
  },
  clockIn(input: ClockAttendanceInput) {
    return adminRequest<AttendanceRecord>(
      "/api/admin/attendance/clock-in",
      withJsonBody("POST", input),
    );
  },
  clockOut(input: ClockAttendanceInput) {
    return adminRequest<AttendanceRecord>(
      "/api/admin/attendance/clock-out",
      withJsonBody("POST", input),
    );
  },
  override(id: string, input: OverrideAttendanceInput) {
    return adminRequest<AttendanceRecord>(
      `/api/admin/attendance/${id}`,
      withJsonBody("PATCH", input),
    );
  },
};
