import { AdminPermissionBoundary } from "@/components/admin";
import { InventoryPage } from "@/components/admin/inventory/InventoryPage";

export default function AdminInventoryRoute() {
  return (
    <AdminPermissionBoundary permission="inventory.read">
      <InventoryPage />
    </AdminPermissionBoundary>
  );
}
