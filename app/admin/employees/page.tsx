import { AdminPermissionBoundary } from "@/components/admin";
import { EmployeesPage } from "@/components/admin/employees/EmployeesPage";

export default function AdminEmployeesPage() {
  return (
    <AdminPermissionBoundary permission="employee.read">
      <EmployeesPage />
    </AdminPermissionBoundary>
  );
}
