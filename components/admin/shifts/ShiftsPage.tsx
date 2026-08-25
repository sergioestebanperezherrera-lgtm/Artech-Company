"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { shiftService } from "@/lib/services/employeeService";
import type { Shift, ShiftType, Weekday } from "@/lib/types";
import { AdminModal } from "../AdminModal";
import { useAdminIdentity } from "../AdminContext";
import { getAdminActionError } from "../employees/employeeUi";
import {
  formatShiftDays,
  formatShiftSchedule,
  getShiftStatusLabel,
  shiftTypeLabels,
  weekdayLongLabels,
  weekdayOrder,
} from "./shiftUi";

type ShiftDialogState =
  | { mode: "create" }
  | { mode: "edit"; shift: Shift }
  | null;

const shiftTypeOptions: ShiftType[] = ["DAY", "EVENING", "NIGHT"];

function buildShiftInput(formData: FormData) {
  const workDays = formData.getAll("workDays").map(String) as Weekday[];

  return {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    type: String(formData.get("type") ?? "") as ShiftType,
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    workDays,
  };
}

export function ShiftsPage() {
  const identity = useAdminIdentity();
  const canManage = identity.permissions.includes("shift.manage");
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [dialog, setDialog] = useState<ShiftDialogState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyShiftId, setBusyShiftId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const activeCount = useMemo(
    () => shifts?.filter((shift) => shift.isActive).length ?? 0,
    [shifts],
  );

  const loadShifts = () => {
    const controller = new AbortController();

    void shiftService
      .list(controller.signal)
      .then(setShifts)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setShifts([]);
        setError(getAdminActionError(loadError, "No se pudieron cargar los turnos."));
      });

    return controller;
  };

  useEffect(() => {
    const controller = loadShifts();
    return () => controller.abort();
  }, []);

  const closeDialog = () => {
    if (!isSubmitting) {
      setDialog(null);
      setError("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dialog || isSubmitting) {
      return;
    }

    const input = buildShiftInput(new FormData(event.currentTarget));

    if (input.workDays.length === 0) {
      setError("Selecciona al menos un dia laboral.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStatusMessage("");

    try {
      if (dialog.mode === "create") {
        await shiftService.create(input);
        setStatusMessage("El turno fue creado correctamente.");
      } else {
        await shiftService.update(dialog.shift.id, input);
        setStatusMessage("El turno fue actualizado correctamente.");
      }

      setDialog(null);
      loadShifts();
    } catch (submitError) {
      setError(
        getAdminActionError(
          submitError,
          "No pudimos guardar el turno. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShift = async (shift: Shift) => {
    if (busyShiftId) {
      return;
    }

    setBusyShiftId(shift.id);
    setError("");
    setStatusMessage("");

    try {
      await shiftService.update(shift.id, { isActive: !shift.isActive });
      setStatusMessage(
        shift.isActive ? "El turno fue desactivado." : "El turno fue activado.",
      );
      loadShifts();
    } catch (updateError) {
      setError(
        getAdminActionError(updateError, "No pudimos cambiar el estado del turno."),
      );
    } finally {
      setBusyShiftId(null);
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase text-white/45">Personal</p>
          <h1 className="mt-3 text-3xl font-medium text-white sm:text-4xl">
            Turnos
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50 sm:text-base">
            Define horarios base y dias laborales para asignarlos al empleo activo.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="primary-on-dark"
            className="min-h-11 rounded-lg px-4"
            onClick={() => {
              setError("");
              setDialog({ mode: "create" });
            }}
          >
            <Plus aria-hidden="true" size={17} />
            Nuevo turno
          </Button>
        ) : null}
      </header>

      <div className="mt-6 min-h-6 text-sm" aria-live="polite">
        {error ? <p role="alert" className="text-white/70">{error}</p> : null}
        {!error && statusMessage ? <p className="text-white/60">{statusMessage}</p> : null}
      </div>

      <section className="admin-panel mt-3 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-white/35">Turnos activos</p>
          <p className="mt-2 text-2xl font-medium text-white">{activeCount}</p>
        </div>
        <div>
          <p className="text-xs text-white/35">Total configurado</p>
          <p className="mt-2 text-2xl font-medium text-white">{shifts?.length ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-white/35">Regla de historial</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Una asignacion abierta por empleo.
          </p>
        </div>
      </section>

      {shifts === null ? (
        <div className="admin-panel mt-4 space-y-1 p-5" role="status">
          <span className="sr-only">Cargando turnos...</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className="admin-skeleton h-16 rounded-md" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="admin-empty-panel mt-4 px-5 py-10 text-center">
          <p className="text-sm font-medium text-white">Todavia no hay turnos.</p>
          <p className="mt-2 text-sm text-white/45">
            Crea el primero para asignarlo a empleados activos.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap mt-4">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Turno</th>
                <th scope="col">Tipo</th>
                <th scope="col">Horario</th>
                <th scope="col">Dias</th>
                <th scope="col">Estado</th>
                {canManage ? <th scope="col">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td>
                    <div className="min-w-0">
                      <p className="font-medium text-white">{shift.name}</p>
                      <p className="mt-1 font-mono text-xs text-white/35">
                        {shift.code}
                      </p>
                    </div>
                  </td>
                  <td>{shiftTypeLabels[shift.type]}</td>
                  <td>{formatShiftSchedule(shift)}</td>
                  <td>{formatShiftDays(shift.workDays)}</td>
                  <td>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                      {getShiftStatusLabel(shift.isActive)}
                    </span>
                  </td>
                  {canManage ? (
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline-on-dark"
                          className="min-h-9 rounded-lg border-white/10 px-3"
                          onClick={() => {
                            setError("");
                            setDialog({ mode: "edit", shift });
                          }}
                        >
                          <Pencil aria-hidden="true" size={14} />
                          Editar
                        </Button>
                        <Button
                          variant="outline-on-dark"
                          className="min-h-9 rounded-lg border-white/10 px-3"
                          disabled={busyShiftId === shift.id}
                          isLoading={busyShiftId === shift.id}
                          loadingLabel="Guardando..."
                          onClick={() => void toggleShift(shift)}
                        >
                          {shift.isActive ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog ? (
        <AdminModal
          open
          title={dialog.mode === "edit" ? "Editar turno" : "Nuevo turno"}
          description="Los turnos definen el horario y los dias de cada jornada laboral."
          onClose={closeDialog}
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-form-label">
                Nombre
                <input
                  className="admin-form-control"
                  name="name"
                  defaultValue={dialog.mode === "edit" ? dialog.shift.name : ""}
                  maxLength={100}
                  required
                />
              </label>
              <label className="admin-form-label">
                Codigo
                <input
                  className="admin-form-control font-mono uppercase"
                  name="code"
                  defaultValue={dialog.mode === "edit" ? dialog.shift.code : ""}
                  maxLength={32}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                  required
                />
              </label>
              <label className="admin-form-label">
                Tipo
                <select
                  className="admin-form-control"
                  name="type"
                  defaultValue={dialog.mode === "edit" ? dialog.shift.type : "DAY"}
                  required
                >
                  {shiftTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {shiftTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="admin-form-label">
                  Inicio
                  <input
                    className="admin-form-control"
                    name="startTime"
                    type="time"
                    defaultValue={
                      dialog.mode === "edit" ? dialog.shift.startTime : "08:00"
                    }
                    required
                  />
                </label>
                <label className="admin-form-label">
                  Fin
                  <input
                    className="admin-form-control"
                    name="endTime"
                    type="time"
                    defaultValue={
                      dialog.mode === "edit" ? dialog.shift.endTime : "17:00"
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium text-white/58">
                Dias laborales
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {weekdayOrder.map((day) => (
                  <label
                    key={day}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-sm text-white/65"
                  >
                    <input
                      name="workDays"
                      type="checkbox"
                      value={day}
                      defaultChecked={
                        dialog.mode === "edit"
                          ? dialog.shift.workDays.includes(day)
                          : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(day)
                      }
                    />
                    {weekdayLongLabels[day]}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
              {error}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isSubmitting}
                onClick={closeDialog}
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
                Guardar turno
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </div>
  );
}
