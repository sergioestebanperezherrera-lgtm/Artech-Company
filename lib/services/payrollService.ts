import { adminRequest } from "./adminService";
import type {
  AdjustPayrollSlipInput,
  CreatePayrollPeriodInput,
  PayrollPeriodDetail,
  PayrollPeriodSummary,
  PayrollSlip,
} from "@/lib/types";

function withJsonBody(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const payrollService = {
  listPeriods(signal?: AbortSignal) {
    return adminRequest<PayrollPeriodSummary[]>("/api/admin/payroll/periods", {
      signal,
      errorMessage: "No se pudieron cargar los periodos de nomina.",
    });
  },
  createPeriod(input: CreatePayrollPeriodInput) {
    return adminRequest<PayrollPeriodDetail>(
      "/api/admin/payroll/periods",
      withJsonBody("POST", input),
    );
  },
  getPeriod(id: string, signal?: AbortSignal) {
    return adminRequest<PayrollPeriodDetail>(
      `/api/admin/payroll/periods/${id}`,
      { signal, errorMessage: "No se pudo cargar el periodo de nomina." },
    );
  },
  calculate(id: string) {
    return adminRequest<PayrollPeriodDetail>(
      `/api/admin/payroll/periods/${id}/calculate`,
      withJsonBody("POST", {}),
    );
  },
  close(id: string) {
    return adminRequest<PayrollPeriodDetail>(
      `/api/admin/payroll/periods/${id}/close`,
      withJsonBody("POST", {}),
    );
  },
  adjustSlip(slipId: string, input: AdjustPayrollSlipInput) {
    return adminRequest<PayrollSlip>(
      `/api/admin/payroll/slips/${slipId}`,
      withJsonBody("PATCH", input),
    );
  },
};
