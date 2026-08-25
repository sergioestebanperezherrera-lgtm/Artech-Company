import { AdminPermissionBoundary } from "@/components/admin";
import { CashPage } from "@/components/admin/cash/CashPage";

export default function AdminCashRoute() {
  return (
    <AdminPermissionBoundary permission="cash.read">
      <CashPage />
    </AdminPermissionBoundary>
  );
}
