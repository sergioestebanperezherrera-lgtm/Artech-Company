export type PayrollPeriodStatus = "DRAFT" | "CLOSED";

export type PayrollPeriodSummary = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  createdAt: string;
  closedAt: string | null;
  employeeCount: number;
  requiresReviewCount: number;
  totalNet: number;
};

export type CreatePayrollPeriodInput = {
  name: string;
  startDate: string;
  endDate: string;
};

export type AdjustPayrollSlipInput = {
  adjustmentsAmount: string | number;
  adjustmentReason: string;
};

export type PayrollSlip = {
  id: string;
  periodId: string;
  employeeId: string;
  employmentId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  baseCompensation: number;
  currency: string;
  payFrequency: "MONTHLY" | "BIWEEKLY";
  daysConsidered: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  excusedDays: number;
  lateMinutes: number;
  grossAmount: number;
  adjustmentsAmount: number;
  adjustmentReason: string | null;
  adjustedBy: { id: string; name: string; email: string } | null;
  netAmount: number;
  requiresReview: boolean;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPeriodDetail = PayrollPeriodSummary & {
  slips: PayrollSlip[];
};
