import { AdminPermissionBoundary } from "@/components/admin";
import { EmployeeDetailPage } from "@/components/admin/employees/EmployeeDetailPage";

type AdminEmployeeDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEmployeeDetailRoute({
  params,
}: AdminEmployeeDetailRouteProps) {
  const { id } = await params;
  return (
    <AdminPermissionBoundary permission="employee.read">
      <EmployeeDetailPage employeeId={id} />
    </AdminPermissionBoundary>
  );
}
