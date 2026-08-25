"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  LogIn,
  LogOut,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui";
import { AdminServiceError } from "@/lib/services/adminService";
import { attendanceService } from "@/lib/services/attendanceService";
import { employeeService } from "@/lib/services/employeeService";
import type {
  AttendanceFilters,
  AttendanceRecord,
  AttendanceStatus,
  EmployeeSummary,
  OverrideAttendanceInput,
} from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { AdminModal } from "../AdminModal";
import { getAdminActionError, getTodayDate } from "../employees/employeeUi";
import {
  attendanceStatusLabels,
  attendanceStatusStyles,
  formatAttendanceDateTime,
  formatAttendanceWorkDate,
  formatExpectedShift,
  getEmployeeDisplayName,
  getLateLabel,
  toDateTimeLocalValue,
} from "./attendanceUi";

type AttendancePageProps = {
  initialFilters?: AttendanceFilters;
};

type AttendanceAction =
  | { type: "clock-in"; record?: never }
  | { type: "clock-out"; record?: AttendanceRecord }
  | { type: "override"; record: AttendanceRecord }
  | null;

const statusOptions: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

function getAttendanceError(error: unknown, fallback: string) {
  if (!(error instanceof AdminServiceError)) {
    return fallback;
  }

  if (error.status === 401) {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }
  if (error.status === 403) {
    return "No tienes permiso para realizar esta accion.";
  }
  if (error.status === 404) {
    return "El registro o empleado ya no esta disponible.";
  }
  if (error.status === 409) {
    const message = error.message.toLowerCase();

    if (message.includes("shift") || message.includes("turno")) {
      return "Este empleado no tiene turno asignado para esta fecha.";
    }
    if (message.includes("work day") || message.includes("laboral")) {
      return "Hoy no es un dia laboral para el turno asignado.";
    }
    if (message.includes("open attendance")) {
      return "No existe una jornada abierta para registrar salida.";
    }
    if (message.includes("already exists") || message.includes("duplicate")) {
      return "La entrada ya fue registrada.";
    }

    return "La operacion entra en conflicto con el estado actual. Actualiza e intenta de nuevo.";
  }
  if (error.status === 400 || error.status === 422) {
    return "Revisa los datos ingresados e intenta nuevamente.";
  }

  return fallback;
}

function getInitialFilters(filters?: AttendanceFilters): AttendanceFilters {
  return {
    date: filters?.date || getTodayDate(),
    employeeId: filters?.employeeId ?? "",
    status: filters?.status ?? "",
  };
}

function toQueryString(filters: AttendanceFilters) {
  const query = new URLSearchParams();

  if (filters.date) {
    query.set("date", filters.date);
  }
  if (filters.employeeId) {
    query.set("employeeId", filters.employeeId);
  }
  if (filters.status) {
    query.set("status", filters.status);
  }

  return query.toString();
}

function toIsoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return new Date(text).toISOString();
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${attendanceStatusStyles[status]}`}
    >
      {attendanceStatusLabels[status]}
    </span>
  );
}

function AttendanceSummary({ records }: { records: AttendanceRecord[] | null }) {
  const summary = useMemo(() => {
    const list = records ?? [];

    return {
      total: list.length,
      present: list.filter((record) => record.status === "PRESENT").length,
      late: list.filter((record) => record.status === "LATE").length,
      open: list.filter((record) => record.clockInAt && !record.clockOutAt).length,
    };
  }, [records]);

  const items = [
    { label: "Registros", value: records ? summary.total : "-" },
    { label: "Presentes", value: records ? summary.present : "-" },
    { label: "Tarde", value: records ? summary.late : "-" },
    { label: "Abiertas", value: records ? summary.open : "-" },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="admin-panel min-h-24 px-4 py-4 sm:px-5"
        >
          <dt className="text-xs text-white/38">{item.label}</dt>
          <dd className="mt-3 text-2xl font-medium text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AttendanceDesktopTable({
  records,
  canRecord,
  canOverride,
  onAction,
}: {
  records: AttendanceRecord[];
  canRecord: boolean;
  canOverride: boolean;
  onAction: (action: AttendanceAction) => void;
}) {
  return (
    <div className="admin-table-wrap hidden lg:block">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Turno</th>
            <th>Estado</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Tardanza</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <p className="font-medium text-white">
                  {getEmployeeDisplayName(record.employee)}
                </p>
                <p className="mt-1 font-mono text-xs text-white/35">
                  {record.employee.code}
                </p>
              </td>
              <td>
                <p className="max-w-60 text-white/72">
                  {record.expectedShiftName ?? "Sin snapshot"}
                </p>
                <p className="mt-1 text-xs text-white/38">
                  {record.expectedStartTime && record.expectedEndTime
                    ? `${record.expectedStartTime} - ${record.expectedEndTime}`
                    : "Horario no registrado"}
                  {record.expectedCrossesMidnight ? " · nocturno" : ""}
                </p>
              </td>
              <td>
                <AttendanceStatusBadge status={record.status} />
              </td>
              <td>{formatAttendanceDateTime(record.clockInAt)}</td>
              <td>{formatAttendanceDateTime(record.clockOutAt)}</td>
              <td>{getLateLabel(record.lateMinutes)}</td>
              <td>{formatAttendanceWorkDate(record.workDate)}</td>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  {canRecord &&
                  record.employee.isActive &&
                  record.clockInAt &&
                  !record.clockOutAt ? (
                    <Button
                      variant="outline-on-dark"
                      className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                      onClick={() => onAction({ type: "clock-out", record })}
                    >
                      <LogOut aria-hidden="true" size={14} />
                      Salida
                    </Button>
                  ) : null}
                  {canOverride ? (
                    <Button
                      variant="outline-on-dark"
                      className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                      onClick={() => onAction({ type: "override", record })}
                    >
                      <Pencil aria-hidden="true" size={14} />
                      Corregir
                    </Button>
                  ) : null}
                  {!canRecord && !canOverride ? (
                    <span className="text-xs text-white/35">Solo lectura</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceMobileCards({
  records,
  canRecord,
  canOverride,
  onAction,
}: {
  records: AttendanceRecord[];
  canRecord: boolean;
  canOverride: boolean;
  onAction: (action: AttendanceAction) => void;
}) {
  return (
    <div className="grid gap-3 lg:hidden">
      {records.map((record) => (
        <article key={record.id} className="admin-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-white">
                {getEmployeeDisplayName(record.employee)}
              </p>
              <p className="mt-1 font-mono text-xs text-white/35">
                {record.employee.code}
              </p>
            </div>
            <AttendanceStatusBadge status={record.status} />
          </div>
          <p className="mt-4 text-sm text-white/70">{formatExpectedShift(record)}</p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white/38">Fecha</dt>
              <dd className="text-right text-white/72">
                {formatAttendanceWorkDate(record.workDate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white/38">Entrada</dt>
              <dd className="text-right text-white/72">
                {formatAttendanceDateTime(record.clockInAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white/38">Salida</dt>
              <dd className="text-right text-white/72">
                {formatAttendanceDateTime(record.clockOutAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white/38">Tardanza</dt>
              <dd className="text-right text-white/72">
                {getLateLabel(record.lateMinutes)}
              </dd>
            </div>
          </dl>
          {canRecord || canOverride ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {canRecord &&
              record.employee.isActive &&
              record.clockInAt &&
              !record.clockOutAt ? (
                <Button
                  variant="outline-on-dark"
                  className="rounded-lg border-white/10"
                  onClick={() => onAction({ type: "clock-out", record })}
                >
                  <LogOut aria-hidden="true" size={15} />
                  Registrar salida
                </Button>
              ) : null}
              {canOverride ? (
                <Button
                  variant="outline-on-dark"
                  className="rounded-lg border-white/10"
                  onClick={() => onAction({ type: "override", record })}
                >
                  <Pencil aria-hidden="true" size={15} />
                  Corregir asistencia
                </Button>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AttendancePage({ initialFilters }: AttendancePageProps) {
  const identity = useAdminIdentity();
  const router = useRouter();
  const canRecord = identity.permissions.includes("attendance.record");
  const canOverride = identity.permissions.includes("attendance.override");
  const [filters, setFilters] = useState<AttendanceFilters>(() =>
    getInitialFilters(initialFilters),
  );
  const [draftFilters, setDraftFilters] = useState<AttendanceFilters>(() =>
    getInitialFilters(initialFilters),
  );
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [action, setAction] = useState<AttendanceAction>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clockableEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive),
    [employees],
  );

  const loadAttendance = useCallback(
    async (nextFilters: AttendanceFilters, signal?: AbortSignal) => {
      setIsLoading(true);
      setError("");

      try {
        const result = await attendanceService.list(nextFilters, signal);
        setRecords(result);
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(getAttendanceError(loadError, "No se pudo cargar la asistencia."));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void employeeService
      .list({ status: "all" }, controller.signal)
      .then(setEmployees)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          getAdminActionError(
            loadError,
            "No se pudo cargar la lista de empleados.",
          ),
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void loadAttendance(filters, controller.signal);
    });
    return () => controller.abort();
  }, [filters, loadAttendance]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters: AttendanceFilters = {
      date: draftFilters.date || "",
      employeeId: draftFilters.employeeId || "",
      status: (draftFilters.status || "") as AttendanceStatus | "",
    };
    const query = toQueryString(nextFilters);

    setFilters(nextFilters);
    router.replace(query ? `/admin/attendance?${query}` : "/admin/attendance");
  };

  const clearFilters = () => {
    const nextFilters = getInitialFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    router.replace(`/admin/attendance?${toQueryString(nextFilters)}`);
  };

  const closeAction = () => {
    if (!isSubmitting) {
      setAction(null);
      setFormError("");
    }
  };

  const handleClockSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!action || action.type === "override" || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const employeeId =
      action.record?.employeeId || String(formData.get("employeeId") ?? "");

    if (!employeeId) {
      setFormError("Selecciona un empleado.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage(
      action.type === "clock-in"
        ? "Registrando entrada..."
        : "Registrando salida...",
    );

    try {
      if (action.type === "clock-in") {
        await attendanceService.clockIn({ employeeId });
        setStatusMessage("Entrada registrada.");
      } else {
        await attendanceService.clockOut({ employeeId });
        setStatusMessage("Salida registrada.");
      }
      setAction(null);
      await loadAttendance(filters);
    } catch (submitError: unknown) {
      setFormError(
        getAttendanceError(
          submitError,
          action.type === "clock-in"
            ? "No se pudo registrar la entrada."
            : "No se pudo registrar la salida.",
        ),
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverrideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!action || action.type !== "override" || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const adjustmentReason = String(formData.get("adjustmentReason") ?? "").trim();

    if (!adjustmentReason) {
      setFormError("Indica el motivo del ajuste.");
      return;
    }

    const input: OverrideAttendanceInput = {
      clockInAt: toIsoOrNull(formData.get("clockInAt")),
      clockOutAt: toIsoOrNull(formData.get("clockOutAt")),
      status: String(formData.get("status") ?? "") as AttendanceStatus,
      notes: String(formData.get("notes") ?? "").trim() || null,
      adjustmentReason,
    };

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("Guardando correccion...");

    try {
      await attendanceService.override(action.record.id, input);
      setStatusMessage("Asistencia corregida.");
      setAction(null);
      await loadAttendance(filters);
    } catch (submitError: unknown) {
      setFormError(
        getAttendanceError(submitError, "No se pudo corregir la asistencia."),
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
            Personal / Asistencia
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Asistencia
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Consulta fichajes por jornada laboral y registra entradas o salidas
            administrativas sin enviar timestamps desde el navegador.
          </p>
        </div>
        {canRecord ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="primary-on-dark"
              className="rounded-lg"
              disabled={clockableEmployees.length === 0}
              onClick={() => setAction({ type: "clock-in" })}
            >
              <LogIn aria-hidden="true" size={16} />
              Registrar entrada
            </Button>
            <Button
              variant="outline-on-dark"
              className="rounded-lg border-white/10"
              disabled={clockableEmployees.length === 0}
              onClick={() => setAction({ type: "clock-out" })}
            >
              <LogOut aria-hidden="true" size={16} />
              Registrar salida
            </Button>
          </div>
        ) : null}
      </header>

      <section className="mt-8" aria-label="Resumen de asistencia">
        <AttendanceSummary records={records} />
      </section>

      <section className="admin-panel mt-4 p-4 sm:p-5" aria-labelledby="attendance-filters">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/65">
            <CalendarDays aria-hidden="true" size={17} />
          </span>
          <div>
            <h2 id="attendance-filters" className="text-base font-medium text-white">
              Filtros
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/45">
              La fecha corresponde a la jornada laboral devuelta por backend.
            </p>
          </div>
        </div>

        <form
          className="mt-5 grid gap-3 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1.2fr)_minmax(10rem,0.8fr)_auto]"
          onSubmit={applyFilters}
        >
          <label className="admin-form-label">
            Fecha
            <input
              className="admin-form-control"
              type="date"
              value={draftFilters.date ?? ""}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </label>
          <label className="admin-form-label">
            Empleado
            <select
              className="admin-form-control"
              value={draftFilters.employeeId ?? ""}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  employeeId: event.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {getEmployeeDisplayName(employee)} - {employee.code}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-label">
            Estado
            <select
              className="admin-form-control"
              value={draftFilters.status ?? ""}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as AttendanceStatus | "",
                }))
              }
            >
              <option value="">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {attendanceStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              variant="primary-on-dark"
              className="min-h-11 flex-1 rounded-lg px-4 lg:flex-none"
            >
              Aplicar
            </Button>
            <Button
              variant="outline-on-dark"
              className="min-h-11 rounded-lg border-white/10 px-3"
              onClick={clearFilters}
              aria-label="Limpiar filtros"
            >
              <RotateCcw aria-hidden="true" size={16} />
            </Button>
          </div>
        </form>
      </section>

      <p
        className="mt-4 min-h-5 text-sm text-white/60"
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>

      <section className="mt-3" aria-labelledby="attendance-list">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="attendance-list" className="text-lg font-medium text-white">
              Listado del dia
            </h2>
            <p className="mt-1 text-sm text-white/45">
              {records
                ? `${records.length} ${records.length === 1 ? "registro" : "registros"}`
                : "Cargando registros..."}
            </p>
          </div>
        </div>

        {isLoading && !records ? (
          <div className="grid gap-3" role="status">
            <span className="sr-only">Cargando asistencia...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : error ? (
          <div className="admin-empty-panel px-5 py-7">
            <p className="text-sm font-medium text-white" role="alert">
              {error}
            </p>
            <Button
              variant="outline-on-dark"
              className="mt-5 rounded-lg border-white/10"
              onClick={() => void loadAttendance(filters)}
            >
              Reintentar
            </Button>
          </div>
        ) : records && records.length > 0 ? (
          <>
            <AttendanceDesktopTable
              records={records}
              canRecord={canRecord}
              canOverride={canOverride}
              onAction={setAction}
            />
            <AttendanceMobileCards
              records={records}
              canRecord={canRecord}
              canOverride={canOverride}
              onAction={setAction}
            />
          </>
        ) : (
          <div className="admin-empty-panel px-5 py-7">
            <p className="text-sm font-medium text-white">
              No hay registros para estos filtros.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              ARTECH no marca ausencias automaticamente desde el frontend.
            </p>
          </div>
        )}
      </section>

      {action?.type === "clock-in" || action?.type === "clock-out" ? (
        <AdminModal
          open
          title={
            action.type === "clock-in"
              ? "Registrar entrada"
              : "Registrar salida"
          }
          description="El servidor determinara la hora real del fichaje."
          onClose={closeAction}
        >
          <form className="space-y-5" onSubmit={handleClockSubmit}>
            {action.record ? (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="text-sm font-medium text-white">
                  {getEmployeeDisplayName(action.record.employee)}
                </p>
                <p className="mt-1 font-mono text-xs text-white/35">
                  {action.record.employee.code}
                </p>
              </div>
            ) : (
              <label className="admin-form-label">
                Empleado activo
                <select className="admin-form-control" name="employeeId" required>
                  <option value="">Selecciona un empleado</option>
                  {clockableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {getEmployeeDisplayName(employee)} - {employee.code}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {clockableEmployees.length === 0 ? (
              <p className="text-sm leading-6 text-white/50">
                No hay empleados activos disponibles para fichaje.
              </p>
            ) : null}

            <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
              {formError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={closeAction}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary-on-dark"
                className="rounded-lg"
                isLoading={isSubmitting}
                loadingLabel={
                  action.type === "clock-in"
                    ? "Registrando..."
                    : "Cerrando jornada..."
                }
              >
                {action.type === "clock-in" ? (
                  <>
                    <LogIn aria-hidden="true" size={15} />
                    Registrar entrada
                  </>
                ) : (
                  <>
                    <LogOut aria-hidden="true" size={15} />
                    Registrar salida
                  </>
                )}
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {action?.type === "override" ? (
        <AdminModal
          open
          title="Corregir asistencia"
          description="Los cambios manuales quedan registrados."
          onClose={closeAction}
        >
          <form className="space-y-5" onSubmit={handleOverrideSubmit}>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-sm font-medium text-white">
                {getEmployeeDisplayName(action.record.employee)}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {formatExpectedShift(action.record)}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-form-label">
                Entrada
                <input
                  className="admin-form-control"
                  name="clockInAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(action.record.clockInAt)}
                />
              </label>
              <label className="admin-form-label">
                Salida
                <input
                  className="admin-form-control"
                  name="clockOutAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(action.record.clockOutAt)}
                />
              </label>
              <label className="admin-form-label">
                Estado
                <select
                  className="admin-form-control"
                  name="status"
                  defaultValue={action.record.status}
                  required
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {attendanceStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-form-label sm:col-span-2">
                Notas <span className="text-white/35">(opcional)</span>
                <textarea
                  className="admin-form-control min-h-24 resize-y"
                  name="notes"
                  defaultValue={action.record.notes ?? ""}
                  maxLength={500}
                />
              </label>
              <label className="admin-form-label sm:col-span-2">
                Motivo del ajuste
                <textarea
                  className="admin-form-control min-h-24 resize-y"
                  name="adjustmentReason"
                  defaultValue={action.record.adjustmentReason ?? ""}
                  maxLength={500}
                  required
                />
              </label>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/50">
              Esta correccion guardara tu usuario administrativo como responsable del
              ajuste.
            </div>
            <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
              {formError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={closeAction}
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
                Guardar correccion
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </div>
  );
}
