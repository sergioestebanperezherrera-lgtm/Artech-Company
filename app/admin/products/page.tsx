import { AdminPermissionBoundary } from "@/components/admin";
import { ProductsPage } from "@/components/admin/catalog/ProductsPage";

export default function AdminProductsRoute() {
  return (
    <AdminPermissionBoundary permission="catalog.manage">
      <ProductsPage />
    </AdminPermissionBoundary>
  );
}
