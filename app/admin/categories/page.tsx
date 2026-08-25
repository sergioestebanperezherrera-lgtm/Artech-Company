import { AdminPermissionBoundary } from "@/components/admin";
import { CategoriesPage } from "@/components/admin/catalog/CategoriesPage";

export default function AdminCategoriesRoute() {
  return (
    <AdminPermissionBoundary permission="catalog.manage">
      <CategoriesPage />
    </AdminPermissionBoundary>
  );
}
