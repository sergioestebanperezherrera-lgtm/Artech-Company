import { AdminPermissionBoundary } from "@/components/admin";
import { PayrollPage } from "@/components/admin/payroll/PayrollPage";

export default function AdminPayrollRoute() {
  return (
    <AdminPermissionBoundary permission="payroll.read">
      <PayrollPage />
    </AdminPermissionBoundary>
  );
}
