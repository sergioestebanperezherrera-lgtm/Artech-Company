import { AdminPermissionBoundary } from "@/components/admin";
import { AttendancePage } from "@/components/admin/attendance/AttendancePage";
import type { AttendanceFilters, AttendanceStatus } from "@/lib/types";

type AdminAttendanceRouteProps = {
  searchParams: Promise<{
    date?: string;
    employeeId?: string;
    status?: string;
  }>;
};

const attendanceStatuses: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
];

function normalizeStatus(value: string | undefined) {
  return attendanceStatuses.includes(value as AttendanceStatus)
    ? (value as AttendanceStatus)
    : "";
}

export default async function AdminAttendanceRoute({
  searchParams,
}: AdminAttendanceRouteProps) {
  const params = await searchParams;
  const initialFilters: AttendanceFilters = {
    date: params.date ?? "",
    employeeId: params.employeeId ?? "",
    status: normalizeStatus(params.status),
  };

  return (
    <AdminPermissionBoundary permission="attendance.read">
      <AttendancePage initialFilters={initialFilters} />
    </AdminPermissionBoundary>
  );
}
