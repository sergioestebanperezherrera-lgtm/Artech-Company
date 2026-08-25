"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Banknote, CreditCard, Minus, Plus, RefreshCw, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button, getButtonClassName } from "@/components/ui";
import { cashService, posService } from "@/lib/services/cashPosService";
import type { CashSession, PosCartItem, PosPaymentMethod, PosSale, Product } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useAdminIdentity } from "../AdminContext";
import {
  formatAdminMoney,
  getAdminCommerceError,
  normalizeMoneyInput,
} from "../cash-pos-ui";

function createClientRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getProductSearchText(product: Product) {
  return normalizeSearch(
    [
      product.name,
      product.brand,
      product.category,
      product.shortSpecs.join(" "),
      product.fullSpecs.map((spec) => `${spec.label} ${spec.value}`).join(" "),
    ].join(" "),
  );
}

function getLineTotal(item: PosCartItem) {
  return item.product.priceGTQ * item.quantity;
}

function getCartTotal(items: PosCartItem[]) {
  return items.reduce((total, item) => total + getLineTotal(item), 0);
}

function toPaymentAmount(value: number) {
  return value.toFixed(2);
}

export function PosPage() {
  const identity = useAdminIdentity();
  const canCreateSale = identity.permissions.includes("sale.pos_create");
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const clientRequestIdRef = useRef<string | null>(null);

  const total = useMemo(() => getCartTotal(cart), [cart]);
  const cashAmount = Number(normalizeMoneyInput(cashReceived)) || 0;
  const changeAmount = Math.max(0, cashAmount - total);
  const normalizedQuery = normalizeSearch(query);
  const filteredProducts = useMemo(() => {
    const list = normalizedQuery
      ? products.filter((product) =>
          getProductSearchText(product).includes(normalizedQuery),
        )
      : products;

    return list.slice(0, 24);
  }, [normalizedQuery, products]);

  const loadPos = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const [nextSession, nextProducts] = await Promise.all([
        cashService.getCurrentSession(signal),
        posService.listProducts(signal),
      ]);
      setSession(nextSession);
      setProducts(nextProducts);
      setCart((current) =>
        current
          .map((item) => {
            const product = nextProducts.find((candidate) => candidate.id === item.product.id);
            if (!product) return null;
            return {
              product,
              quantity: Math.min(item.quantity, Math.max(product.stock, 1)),
            };
          })
          .filter((item): item is PosCartItem => item !== null),
      );
    } catch (loadError: unknown) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setError(getAdminCommerceError(loadError, "No se pudo cargar el POS."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadPos(controller.signal);
    });
    return () => controller.abort();
  }, [loadPos]);

  const addProduct = (product: Product) => {
    if (product.stock <= 0) {
      setStatusMessage(`${product.name} esta agotado.`);
      return;
    }

    setStatusMessage("");
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.max(1, Math.min(quantity, item.product.stock)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeProduct = (productId: string) => {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  };

  const submitSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session || cart.length === 0 || isSubmitting) {
      return;
    }

    const amount =
      paymentMethod === "CARD"
        ? toPaymentAmount(total)
        : normalizeMoneyInput(new FormData(event.currentTarget).get("cashReceived"));

    if (paymentMethod === "CASH" && Number(amount) < total) {
      setStatusMessage("");
      setError("El monto recibido no cubre el total.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStatusMessage("Procesando venta...");
    clientRequestIdRef.current = clientRequestIdRef.current ?? createClientRequestId();

    try {
      const sale = await posService.createSale({
        cashSessionId: session.id,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        payment: {
          method: paymentMethod,
          amount,
        },
        clientRequestId: clientRequestIdRef.current,
      });
      setLastSale(sale);
      setCart([]);
      setCashReceived("");
      setStatusMessage(`Venta ${sale.saleNumber} registrada.`);
      clientRequestIdRef.current = null;
      await loadPos();
    } catch (submitError: unknown) {
      setError(getAdminCommerceError(submitError, "No se pudo registrar la venta."));
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Operaciones / POS
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            POS
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Busca productos reales, cobra en efectivo o tarjeta y descuenta stock
            desde la misma fuente de inventario.
          </p>
        </div>
        <Button
          variant="outline-on-dark"
          className="rounded-lg border-white/10"
          onClick={() => void loadPos()}
          disabled={isLoading || isSubmitting}
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar
        </Button>
      </header>

      <p className="mt-4 min-h-5 text-sm text-white/60" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {error ? (
        <div className="admin-empty-panel mt-3 px-5 py-4">
          <p className="text-sm font-medium text-white" role="alert">
            {error}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_24rem]" role="status">
          <span className="sr-only">Cargando POS...</span>
          <div className="admin-skeleton h-96 rounded-md" />
          <div className="admin-skeleton h-96 rounded-md" />
        </section>
      ) : !session ? (
        <section className="admin-empty-panel mt-6 px-5 py-8">
          <p className="text-sm font-medium text-white">
            No hay una caja abierta para vender.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Abre una sesion de caja antes de registrar ventas POS.
          </p>
          <Link
            href="/admin/cash"
            className={getButtonClassName("primary-on-dark", "mt-6 rounded-lg")}
          >
            Ir a caja
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="min-w-0" aria-labelledby="pos-products-heading">
            <div className="admin-panel p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/65">
                  <Search aria-hidden="true" size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="pos-products-heading" className="text-base font-medium text-white">
                    Buscar productos
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/45">
                    Caja activa: {session.cashRegister.code} - {session.cashRegister.name}
                  </p>
                </div>
              </div>
              <label className="admin-form-label mt-5">
                Producto
                <input
                  className="admin-form-control"
                  value={query}
                  placeholder="Nombre, marca, categoria o especificacion"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.product.id === product.id);
                const isOut = product.stock <= 0;

                return (
                  <article key={product.id} className="admin-module-card p-4">
                    <div className="flex min-h-28 flex-col justify-between gap-4">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-white">
                          {product.name}
                        </p>
                        <p className="mt-2 text-xs text-white/38">
                          {product.brand} / {product.category}
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {formatAdminMoney(product.priceGTQ)}
                          </p>
                          <p className={cn("mt-1 text-xs", isOut ? "text-white/35" : "text-white/45")}>
                            Stock: {product.stock}
                          </p>
                        </div>
                        <Button
                          variant={isOut ? "outline-on-dark" : "primary-on-dark"}
                          className="min-h-10 rounded-lg px-3 text-xs"
                          disabled={!canCreateSale || isOut || isSubmitting}
                          onClick={() => addProduct(product)}
                        >
                          <Plus aria-hidden="true" size={14} />
                          {inCart ? "Sumar" : isOut ? "Agotado" : "Agregar"}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="admin-empty-panel mt-4 px-5 py-8">
                <p className="text-sm font-medium text-white">Sin resultados.</p>
                <p className="mt-2 text-sm text-white/45">
                  Ajusta la busqueda para encontrar productos disponibles en catalogo.
                </p>
              </div>
            ) : null}
          </section>

          <aside className="admin-panel h-fit p-4 sm:p-5" aria-labelledby="pos-cart-heading">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/65">
                <ShoppingCart aria-hidden="true" size={17} />
              </span>
              <div>
                <h2 id="pos-cart-heading" className="text-base font-medium text-white">
                  Carrito POS
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  {cart.length} {cart.length === 1 ? "producto" : "productos"}
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="mt-6 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-6 text-sm leading-6 text-white/45">
                Agrega productos para iniciar una venta.
              </div>
            ) : (
              <form className="mt-5 space-y-5" onSubmit={submitSale}>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-white">
                            {item.product.name}
                          </p>
                          <p className="mt-1 text-xs text-white/38">
                            Stock: {item.product.stock}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.product.name}`}
                          className="press-feedback inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/55 transition-colors hover:text-white"
                          disabled={isSubmitting}
                          onClick={() => removeProduct(item.product.id)}
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-lg border border-white/10">
                          <button
                            type="button"
                            aria-label={`Restar ${item.product.name}`}
                            className="press-feedback inline-flex size-9 items-center justify-center text-white/65"
                            disabled={isSubmitting || item.quantity <= 1}
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus aria-hidden="true" size={14} />
                          </button>
                          <input
                            className="h-9 w-14 border-x border-white/10 bg-transparent text-center text-sm text-white outline-none"
                            aria-label={`Cantidad de ${item.product.name}`}
                            inputMode="numeric"
                            value={item.quantity}
                            disabled={isSubmitting}
                            onChange={(event) =>
                              updateQuantity(
                                item.product.id,
                                Number(event.target.value) || 1,
                              )
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Sumar ${item.product.name}`}
                            className="press-feedback inline-flex size-9 items-center justify-center text-white/65"
                            disabled={isSubmitting || item.quantity >= item.product.stock}
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus aria-hidden="true" size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {formatAdminMoney(getLineTotal(item))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.08] pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/45">Total</span>
                    <strong className="text-xl font-medium text-white">
                      {formatAdminMoney(total)}
                    </strong>
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-xs font-medium text-white/45">Metodo de pago</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["CASH", "CARD"] as PosPaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={cn(
                          "press-feedback inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                          paymentMethod === method
                            ? "border-white/35 bg-white/[0.08] text-white"
                            : "border-white/10 text-white/55 hover:text-white",
                        )}
                        disabled={isSubmitting}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method === "CASH" ? (
                          <Banknote aria-hidden="true" size={16} />
                        ) : (
                          <CreditCard aria-hidden="true" size={16} />
                        )}
                        {method === "CASH" ? "Efectivo" : "Tarjeta"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {paymentMethod === "CASH" ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="admin-form-label">
                      Monto recibido
                      <input
                        className="admin-form-control"
                        name="cashReceived"
                        inputMode="decimal"
                        value={cashReceived}
                        onChange={(event) => setCashReceived(event.target.value)}
                        required
                      />
                    </label>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                      <p className="text-xs text-white/38">Cambio</p>
                      <p className="mt-2 text-lg font-medium text-white">
                        {formatAdminMoney(changeAmount)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                    <p className="text-xs text-white/38">Monto tarjeta</p>
                    <p className="mt-2 text-lg font-medium text-white">
                      {formatAdminMoney(total)}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary-on-dark"
                  className="min-h-12 w-full rounded-lg"
                  isLoading={isSubmitting}
                  loadingLabel="Procesando..."
                  disabled={
                    !canCreateSale ||
                    cart.length === 0 ||
                    (paymentMethod === "CASH" && cashAmount < total)
                  }
                >
                  Cobrar
                </Button>
              </form>
            )}

            {lastSale ? (
              <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm">
                <p className="font-medium text-white">{lastSale.saleNumber}</p>
                <p className="mt-1 text-white/45">
                  Total {formatAdminMoney(lastSale.total)}
                  {lastSale.payment?.method === "CASH"
                    ? ` / Cambio ${formatAdminMoney(lastSale.payment.changeAmount)}`
                    : ""}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
