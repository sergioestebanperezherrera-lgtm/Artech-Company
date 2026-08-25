import { AdminPermissionBoundary } from "@/components/admin";
import { ShiftsPage } from "@/components/admin/shifts/ShiftsPage";

export default function AdminShiftsPage() {
  return (
    <AdminPermissionBoundary permission="shift.read">
      <ShiftsPage />
    </AdminPermissionBoundary>
  );
}
