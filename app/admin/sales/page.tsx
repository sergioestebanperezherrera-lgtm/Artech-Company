import { AdminPermissionBoundary } from "@/components/admin";
import { SalesPage } from "@/components/admin/sales/SalesPage";

export default function AdminSalesRoute() {
  return (
    <AdminPermissionBoundary permission="sale.read">
      <SalesPage />
    </AdminPermissionBoundary>
  );
}
