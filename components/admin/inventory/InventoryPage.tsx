"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui";
import { inventoryService } from "@/lib/services/inventoryService";
import type {
  CreateInventoryMovementInput,
  InventoryFilters,
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
} from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { AdminModal } from "../AdminModal";
import { formatAdminDateTime } from "../cash-pos-ui";
import {
  formatMovementQuantity,
  getInventoryError,
  getMovementOriginLabel,
  movementTypeLabels,
  stockStatusLabels,
  stockStatusStyles,
} from "./inventoryUi";

type MovementDialogState = {
  item: InventoryItem;
  direction: "IN" | "OUT";
};

const inTypes: Exclude<InventoryMovementType, "SALE">[] = ["PURCHASE", "RETURN"];
const outTypes: Exclude<InventoryMovementType, "SALE">[] = ["DAMAGE", "ADJUSTMENT"];

function MovementDialog({
  item,
  direction,
  onDirectionChange,
  onClose,
  onSubmitted,
}: {
  item: InventoryItem;
  direction: "IN" | "OUT";
  onDirectionChange: (direction: "IN" | "OUT") => void;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const typeValue = String(formData.get("type") ?? "");
    const quantity = Number(formData.get("quantity"));
    const reason = String(formData.get("reason") ?? "").trim();

    if (!typeValue) {
      setError("Selecciona el tipo de movimiento.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Ingresa una cantidad entera mayor a cero.");
      return;
    }
    if (!reason) {
      setError("El motivo es obligatorio para trazabilidad.");
      return;
    }

    const input: CreateInventoryMovementInput = {
      productId: item.productId,
      type: typeValue as CreateInventoryMovementInput["type"],
      quantity,
      reason,
    };

    setIsSubmitting(true);
    setError("");

    try {
      const movement = await inventoryService.createMovement(input);
      onSubmitted(
        `Movimiento ${movementTypeLabels[movement.type]} de ${movement.quantity} registrado en ${item.name}.`,
      );
    } catch (submitError: unknown) {
      setError(
        getInventoryError(
          submitError,
          "No pudimos registrar el movimiento. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTypes = direction === "IN" ? inTypes : outTypes;

  return (
    <AdminModal
      open
      title="Movimiento de inventario"
      description={`${item.name} - ${item.sku}. Toda modificacion queda registrada en el historial.`}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={direction === "IN" ? "primary-on-dark" : "outline-on-dark"}
            className={
              direction === "IN"
                ? "rounded-lg"
                : "rounded-lg border-white/10"
            }
            onClick={() => onDirectionChange("IN")}
          >
            <ArrowDownCircle aria-hidden="true" size={16} />
            Entrada
          </Button>
          <Button
            type="button"
            variant={direction === "OUT" ? "primary-on-dark" : "outline-on-dark"}
            className={
              direction === "OUT"
                ? "rounded-lg"
                : "rounded-lg border-white/10"
            }
            onClick={() => onDirectionChange("OUT")}
          >
            <ArrowUpCircle aria-hidden="true" size={16} />
            Salida
          </Button>
        </div>

        <label className="admin-form-label">
          Tipo
          <select
            className="admin-form-control"
            name="type"
            key={direction}
            defaultValue=""
            required
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {movementTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-form-label">
          Cantidad
          <input
            className="admin-form-control"
            name="quantity"
            type="number"
            min={1}
            step={1}
            placeholder="10"
            required
          />
        </label>

        <label className="admin-form-label">
          Motivo
          <textarea
            className="admin-form-control min-h-24 resize-y"
            name="reason"
            maxLength={500}
            placeholder="Recepcion de mercaderia, producto danado, correccion fisica..."
            required
          />
        </label>

        <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
          {error}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary-on-dark"
            className="rounded-lg"
            isLoading={isSubmitting}
            loadingLabel="Registrando..."
          >
            Confirmar movimiento
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

export function InventoryPage() {
  const identity = useAdminIdentity();
  const canAdjust = identity.permissions.includes("inventory.adjust");

  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({ stockStatus: "all" });
  const [searchDraft, setSearchDraft] = useState("");
  const [listError, setListError] = useState("");

  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [movementTypeFilter, setMovementTypeFilter] = useState<
    "" | InventoryMovementType
  >("");
  const [movementsError, setMovementsError] = useState("");

  const [dialog, setDialog] = useState<MovementDialogState | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const loadInventory = useCallback(
    async (signal?: AbortSignal) => {
      setListError("");

      try {
        setItems(await inventoryService.list(filters, signal));
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setItems([]);
        setListError(
          getInventoryError(loadError, "No se pudo cargar el inventario."),
        );
      }
    },
    [filters],
  );

  const loadMovements = useCallback(
    async (signal?: AbortSignal) => {
      setMovementsError("");

      try {
        setMovements(
          await inventoryService.listMovements(
            {
              ...(movementTypeFilter ? { type: movementTypeFilter } : {}),
              limit: 50,
            },
            signal,
          ),
        );
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setMovements([]);
        setMovementsError(
          getInventoryError(
            loadError,
            "No se pudo cargar el historial de movimientos.",
          ),
        );
      }
    },
    [movementTypeFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadInventory(controller.signal);
    });
    return () => controller.abort();
  }, [loadInventory]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadMovements(controller.signal);
    });
    return () => controller.abort();
  }, [loadMovements]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListError("");
    setItems(null);
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
  };

  const refreshAll = () => {
    setItems(null);
    setMovements(null);
    void loadInventory();
    void loadMovements();
  };

  const handleMovementSubmitted = (message: string) => {
    setStatusMessage(message);
    setDialog(null);
    setItems(null);
    setMovements(null);
    void loadInventory();
    void loadMovements();
  };

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Operaciones / Inventario
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Inventario
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Stock real compartido con la tienda y POS. Los ajustes manuales
            quedan registrados como movimientos trazables.
          </p>
        </div>
        <Button
          variant="outline-on-dark"
          className="rounded-lg border-white/10"
          onClick={refreshAll}
          disabled={items === null && movements === null}
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar
        </Button>
      </header>

      <p className="mt-5 min-h-5 text-sm text-white/65" aria-live="polite">
        {statusMessage}
      </p>

      <section className="admin-panel mt-3 p-4 sm:p-5" aria-label="Filtros de inventario">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_12rem_auto] lg:items-end"
          onSubmit={handleSearch}
        >
          <label className="admin-form-label min-w-0">
            Buscar
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                size={17}
                strokeWidth={1.6}
              />
              <input
                className="admin-form-control pl-10"
                value={searchDraft}
                placeholder="Producto o SKU"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
          </label>
          <label className="admin-form-label">
            Estado de stock
            <select
              className="admin-form-control"
              value={filters.stockStatus ?? "all"}
              onChange={(event) => {
                setListError("");
                setItems(null);
                setFilters((current) => ({
                  ...current,
                  stockStatus: event.target
                    .value as InventoryFilters["stockStatus"],
                }));
              }}
            >
              <option value="all">Todos</option>
              <option value="available">Disponible</option>
              <option value="low">Stock bajo</option>
              <option value="out">Sin stock</option>
            </select>
          </label>
          <Button
            type="submit"
            variant="outline-on-dark"
            className="min-h-11 rounded-lg border-white/10 px-4"
          >
            Aplicar
          </Button>
        </form>
      </section>

      {listError ? (
        <div className="admin-empty-panel mt-4 px-5 py-4">
          <p className="text-sm font-medium text-white" role="alert">
            {listError}
          </p>
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="inventory-list-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="inventory-list-heading" className="text-lg font-medium text-white">
              Stock por producto
            </h2>
            <p className="mt-1 text-sm text-white/45">
              {items ? `${items.length} productos` : "Cargando inventario..."}
            </p>
          </div>
        </div>

        {items === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando inventario...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : items.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <Boxes aria-hidden="true" className="text-white/35" size={26} />
            <p className="mt-4 text-sm font-medium text-white">
              No hay productos que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden lg:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Disponible</th>
                    <th>Estado</th>
                    {canAdjust ? (
                      <th>
                        <span className="sr-only">Acciones</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td className="font-mono text-xs text-white/55">{item.sku}</td>
                      <td className="font-medium text-white">{item.name}</td>
                      <td>{item.category?.name ?? "Sin categoria"}</td>
                      <td>
                        <span className="font-medium text-white">
                          {item.availableQuantity}
                        </span>
                        {!item.hasInventoryRecord ? (
                          <span className="ml-2 text-xs text-white/40">
                            sin registro
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${stockStatusStyles[item.stockStatus]}`}
                        >
                          {stockStatusLabels[item.stockStatus]}
                        </span>
                      </td>
                      {canAdjust ? (
                        <td className="text-right">
                          <Button
                            variant="outline-on-dark"
                            className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                            onClick={() =>
                              setDialog({ item, direction: "IN" })
                            }
                          >
                            Movimiento
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {items.map((item) => (
                <article key={item.productId} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {item.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {item.sku}
                      </p>
                    </div>
                    <span
                      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium ${stockStatusStyles[item.stockStatus]}`}
                    >
                      {stockStatusLabels[item.stockStatus]}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Categoria</dt>
                      <dd className="text-white/70">
                        {item.category?.name ?? "Sin categoria"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Disponible</dt>
                      <dd className="font-medium text-white">
                        {item.availableQuantity}
                      </dd>
                    </div>
                  </dl>
                  {canAdjust ? (
                    <Button
                      variant="outline-on-dark"
                      className="mt-4 w-full rounded-lg border-white/10"
                      onClick={() => setDialog({ item, direction: "IN" })}
                    >
                      Registrar movimiento
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-8" aria-labelledby="inventory-movements-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="inventory-movements-heading" className="text-lg font-medium text-white">
              Historial de movimientos
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
              Registro inmutable de entradas y salidas, incluidas las ventas POS.
            </p>
          </div>
          <label className="admin-form-label w-full sm:w-56">
            <span className="sr-only">Tipo de movimiento</span>
            <select
              className="admin-form-control"
              value={movementTypeFilter}
              onChange={(event) => {
                setMovements(null);
                setMovementTypeFilter(
                  event.target.value as "" | InventoryMovementType,
                );
              }}
            >
              <option value="">Todos los tipos</option>
              {(Object.keys(movementTypeLabels) as InventoryMovementType[]).map(
                (type) => (
                  <option key={type} value={type}>
                    {movementTypeLabels[type]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {movementsError ? (
          <div className="admin-empty-panel mt-4 px-5 py-4">
            <p className="text-sm font-medium text-white" role="alert">
              {movementsError}
            </p>
          </div>
        ) : movements === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando movimientos...</span>
            <div className="admin-skeleton h-14 rounded-md" />
            <div className="admin-skeleton h-14 rounded-md" />
            <div className="admin-skeleton h-14 rounded-md" />
          </div>
        ) : movements.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <p className="text-sm font-medium text-white">
              Todavia no hay movimientos registrados.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Origen / Motivo</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatAdminDateTime(movement.occurredAt)}</td>
                      <td>
                        <p className="font-medium text-white">
                          {movement.product.name}
                        </p>
                        <p className="font-mono text-xs text-white/35">
                          {movement.product.sku}
                        </p>
                      </td>
                      <td>{movementTypeLabels[movement.type]}</td>
                      <td
                        className={
                          movement.direction === "IN"
                            ? "font-medium text-emerald-300"
                            : "font-medium text-red-300"
                        }
                      >
                        {formatMovementQuantity(movement.direction, movement.quantity)}
                      </td>
                      <td>
                        <p className="text-white/80">
                          {getMovementOriginLabel(movement.type, movement.sale)}
                        </p>
                        {movement.note ? (
                          <p className="mt-1 max-w-xs break-words text-xs text-white/40">
                            {movement.note}
                          </p>
                        ) : null}
                      </td>
                      <td>{movement.createdBy?.name ?? "Sistema / POS"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {movements.map((movement) => (
                <article key={movement.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {movement.product.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {movement.product.sku}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        movement.direction === "IN"
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {formatMovementQuantity(movement.direction, movement.quantity)}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Fecha</dt>
                      <dd className="text-white/70">
                        {formatAdminDateTime(movement.occurredAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Tipo</dt>
                      <dd className="text-white/70">
                        {getMovementOriginLabel(movement.type, movement.sale)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Responsable</dt>
                      <dd className="text-white/70">
                        {movement.createdBy?.name ?? "Sistema / POS"}
                      </dd>
                    </div>
                  </dl>
                  {movement.note ? (
                    <p className="mt-3 break-words text-xs leading-5 text-white/45">
                      {movement.note}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {dialog ? (
        <MovementDialog
          item={dialog.item}
          direction={dialog.direction}
          onDirectionChange={(direction) =>
            setDialog((current) =>
              current ? { ...current, direction } : current,
            )
          }
          onClose={() => {
            if (!dialog) {
              return;
            }
            setDialog(null);
          }}
          onSubmitted={handleMovementSubmitted}
        />
      ) : null}
    </div>
  );
}
