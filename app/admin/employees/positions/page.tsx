import { AdminPermissionBoundary } from "@/components/admin";
import { PositionsPage } from "@/components/admin/employees/PositionsPage";

export default function AdminPositionsPage() {
  return (
    <AdminPermissionBoundary permission="employee.read">
      <PositionsPage />
    </AdminPermissionBoundary>
  );
}
