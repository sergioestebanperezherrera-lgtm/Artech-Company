import { AdminPermissionBoundary } from "@/components/admin";
import { PosPage } from "@/components/admin/pos/PosPage";

export default function AdminPosRoute() {
  return (
    <AdminPermissionBoundary permission="sale.pos_create">
      <PosPage />
    </AdminPermissionBoundary>
  );
}
