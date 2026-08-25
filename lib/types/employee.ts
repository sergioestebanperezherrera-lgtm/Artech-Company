export type EmploymentStatus = "ACTIVE" | "ENDED";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";

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

export type CreatePositionInput = {
  name: string;
  description?: string;
};

export type UpdatePositionInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};
