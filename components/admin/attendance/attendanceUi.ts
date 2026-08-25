import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { formatAdminDate } from "../employees/employeeUi";
import { shiftTypeLabels } from "../shifts/shiftUi";

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  LATE: "Tarde",
  ABSENT: "Ausente",
  EXCUSED: "Justificado",
};

export const attendanceStatusStyles: Record<AttendanceStatus, string> = {
  PRESENT: "border-white/20 bg-white/[0.08] text-white",
  LATE: "border-white/[0.18] bg-white/[0.055] text-white/[0.82]",
  ABSENT: "border-white/[0.08] bg-black/30 text-white/45",
  EXCUSED: "border-white/12 bg-white/[0.035] text-white/65",
};

export function getEmployeeDisplayName(
  employee: Pick<AttendanceRecord["employee"], "code" | "firstName" | "lastName">,
) {
  const name = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || employee.code;
}

export function formatAttendanceWorkDate(value: string | null) {
  return formatAdminDate(value);
}

export function formatAttendanceDateTime(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

export function formatAttendanceTime(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

export function formatExpectedShift(record: AttendanceRecord) {
  if (!record.expectedShiftName) {
    return "Sin snapshot";
  }

  const schedule =
    record.expectedStartTime && record.expectedEndTime
      ? `${record.expectedStartTime} - ${record.expectedEndTime}`
      : "Horario no registrado";
  const type = record.expectedShiftType
    ? shiftTypeLabels[record.expectedShiftType]
    : "Turno";

  return `${record.expectedShiftName} · ${type} · ${schedule}`;
}

export function getLateLabel(minutes: number) {
  if (minutes <= 0) {
    return "Sin tardanza";
  }

  return `${minutes} min tarde`;
}

export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Guatemala",
  }).formatToParts(date);
  const byType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
}
