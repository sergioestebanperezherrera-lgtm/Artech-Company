import type { EmploymentStatus, ShiftType } from "./employee";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type AttendanceEmployee = {
  id: string;
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employmentId: string;
  shiftAssignmentId: string | null;
  workDate: string;
  expectedShiftName: string | null;
  expectedShiftType: ShiftType | null;
  expectedStartTime: string | null;
  expectedEndTime: string | null;
  expectedCrossesMidnight: boolean | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  notes: string | null;
  adjustmentReason: string | null;
  adjustedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  employee: AttendanceEmployee;
  employment: {
    id: string;
    status: EmploymentStatus;
    startDate: string;
    endDate: string | null;
    position: {
      id: string;
      name: string;
    };
  };
  shiftAssignment: {
    id: string;
    shiftId: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceFilters = {
  date?: string;
  employeeId?: string;
  status?: AttendanceStatus | "";
};

export type ClockAttendanceInput = {
  employeeId: string;
};

export type OverrideAttendanceInput = {
  clockInAt?: string | null;
  clockOutAt?: string | null;
  status?: AttendanceStatus;
  notes?: string | null;
  adjustmentReason: string;
};
