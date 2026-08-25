"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, ReceiptText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { posService } from "@/lib/services/cashPosService";
import type { PosSale } from "@/lib/types";
import { AdminModal } from "../AdminModal";
import {
  formatAdminDateTime,
  formatAdminMoney,
  getAdminCommerceError,
  getEmployeeName,
} from "../cash-pos-ui";

function getPaymentLabel(sale: PosSale) {
  if (!sale.payment) {
    return "Sin pago";
  }

  return sale.payment.method === "CASH" ? "Efectivo" : "Tarjeta";
}

function SalesDetail({ sale }: { sale: PosSale }) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Numero</dt>
          <dd className="mt-1 font-mono text-white">{sale.saleNumber}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Total</dt>
          <dd className="mt-1 font-medium text-white">{formatAdminMoney(sale.total)}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Metodo de pago</dt>
          <dd className="mt-1 text-white">{getPaymentLabel(sale)}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Caja</dt>
          <dd className="mt-1 text-white">
            {sale.cashSession
              ? `${sale.cashSession.cashRegister.code} - ${sale.cashSession.cashRegister.name}`
              : "Sin caja"}
          </dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Empleado</dt>
          <dd className="mt-1 text-white">{getEmployeeName(sale.employee)}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
          <dt className="text-white/38">Fecha</dt>
          <dd className="mt-1 text-white">{formatAdminDateTime(sale.createdAt)}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-medium text-white">Items</h3>
        <div className="mt-3 divide-y divide-white/[0.07] rounded-lg border border-white/[0.08]">
          {sale.items.map((item) => (
            <div key={item.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="font-medium text-white">{item.productName}</p>
                <p className="mt-1 font-mono text-xs text-white/35">{item.sku}</p>
              </div>
              <p className="text-white/70">
                {item.quantity} x {formatAdminMoney(item.unitPrice)} ={" "}
                <span className="font-medium text-white">
                  {formatAdminMoney(item.lineTotal)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {sale.payment ? (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 text-sm leading-6 text-white/60">
          Pago recibido: {formatAdminMoney(sale.payment.amount)}
          {sale.payment.method === "CASH"
            ? ` / Cambio: ${formatAdminMoney(sale.payment.changeAmount)}`
            : ""}
        </div>
      ) : null}
    </div>
  );
}

export function SalesPage() {
  const [sales, setSales] = useState<PosSale[] | null>(null);
  const [selectedSale, setSelectedSale] = useState<PosSale | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSales = useCallback(async (signal?: AbortSignal) => {
    setError("");
    setSales(null);

    try {
      setSales(await posService.listSales({ limit: 50 }, signal));
    } catch (loadError: unknown) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setSales([]);
      setError(getAdminCommerceError(loadError, "No se pudieron cargar las ventas."));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadSales(controller.signal);
    });
    return () => controller.abort();
  }, [loadSales]);

  const openSale = async (sale: PosSale) => {
    setIsDetailLoading(true);
    setError("");

    try {
      setSelectedSale(await posService.getSale(sale.id));
    } catch (detailError: unknown) {
      setError(
        getAdminCommerceError(detailError, "No se pudo cargar el detalle de la venta."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Operaciones / Ventas
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Ventas POS
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Consulta ventas POS confirmadas, items, total, metodo de pago y caja
            asociada.
          </p>
        </div>
        <Button
          variant="outline-on-dark"
          className="rounded-lg border-white/10"
          onClick={() => void loadSales()}
          disabled={sales === null}
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar
        </Button>
      </header>

      {error ? (
        <div className="admin-empty-panel mt-6 px-5 py-4">
          <p className="text-sm font-medium text-white" role="alert">
            {error}
          </p>
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="sales-list-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="sales-list-heading" className="text-lg font-medium text-white">
              Listado
            </h2>
            <p className="mt-1 text-sm text-white/45">
              {sales ? `${sales.length} ventas` : "Cargando ventas..."}
            </p>
          </div>
        </div>

        {sales === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando ventas...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : sales.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <ReceiptText aria-hidden="true" className="text-white/35" size={26} />
            <p className="mt-4 text-sm font-medium text-white">
              Todavia no hay ventas POS.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden lg:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Numero</th>
                    <th>Fecha</th>
                    <th>Caja</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th><span className="sr-only">Detalle</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-mono text-xs text-white/55">{sale.saleNumber}</td>
                      <td>{formatAdminDateTime(sale.createdAt)}</td>
                      <td>
                        {sale.cashSession
                          ? sale.cashSession.cashRegister.code
                          : "Sin caja"}
                      </td>
                      <td>{getPaymentLabel(sale)}</td>
                      <td className="font-medium text-white">{formatAdminMoney(sale.total)}</td>
                      <td className="text-right">
                        <Button
                          variant="outline-on-dark"
                          className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                          isLoading={isDetailLoading && selectedSale?.id === sale.id}
                          onClick={() => void openSale(sale)}
                        >
                          <Eye aria-hidden="true" size={14} />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {sales.map((sale) => (
                <article key={sale.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-white">
                        {sale.saleNumber}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {formatAdminDateTime(sale.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {formatAdminMoney(sale.total)}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Pago</dt>
                      <dd className="text-white/70">{getPaymentLabel(sale)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Caja</dt>
                      <dd className="text-white/70">
                        {sale.cashSession
                          ? sale.cashSession.cashRegister.code
                          : "Sin caja"}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    variant="outline-on-dark"
                    className="mt-4 w-full rounded-lg border-white/10"
                    onClick={() => void openSale(sale)}
                  >
                    <Eye aria-hidden="true" size={15} />
                    Ver detalle
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedSale ? (
        <AdminModal
          open
          title={`Venta ${selectedSale.saleNumber}`}
          description="Detalle simple de la venta POS."
          onClose={() => setSelectedSale(null)}
        >
          <SalesDetail sale={selectedSale} />
        </AdminModal>
      ) : null}
    </div>
  );
}
