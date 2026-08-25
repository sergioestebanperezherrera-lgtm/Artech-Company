export type EmploymentStatus = "ACTIVE" | "ENDED";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type CompensationCurrency = "GTQ";
export type PayFrequency = "MONTHLY" | "BIWEEKLY";
export type ShiftType = "DAY" | "EVENING" | "NIGHT";
export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type Position = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmploymentPosition = Pick<
  Position,
  "id" | "name" | "description" | "isActive"
>;

export type Employment = {
  id: string;
  status: EmploymentStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  position: EmploymentPosition;
  createdAt: string;
  updatedAt: string;
};

export type CurrentEmployment = Pick<
  Employment,
  "id" | "status" | "startDate" | "position"
>;

export type EmployeeSummary = {
  id: string;
  code: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  status: EmployeeStatus;
  hasSystemAccess: boolean;
  currentEmployment: CurrentEmployment | null;
};

export type EmployeeDetail = Omit<EmployeeSummary, "currentEmployment"> & {
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
  currentEmployment: Employment | null;
  employments: Employment[];
};

export type CompensationEmployment = {
  id: string;
  status: EmploymentStatus;
  startDate: string;
  endDate: string | null;
  position: {
    id: string;
    name: string;
  };
};

export type CompensationPeriod = {
  id: string;
  employmentId: string;
  amount: number;
  currency: CompensationCurrency;
  payFrequency: PayFrequency;
  effectiveFrom: string;
  effectiveTo: string | null;
  employment: CompensationEmployment;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCompensation = {
  employee: {
    id: string;
    code: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
  currentEmployment: CompensationEmployment | null;
  current: CompensationPeriod | null;
  history: CompensationPeriod[];
};

export type Shift = {
  id: string;
  name: string;
  code: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  workDays: Weekday[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShiftEmployment = {
  id: string;
  status: EmploymentStatus;
  startDate: string;
  endDate: string | null;
  position: {
    id: string;
    name: string;
  };
};

export type ShiftAssignment = {
  id: string;
  employmentId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  shift: Shift;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeShifts = {
  employee: {
    id: string;
    code: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
  currentEmployment: ShiftEmployment | null;
  current: ShiftAssignment | null;
  history: ShiftAssignment[];
};

export type EmployeeFilters = {
  status?: "all" | "active" | "inactive";
  positionId?: string;
  search?: string;
};

export type CreateEmployeeInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  positionId: string;
  startDate: string;
};

export type UpdateEmployeeInput = {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
};

export type EmploymentTransitionInput = {
  positionId: string;
  startDate: string;
  notes?: string;
};

export type TerminateEmployeeInput = {
  endDate: string;
  notes?: string;
};

export type CreateCompensationInput = {
  amount: string;
  currency: CompensationCurrency;
  payFrequency: PayFrequency;
  effectiveFrom: string;
};

export type CreateShiftInput = {
  name: string;
  code: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  workDays: Weekday[];
};

export type UpdateShiftInput = Partial<CreateShiftInput> & {
  isActive?: boolean;
};

export type CreateShiftAssignmentInput = {
  shiftId: string;
  effectiveFrom: string;
};

export type CreatePositionInput = {
  name: string;
  description?: string;
};

export type UpdatePositionInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};
