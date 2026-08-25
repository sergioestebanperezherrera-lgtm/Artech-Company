import type { Shift, ShiftType, Weekday } from "@/lib/types";

export const shiftTypeLabels: Record<ShiftType, string> = {
  DAY: "Diurno",
  EVENING: "Vespertino",
  NIGHT: "Nocturno",
};

export const weekdayLabels: Record<Weekday, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mie",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sab",
  SUNDAY: "Dom",
};

export const weekdayLongLabels: Record<Weekday, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miercoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sabado",
  SUNDAY: "Domingo",
};

export const weekdayOrder = Object.keys(weekdayLabels) as Weekday[];

export function formatShiftSchedule(shift: Pick<Shift, "startTime" | "endTime">) {
  return `${shift.startTime} - ${shift.endTime}`;
}

export function formatShiftDays(days: Weekday[]) {
  return weekdayOrder
    .filter((day) => days.includes(day))
    .map((day) => weekdayLabels[day])
    .join(" · ");
}

export function getShiftStatusLabel(isActive: boolean) {
  return isActive ? "Activo" : "Inactivo";
}
