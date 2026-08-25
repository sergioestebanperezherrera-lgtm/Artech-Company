"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  LockKeyhole,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cashService } from "@/lib/services/cashPosService";
import type { CashRegister, CashSession, CashSessionMovement } from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { AdminModal } from "../AdminModal";
import {
  formatAdminDateTime,
  formatAdminMoney,
  getAdminCommerceError,
  getEmployeeName,
  normalizeMoneyInput,
} from "../cash-pos-ui";

type CashDialog =
  | { type: "register" }
  | { type: "movement"; movementType: "CASH_IN" | "CASH_OUT" }
  | { type: "close" }
  | null;

function calculateExpectedCash(session: CashSession | null) {
  if (!session) {
    return 0;
  }

  if (session.status === "CLOSED") {
    return session.expectedClosingAmount;
  }

  return session.movements.reduce((total, movement) => {
    if (movement.type === "CASH_IN" || movement.type === "SALE") {
      return total + movement.amount;
    }
    return total - movement.amount;
  }, session.openingAmount);
}

function movementLabel(type: CashSessionMovement["type"]) {
  if (type === "CASH_IN") return "Ingreso";
  if (type === "CASH_OUT") return "Egreso";
  return "Venta";
}

function CashSummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="admin-panel min-h-24 px-4 py-4 sm:px-5">
      <dt className="text-xs text-white/38">{label}</dt>
      <dd
        className={
          tone === "negative"
            ? "mt-3 text-2xl font-medium text-white/70"
            : tone === "positive"
              ? "mt-3 text-2xl font-medium text-white"
              : "mt-3 text-2xl font-medium text-white"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function CashPage() {
  const identity = useAdminIdentity();
  const canOpen = identity.permissions.includes("cash.open");
  const canMove = identity.permissions.includes("cash.move");
  const canClose = identity.permissions.includes("cash.close");
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("0.00");
  const [dialog, setDialog] = useState<CashDialog>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const expectedCash = useMemo(
    () => calculateExpectedCash(currentSession),
    [currentSession],
  );
  const activeRegisters = useMemo(
    () => registers.filter((register) => register.isActive),
    [registers],
  );
  const selectedRegister = registers.find(
    (register) => register.id === selectedRegisterId,
  );

  const loadCash = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const [nextRegisters, nextSession] = await Promise.all([
        cashService.listRegisters(signal),
        cashService.getCurrentSession(signal),
      ]);
      setRegisters(nextRegisters);
      setCurrentSession(nextSession);
      setSelectedRegisterId((current) => current || nextRegisters[0]?.id || "");
    } catch (loadError: unknown) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setError(getAdminCommerceError(loadError, "No se pudo cargar caja."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadCash(controller.signal);
    });
    return () => controller.abort();
  }, [loadCash]);

  const openSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRegisterId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("Abriendo caja...");

    try {
      const session = await cashService.openSession({
        cashRegisterId: selectedRegisterId,
        openingAmount: openingAmount.trim() || "0.00",
      });
      setCurrentSession(session);
      setStatusMessage(`Caja ${session.cashRegister.code} abierta.`);
    } catch (submitError: unknown) {
      setFormError(
        getAdminCommerceError(submitError, "No se pudo abrir la caja."),
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();

    if (!code || !name) {
      setFormError("Completa codigo y nombre de la caja.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("Creando caja...");

    try {
      const register = await cashService.createRegister({ code, name });
      setRegisters((current) => [register, ...current]);
      setSelectedRegisterId(register.id);
      setDialog(null);
      setStatusMessage(`Caja ${register.code} creada.`);
    } catch (submitError: unknown) {
      setFormError(
        getAdminCommerceError(submitError, "No se pudo crear la caja."),
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentSession || dialog?.type !== "movement" || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = normalizeMoneyInput(formData.get("amount"));
    const reason = String(formData.get("reason") ?? "").trim();

    if (!amount || !reason) {
      setFormError("Completa monto y motivo.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage(
      dialog.movementType === "CASH_IN"
        ? "Registrando ingreso..."
        : "Registrando egreso...",
    );

    try {
      const session = await cashService.createMovement(currentSession.id, {
        type: dialog.movementType,
        amount,
        reason,
      });
      setCurrentSession(session);
      setDialog(null);
      setStatusMessage(
        dialog.movementType === "CASH_IN"
          ? "Ingreso registrado."
          : "Egreso registrado.",
      );
    } catch (submitError: unknown) {
      setFormError(
        getAdminCommerceError(submitError, "No se pudo registrar el movimiento."),
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentSession || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const actualClosingAmount = normalizeMoneyInput(
      formData.get("actualClosingAmount"),
    );

    if (!actualClosingAmount) {
      setFormError("Indica el efectivo real.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("Cerrando caja...");

    try {
      const session = await cashService.closeSession(currentSession.id, {
        actualClosingAmount,
      });
      setCurrentSession(session);
      setDialog(null);
      setStatusMessage("Caja cerrada correctamente.");
    } catch (submitError: unknown) {
      setFormError(
        getAdminCommerceError(submitError, "No se pudo cerrar la caja."),
      );
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
            Operaciones / Caja
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Caja
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Abre caja, registra ingresos o egresos manuales y cierra la sesion
            con efectivo esperado, efectivo real y diferencia.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            onClick={() => void loadCash()}
            disabled={isLoading}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Actualizar
          </Button>
          {canOpen ? (
            <Button
              variant="primary-on-dark"
              className="rounded-lg"
              onClick={() => {
                setFormError("");
                setDialog({ type: "register" });
              }}
            >
              <Plus aria-hidden="true" size={16} />
              Nueva caja
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mt-8" aria-label="Resumen de caja">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CashSummaryCard
            label="Apertura"
            value={formatAdminMoney(currentSession?.openingAmount ?? 0)}
          />
          <CashSummaryCard
            label="Efectivo esperado"
            value={formatAdminMoney(expectedCash)}
          />
          <CashSummaryCard
            label="Efectivo real"
            value={formatAdminMoney(currentSession?.actualClosingAmount ?? 0)}
          />
          <CashSummaryCard
            label="Diferencia"
            value={formatAdminMoney(currentSession?.differenceAmount ?? 0)}
            tone={
              (currentSession?.differenceAmount ?? 0) < 0
                ? "negative"
                : "positive"
            }
          />
        </dl>
      </section>

      <p className="mt-4 min-h-5 text-sm text-white/60" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {error ? (
        <section className="admin-empty-panel mt-3 px-5 py-7">
          <p className="text-sm font-medium text-white" role="alert">
            {error}
          </p>
          <Button
            variant="outline-on-dark"
            className="mt-5 rounded-lg border-white/10"
            onClick={() => void loadCash()}
          >
            Reintentar
          </Button>
        </section>
      ) : null}

      {!error && isLoading ? (
        <section className="mt-3 grid gap-3" role="status">
          <span className="sr-only">Cargando caja...</span>
          <div className="admin-skeleton h-28 rounded-md" />
          <div className="admin-skeleton h-40 rounded-md" />
        </section>
      ) : null}

      {!error && !isLoading ? (
        <>
          <section className="admin-panel mt-3 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/65">
                <Landmark aria-hidden="true" size={17} />
              </span>
              <div>
                <h2 className="text-base font-medium text-white">Sesion actual</h2>
                <p className="mt-1 text-sm leading-6 text-white/45">
                  {currentSession
                    ? `${currentSession.cashRegister.name} abierta por ${getEmployeeName(
                        currentSession.employment.employee,
                      )}.`
                    : "No hay una sesion de caja abierta para tu empleado."}
                </p>
              </div>
            </div>

            {currentSession ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/35">Caja</dt>
                    <dd className="mt-1 font-medium text-white">
                      {currentSession.cashRegister.code} - {currentSession.cashRegister.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Estado</dt>
                    <dd className="mt-1 text-white/75">
                      {currentSession.status === "OPEN" ? "Abierta" : "Cerrada"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Apertura</dt>
                    <dd className="mt-1 text-white/75">
                      {formatAdminDateTime(currentSession.openedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Cierre</dt>
                    <dd className="mt-1 text-white/75">
                      {formatAdminDateTime(currentSession.closedAt)}
                    </dd>
                  </div>
                </dl>
                {currentSession.status === "OPEN" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {canMove ? (
                      <>
                        <Button
                          variant="outline-on-dark"
                          className="rounded-lg border-white/10"
                          onClick={() => {
                            setFormError("");
                            setDialog({ type: "movement", movementType: "CASH_IN" });
                          }}
                        >
                          <ArrowDownLeft aria-hidden="true" size={15} />
                          CASH_IN
                        </Button>
                        <Button
                          variant="outline-on-dark"
                          className="rounded-lg border-white/10"
                          onClick={() => {
                            setFormError("");
                            setDialog({ type: "movement", movementType: "CASH_OUT" });
                          }}
                        >
                          <ArrowUpRight aria-hidden="true" size={15} />
                          CASH_OUT
                        </Button>
                      </>
                    ) : null}
                    {canClose ? (
                      <Button
                        variant="primary-on-dark"
                        className="rounded-lg"
                        onClick={() => {
                          setFormError("");
                          setDialog({ type: "close" });
                        }}
                      >
                        <LockKeyhole aria-hidden="true" size={15} />
                        Cerrar caja
                      </Button>
                    ) : null}
                    {!canMove && !canClose ? (
                      <span className="text-sm text-white/40">Solo lectura</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : canOpen ? (
              <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_12rem_auto]" onSubmit={openSession}>
                <label className="admin-form-label">
                  Caja disponible
                  <select
                    className="admin-form-control"
                    value={selectedRegisterId}
                    onChange={(event) => setSelectedRegisterId(event.target.value)}
                    required
                  >
                    <option value="">Selecciona una caja</option>
                    {activeRegisters.map((register) => (
                      <option key={register.id} value={register.id}>
                        {register.code} - {register.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-form-label">
                  Apertura
                  <input
                    className="admin-form-control"
                    inputMode="decimal"
                    value={openingAmount}
                    onChange={(event) => setOpeningAmount(event.target.value)}
                    required
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary-on-dark"
                    className="min-h-11 w-full rounded-lg px-4"
                    isLoading={isSubmitting}
                    loadingLabel="Abriendo..."
                    disabled={!selectedRegisterId}
                  >
                    <Wallet aria-hidden="true" size={16} />
                    Abrir caja
                  </Button>
                </div>
                <p className="min-h-5 text-sm text-white/65 lg:col-span-3" role="alert">
                  {formError}
                </p>
                {!selectedRegister && activeRegisters.length === 0 ? (
                  <p className="text-sm leading-6 text-white/45 lg:col-span-3">
                    No hay cajas activas disponibles. Crea una caja para poder abrir sesion.
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="mt-5 text-sm leading-6 text-white/50">
                No tienes permiso para abrir caja.
              </p>
            )}
          </section>

          <section className="mt-6" aria-labelledby="cash-registers-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="cash-registers-heading" className="text-lg font-medium text-white">
                  Cajas
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  {registers.length} {registers.length === 1 ? "registro" : "registros"}
                </p>
              </div>
            </div>
            <div className="admin-table-wrap mt-4 hidden lg:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {registers.map((register) => (
                    <tr key={register.id}>
                      <td className="font-mono text-xs text-white/55">{register.code}</td>
                      <td className="font-medium text-white">{register.name}</td>
                      <td>{register.isActive ? "Activa" : "Inactiva"}</td>
                      <td>{formatAdminDateTime(register.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 lg:hidden">
              {registers.map((register) => (
                <article key={register.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{register.name}</p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {register.code}
                      </p>
                    </div>
                    <span className="text-xs text-white/45">
                      {register.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-white/38">
                    Creada {formatAdminDateTime(register.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="cash-movements-heading">
            <h2 id="cash-movements-heading" className="text-lg font-medium text-white">
              Movimientos
            </h2>
            {currentSession && currentSession.movements.length > 0 ? (
              <div className="admin-table-wrap mt-4">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Motivo</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSession.movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{movementLabel(movement.type)}</td>
                        <td className="font-medium text-white">
                          {formatAdminMoney(movement.amount)}
                        </td>
                        <td>
                          {movement.reason ??
                            (movement.sale ? movement.sale.saleNumber : "Venta POS")}
                        </td>
                        <td>{formatAdminDateTime(movement.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-panel mt-4 px-5 py-7">
                <p className="text-sm font-medium text-white">
                  No hay movimientos para mostrar.
                </p>
              </div>
            )}
          </section>
        </>
      ) : null}

      {dialog?.type === "register" ? (
        <AdminModal
          open
          title="Nueva caja"
          description="Crea un registro de caja para poder abrir una sesion operativa."
          onClose={() => !isSubmitting && setDialog(null)}
        >
          <form className="space-y-5" onSubmit={createRegister}>
            <label className="admin-form-label">
              Codigo
              <input className="admin-form-control" name="code" maxLength={32} required />
            </label>
            <label className="admin-form-label">
              Nombre
              <input className="admin-form-control" name="name" maxLength={100} required />
            </label>
            <p className="min-h-5 text-sm text-white/65" role="alert">
              {formError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary-on-dark"
                className="rounded-lg"
                isLoading={isSubmitting}
                loadingLabel="Creando..."
              >
                Crear caja
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {dialog?.type === "movement" ? (
        <AdminModal
          open
          title={dialog.movementType === "CASH_IN" ? "Registrar ingreso" : "Registrar egreso"}
          description="Los movimientos manuales requieren motivo operativo."
          onClose={() => !isSubmitting && setDialog(null)}
        >
          <form className="space-y-5" onSubmit={createMovement}>
            <label className="admin-form-label">
              Monto
              <input
                className="admin-form-control"
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                required
              />
            </label>
            <label className="admin-form-label">
              Motivo
              <textarea
                className="admin-form-control min-h-24 resize-y"
                name="reason"
                maxLength={500}
                required
              />
            </label>
            <p className="min-h-5 text-sm text-white/65" role="alert">
              {formError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={() => setDialog(null)}
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
                Registrar
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {dialog?.type === "close" ? (
        <AdminModal
          open
          title="Cerrar caja"
          description={`Efectivo esperado: ${formatAdminMoney(expectedCash)}.`}
          onClose={() => !isSubmitting && setDialog(null)}
        >
          <form className="space-y-5" onSubmit={closeSession}>
            <label className="admin-form-label">
              Efectivo real
              <input
                className="admin-form-control"
                name="actualClosingAmount"
                inputMode="decimal"
                defaultValue={expectedCash.toFixed(2)}
                required
              />
            </label>
            <p className="min-h-5 text-sm text-white/65" role="alert">
              {formError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary-on-dark"
                className="rounded-lg"
                isLoading={isSubmitting}
                loadingLabel="Cerrando..."
              >
                Cerrar caja
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </div>
  );
}
