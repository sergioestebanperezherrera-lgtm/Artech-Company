"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  Calculator,
  Lock,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui";
import { payrollService } from "@/lib/services/payrollService";
import type {
  PayrollPeriodDetail,
  PayrollPeriodSummary,
  PayrollSlip,
} from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { AdminModal } from "../AdminModal";
import { formatAdminDateTime, formatAdminMoney } from "../cash-pos-ui";
import {
  getPayrollError,
  payFrequencyLabels,
  periodStatusLabels,
  periodStatusStyles,
} from "./payrollUi";

function StatusBadge({ status }: { status: keyof typeof periodStatusLabels }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${periodStatusStyles[status]}`}
    >
      {periodStatusLabels[status]}
    </span>
  );
}

function CreatePeriodDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (period: PayrollPeriodDetail) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") ?? "");

    if (!name || !startDate || !endDate) {
      setError("Completa nombre y rango de fechas.");
      return;
    }
    if (startDate > endDate) {
      setError("La fecha inicial debe ser anterior o igual a la final.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const period = await payrollService.createPeriod({ name, startDate, endDate });
      onCreated(period);
    } catch (submitError: unknown) {
      setError(
        getPayrollError(
          submitError,
          "No pudimos crear el periodo. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      open
      title="Crear periodo de nomina"
      description="El periodo se crea en borrador. Podras calcularlo y ajustarlo antes de cerrarlo."
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="admin-form-label">
          Nombre
          <input
            className="admin-form-control"
            name="name"
            maxLength={120}
            placeholder="Nomina quincenal 1-15"
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="admin-form-label">
            Fecha inicial
            <input
              className="admin-form-control"
              name="startDate"
              type="date"
              required
            />
          </label>
          <label className="admin-form-label">
            Fecha final
            <input
              className="admin-form-control"
              name="endDate"
              type="date"
              required
            />
          </label>
        </div>

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
            loadingLabel="Creando..."
          >
            Crear periodo
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

function SlipDetailModal({
  slip,
  onClose,
}: {
  slip: PayrollSlip;
  onClose: () => void;
}) {
  return (
    <AdminModal
      open
      title={`${slip.employeeName} - ${slip.employeeCode}`}
      description={`Recibo de nomina del periodo. Puesto al momento del calculo: ${slip.positionName}.`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
            <dt className="text-white/38">Compensacion base</dt>
            <dd className="mt-1 font-medium text-white">
              {formatAdminMoney(slip.baseCompensation)} -{" "}
              {payFrequencyLabels[slip.payFrequency]}
            </dd>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
            <dt className="text-white/38">Dias considerados</dt>
            <dd className="mt-1 font-medium text-white">{slip.daysConsidered}</dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-medium text-white">Asistencia del periodo</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
              <dt className="text-xs text-white/38">Presentes</dt>
              <dd className="mt-1 font-medium text-white">{slip.presentDays}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
              <dt className="text-xs text-white/38">Tardes</dt>
              <dd className="mt-1 font-medium text-white">
                {slip.lateDays} ({slip.lateMinutes} min)
              </dd>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
              <dt className="text-xs text-white/38">Ausencias</dt>
              <dd className="mt-1 font-medium text-white">{slip.absentDays}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
              <dt className="text-xs text-white/38">Justificados</dt>
              <dd className="mt-1 font-medium text-white">{slip.excusedDays}</dd>
            </div>
          </dl>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
            <dt className="text-white/38">Monto base</dt>
            <dd className="mt-1 font-medium text-white">
              {formatAdminMoney(slip.grossAmount)}
            </dd>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
            <dt className="text-white/38">Ajuste</dt>
            <dd className="mt-1 font-medium text-white">
              {formatAdminMoney(slip.adjustmentsAmount)}
            </dd>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
            <dt className="text-white/38">Neto</dt>
            <dd className="mt-1 font-semibold text-white">
              {formatAdminMoney(slip.netAmount)}
            </dd>
          </div>
        </dl>

        {slip.adjustmentReason ? (
          <p className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/55">
            Motivo del ajuste: {slip.adjustmentReason}
            {slip.adjustedBy ? ` (${slip.adjustedBy.name})` : ""}
          </p>
        ) : null}

        {slip.requiresReview ? (
          <p
            className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-300"
            role="alert"
          >
            Requiere revision: {slip.reviewReason ?? "Revisar manualmente"}
          </p>
        ) : null}
      </div>
    </AdminModal>
  );
}

function AdjustSlipModal({
  slip,
  onClose,
  onAdjusted,
}: {
  slip: PayrollSlip;
  onClose: () => void;
  onAdjusted: (message: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const adjustmentsAmount = String(formData.get("adjustmentsAmount") ?? "").trim();
    const adjustmentReason = String(formData.get("adjustmentReason") ?? "").trim();

    if (!adjustmentsAmount || !adjustmentReason) {
      setError("Ingresa el monto del ajuste y su motivo.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await payrollService.adjustSlip(slip.id, {
        adjustmentsAmount: adjustmentsAmount.replace(",", "."),
        adjustmentReason,
      });
      onAdjusted(`Ajuste registrado para ${slip.employeeName}.`);
    } catch (submitError: unknown) {
      setError(
        getPayrollError(
          submitError,
          "No pudimos registrar el ajuste. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      open
      title={`Ajustar recibo - ${slip.employeeName}`}
      description="El ajuste puede ser positivo o negativo y queda registrado con motivo y responsable."
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="admin-form-label">
          Ajuste (GTQ)
          <input
            className="admin-form-control"
            name="adjustmentsAmount"
            inputMode="decimal"
            placeholder="-150.00 o 250.50"
            pattern="-?\d+(\.\d{1,2})?"
            defaultValue={slip.adjustmentsAmount.toFixed(2)}
            required
          />
        </label>
        <label className="admin-form-label">
          Motivo
          <textarea
            className="admin-form-control min-h-24 resize-y"
            name="adjustmentReason"
            maxLength={500}
            defaultValue={slip.adjustmentReason ?? ""}
            placeholder="Bono, descuento autorizado, correccion..."
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
            loadingLabel="Guardando..."
          >
            Guardar ajuste
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

export function PayrollPage() {
  const identity = useAdminIdentity();
  const canManage = identity.permissions.includes("payroll.manage");
  const canClose = identity.permissions.includes("payroll.close");

  const [periods, setPeriods] = useState<PayrollPeriodSummary[] | null>(null);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayrollPeriodDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [slipToAdjust, setSlipToAdjust] = useState<PayrollSlip | null>(null);
  const [slipToView, setSlipToView] = useState<PayrollSlip | null>(null);

  const loadPeriods = useCallback(async (signal?: AbortSignal) => {
    setListError("");
    try {
      setPeriods(await payrollService.listPeriods(signal));
    } catch (loadError: unknown) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setPeriods([]);
      setListError(
        getPayrollError(loadError, "No se pudo cargar la nomina."),
      );
    }
  }, []);

  const loadDetail = useCallback(
    async (id: string, signal?: AbortSignal) => {
      setDetailError("");
      try {
        setDetail(await payrollService.getPeriod(id, signal));
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setDetail(null);
        setDetailError(
          getPayrollError(loadError, "No se pudo cargar el periodo."),
        );
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadPeriods(controller.signal));
    return () => controller.abort();
  }, [loadPeriods]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      void loadDetail(selectedId, controller.signal);
    });
    return () => controller.abort();
  }, [selectedId, loadDetail]);

  const refreshAll = async (focusId?: string) => {
    setPeriods(null);
    await loadPeriods();
    if (focusId ?? selectedId) {
      await loadDetail(focusId ?? (selectedId as string));
    }
  };

  const runAction = async (action: () => Promise<PayrollPeriodDetail>, message: string) => {
    setIsBusy(true);
    setActionError("");
    setStatusMessage("");
    try {
      const updated = await action();
      setStatusMessage(message);
      setDetail(updated);
      await refreshAll(updated.id);
    } catch (actionError_: unknown) {
      setActionError(
        getPayrollError(actionError_, "No pudimos completar la operacion."),
      );
    } finally {
      setIsBusy(false);
    }
  };

  if (selectedId) {
    const isDraft = detail?.status === "DRAFT";

    return (
      <div>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2"
          onClick={() => {
            setSelectedId(null);
            setStatusMessage("");
            setActionError("");
          }}
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Volver a nomina
        </button>

        {detail ? (
          <>
            <header className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-3xl font-medium text-white sm:text-4xl">
                    {detail.name}
                  </h1>
                  <StatusBadge status={detail.status} />
                </div>
                <p className="mt-3 text-sm text-white/45">
                  {detail.startDate} - {detail.endDate}
                  {detail.closedAt ? ` · Cerrado ${formatAdminDateTime(detail.closedAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage && isDraft ? (
                  <Button
                    variant="primary-on-dark"
                    className="min-h-10 rounded-lg px-3"
                    isLoading={isBusy}
                    onClick={() =>
                      void runAction(
                        () => payrollService.calculate(detail.id),
                        "Nomina calculada.",
                      )
                    }
                  >
                    <Calculator aria-hidden="true" size={15} />
                    Calcular / Recalcular
                  </Button>
                ) : null}
                {canClose && isDraft ? (
                  <Button
                    variant="outline-on-dark"
                    className="min-h-10 rounded-lg border-white/10 px-3"
                    disabled={isBusy}
                    onClick={() => {
                      setActionError("");
                      void runAction(
                        () => payrollService.close(detail.id),
                        "Periodo cerrado. Los recibos quedan como snapshot historico.",
                      );
                    }}
                  >
                    <Lock aria-hidden="true" size={15} />
                    Cerrar periodo
                  </Button>
                ) : null}
              </div>
            </header>

            <p className="mt-5 min-h-5 text-sm text-white/65" aria-live="polite">
              {statusMessage}
            </p>
            {actionError ? (
              <div className="admin-empty-panel mt-3 px-5 py-4" role="alert">
                <p className="text-sm font-medium text-white">{actionError}</p>
              </div>
            ) : null}

            <section className="admin-panel mt-3 grid gap-4 p-5 sm:grid-cols-3" aria-label="Resumen">
              <div>
                <p className="text-xs text-white/35">Empleados incluidos</p>
                <p className="mt-2 text-2xl font-medium text-white">
                  {detail.employeeCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/35">Total nomina (neto)</p>
                <p className="mt-2 text-2xl font-medium text-white">
                  {formatAdminMoney(detail.totalNet)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/35">Pendientes de revision</p>
                <p
                  className={`mt-2 text-2xl font-medium ${detail.requiresReviewCount > 0 ? "text-red-300" : "text-white"}`}
                >
                  {detail.requiresReviewCount}
                </p>
              </div>
            </section>

            <section className="mt-6" aria-labelledby="slips-heading">
              <h2 id="slips-heading" className="text-lg font-medium text-white">
                Recibos
              </h2>
              {detail.slips.length === 0 ? (
                <div className="admin-empty-panel mt-4 px-5 py-8">
                  <p className="text-sm font-medium text-white">
                    Todavia no hay recibos calculados.
                  </p>
                  {canManage ? (
                    <p className="mt-2 text-sm text-white/45">
                      Usa Calcular para generar los recibos del periodo.
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="admin-table-wrap mt-4 hidden lg:block">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Empleado</th>
                          <th>Puesto</th>
                          <th>Salario base</th>
                          <th>Pres.</th>
                          <th>Tard.</th>
                          <th>Aus.</th>
                          <th>Just.</th>
                          <th>Ajuste</th>
                          <th>Neto</th>
                          <th>Estado</th>
                          <th><span className="sr-only">Acciones</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.slips.map((slip) => (
                          <tr key={slip.id}>
                            <td>
                              <button
                                type="button"
                                className="font-medium text-white underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2"
                                onClick={() => setSlipToView(slip)}
                              >
                                {slip.employeeName}
                              </button>
                              <p className="font-mono text-xs text-white/35">
                                {slip.employeeCode}
                              </p>
                            </td>
                            <td>{slip.positionName}</td>
                            <td>{formatAdminMoney(slip.grossAmount)}</td>
                            <td>{slip.presentDays}</td>
                            <td>{slip.lateDays}</td>
                            <td>{slip.absentDays}</td>
                            <td>{slip.excusedDays}</td>
                            <td>{formatAdminMoney(slip.adjustmentsAmount)}</td>
                            <td className="font-medium text-white">
                              {formatAdminMoney(slip.netAmount)}
                            </td>
                            <td>
                              {slip.requiresReview ? (
                                <span className="inline-flex min-h-7 items-center rounded-full border border-red-400/30 bg-red-400/10 px-2.5 text-xs font-medium text-red-300">
                                  Revision
                                </span>
                              ) : (
                                <span className="inline-flex min-h-7 items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-xs font-medium text-emerald-300">
                                  OK
                                </span>
                              )}
                            </td>
                            <td className="text-right">
                              {canManage && isDraft ? (
                                <Button
                                  variant="outline-on-dark"
                                  className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                                  onClick={() => {
                                    setSlipToAdjust(slip);
                                    setStatusMessage("");
                                    setActionError("");
                                  }}
                                >
                                  <Pencil aria-hidden="true" size={14} />
                                  Ajustar
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 lg:hidden">
                    {detail.slips.map((slip) => (
                      <article key={slip.id} className="admin-panel p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {slip.employeeName}
                            </p>
                            <p className="mt-1 font-mono text-xs text-white/40">
                              {slip.employeeCode}
                            </p>
                          </div>
                          {slip.requiresReview ? (
                            <span className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-300">
                              Revision
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                              OK
                            </span>
                          )}
                        </div>
                        <dl className="mt-4 grid gap-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <dt className="text-white/38">Neto</dt>
                            <dd className="font-medium text-white">
                              {formatAdminMoney(slip.netAmount)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-white/38">Asistencia</dt>
                            <dd className="text-white/70">
                              P{slip.presentDays} · T{slip.lateDays} · A{slip.absentDays} · J
                              {slip.excusedDays}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            variant="outline-on-dark"
                            className="w-full rounded-lg border-white/10"
                            onClick={() => setSlipToView(slip)}
                          >
                            Ver detalle
                          </Button>
                          {canManage && isDraft ? (
                            <Button
                              variant="outline-on-dark"
                              className="w-full rounded-lg border-white/10"
                              onClick={() => setSlipToAdjust(slip)}
                            >
                              Ajustar
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : detailError ? (
          <div className="admin-empty-panel mt-8 px-5 py-10 text-center" role="alert">
            <p className="text-lg font-medium text-white">
              No se pudo abrir el periodo.
            </p>
            <p className="mt-2 text-sm text-white/50">{detailError}</p>
          </div>
        ) : (
          <div className="admin-panel mt-8 space-y-2 p-5" role="status">
            <span className="sr-only">Cargando periodo...</span>
            <div className="admin-skeleton h-8 w-52 rounded-md" />
            <div className="admin-skeleton h-24 rounded-md" />
          </div>
        )}

        {slipToView ? (
          <SlipDetailModal
            slip={detail?.slips.find((entry) => entry.id === slipToView.id) ?? slipToView}
            onClose={() => setSlipToView(null)}
          />
        ) : null}

        {slipToAdjust ? (
          <AdjustSlipModal
            slip={detail?.slips.find((entry) => entry.id === slipToAdjust.id) ?? slipToAdjust}
            onClose={() => setSlipToAdjust(null)}
            onAdjusted={(message) => {
              setSlipToAdjust(null);
              setStatusMessage(message);
              void refreshAll();
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Personal / Nomina
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Nomina
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Periodos de pago con snapshot historico de compensacion, asistencia y
            ajustes manuales revisados.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            onClick={() => void loadPeriods()}
            disabled={periods === null}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              variant="primary-on-dark"
              className="rounded-lg px-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <CalendarPlus aria-hidden="true" size={16} />
              Crear periodo
            </Button>
          ) : null}
        </div>
      </header>

      {listError ? (
        <div className="admin-empty-panel mt-6 px-5 py-4" role="alert">
          <p className="text-sm font-medium text-white">{listError}</p>
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="payroll-periods-heading">
        <h2 id="payroll-periods-heading" className="text-lg font-medium text-white">
          Periodos
        </h2>
        <p className="mt-1 text-sm text-white/45">
          {periods ? `${periods.length} periodos` : "Cargando periodos..."}
        </p>

        {periods === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando periodos...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : periods.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <p className="text-sm font-medium text-white">
              Todavia no hay periodos de nomina.
            </p>
            {canManage ? (
              <p className="mt-2 text-sm text-white/45">
                Crea el primer periodo para comenzar.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden lg:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rango</th>
                    <th>Estado</th>
                    <th>Empleados</th>
                    <th>Total neto</th>
                    <th><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td className="font-medium text-white">{period.name}</td>
                      <td className="font-mono text-xs text-white/55">
                        {period.startDate} - {period.endDate}
                      </td>
                      <td>
                        <StatusBadge status={period.status} />
                      </td>
                      <td>{period.employeeCount}</td>
                      <td className="font-medium text-white">
                        {formatAdminMoney(period.totalNet)}
                      </td>
                      <td className="text-right">
                        <Button
                          variant="outline-on-dark"
                          className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                          onClick={() => setSelectedId(period.id)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {periods.map((period) => (
                <article key={period.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {period.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {period.startDate} - {period.endDate}
                      </p>
                    </div>
                    <StatusBadge status={period.status} />
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Empleados</dt>
                      <dd className="text-white/70">{period.employeeCount}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Total neto</dt>
                      <dd className="font-medium text-white">
                        {formatAdminMoney(period.totalNet)}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    variant="outline-on-dark"
                    className="mt-4 w-full rounded-lg border-white/10"
                    onClick={() => setSelectedId(period.id)}
                  >
                    Ver periodo
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mt-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Volver al dashboard
        </Link>
      </div>

      {isCreateOpen ? (
        <CreatePeriodDialog
          onClose={() => setIsCreateOpen(false)}
          onCreated={(period) => {
            setIsCreateOpen(false);
            setSelectedId(period.id);
          }}
        />
      ) : null}
    </div>
  );
}
