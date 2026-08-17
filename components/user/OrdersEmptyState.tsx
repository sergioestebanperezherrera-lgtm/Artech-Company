import { PackageSearch } from "lucide-react";
import { Card } from "@/components/ui";

export function OrdersEmptyState() {
  return (
    <Card className="p-6 text-center">
      <PackageSearch
        aria-hidden="true"
        className="mx-auto text-text-secondary-on-light"
        size={38}
        strokeWidth={1.5}
      />
      <h2 className="mt-5 text-xl font-medium">Mis pedidos</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary-on-light">
        Todavía no hay historial porque el backend de pedidos se conectará en una
        fase futura.
      </p>
    </Card>
  );
}
