"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Clock3,
  DollarSign,
  Pencil,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui";
import { AdminServiceError } from "@/lib/services/adminService";
import { attendanceService } from "@/lib/services/attendanceService";
import {
  employeeService,
  positionService,
  shiftService,
} from "@/lib/services/employeeService";
import type {
  AttendanceRecord,
  CompensationPeriod,
  EmployeeCompensation,
  EmployeeDetail,
  EmployeeShifts,
  PayFrequency,
  Position,
  Shift,
} from "@/lib/types";
import { AdminModal } from "../AdminModal";
import { useAdminIdentity } from "../AdminContext";
import {
  attendanceStatusLabels,
  attendanceStatusStyles,
  formatAttendanceDateTime,
  formatAttendanceWorkDate,
  getLateLabel,
} from "../attendance/attendanceUi";
import {
  formatShiftDays,
  formatShiftSchedule,
  shiftTypeLabels,
} from "../shifts/shiftUi";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import {
  addDays,
  formatAdminDate,
  getAdminActionError,
  getTodayDate,
} from "./employeeUi";

type EmployeeAction = "edit" | "change" | "terminate" | "reactivate" | null;
type CompensationAction = "assign" | "change" | null;
type ShiftAction = "assign" | "change" | null;

type EmployeeDetailPageProps = {
  employeeId: string;
};

const actionCopy: Record<Exclude<EmployeeAction, null>, { title: string; description: string }> = {
  edit: {
    title: "Editar empleado",
    description: "Actualiza unicamente los datos de contacto y perfil.",
  },
  change: {
    title: "Cambiar puesto",
    description: "El empleo actual se cerrara y el nuevo quedara activo.",
  },
  terminate: {
    title: "Finalizar relacion laboral",
    description: "El historial se conservara y la cuenta de usuario no sera eliminada.",
  },
  reactivate: {
    title: "Reactivar empleado",
    description: "Crea un nuevo periodo laboral sin alterar el historial anterior.",
  },
};

const payFrequencyLabels: Record<PayFrequency, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
};

function formatCompensationAmount(period: Pick<CompensationPeriod, "amount" | "currency">) {
  if (period.currency !== "GTQ") {
    return `${period.currency} ${period.amount.toFixed(2)}`;
  }

  return `Q${period.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getCompensationError(error: unknown, fallback: string) {
  if (!(error instanceof AdminServiceError)) {
    return fallback;
  }

  if (error.status === 400) {
    return "Revisa el monto y la fecha de vigencia.";
  }
  if (error.status === 401) {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }
  if (error.status === 403) {
    return "No tienes permiso para modificar la compensacion.";
  }
  if (error.status === 404) {
    return "El empleado ya no esta disponible.";
  }
  if (error.status === 409) {
    return "La fecha seleccionada entra en conflicto con el periodo salarial actual.";
  }

  return fallback;
}

function getShiftError(error: unknown, fallback: string) {
  if (!(error instanceof AdminServiceError)) {
    return fallback;
  }

  if (error.status === 400) {
    return "Revisa el turno y la fecha de vigencia.";
  }
  if (error.status === 401) {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }
  if (error.status === 403) {
    return "No tienes permiso para modificar turnos.";
  }
  if (error.status === 404) {
    return "El empleado o turno ya no esta disponible.";
  }
  if (error.status === 409) {
    return "La fecha seleccionada entra en conflicto con el turno actual.";
  }

  return fallback;
}

function validateAmountInput(value: string) {
  const trimmed = value.trim();
  return /^\d+(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
}

export function EmployeeDetailPage({ employeeId }: EmployeeDetailPageProps) {
  const identity = useAdminIdentity();
  const canUpdate = identity.permissions.includes("employee.update");
  const canDeactivate = identity.permissions.includes("employee.deactivate");
  const canReadSalary = identity.permissions.includes("salary.read");
  const canUpdateSalary = identity.permissions.includes("salary.update");
  const canReadShift = identity.permissions.includes("shift.read");
  const canManageShift = identity.permissions.includes("shift.manage");
  const canReadAttendance = identity.permissions.includes("attendance.read");
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [compensation, setCompensation] = useState<EmployeeCompensation | null>(null);
  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShifts | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isCompensationLoading, setIsCompensationLoading] = useState(canReadSalary);
  const [isShiftLoading, setIsShiftLoading] = useState(canReadShift);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(canReadAttendance);
  const [compensationError, setCompensationError] = useState("");
  const [shiftError, setShiftError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [action, setAction] = useState<EmployeeAction>(null);
  const [compensationAction, setCompensationAction] =
    useState<CompensationAction>(null);
  const [shiftAction, setShiftAction] = useState<ShiftAction>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompensationSubmitting, setIsCompensationSubmitting] = useState(false);
  const [isShiftSubmitting, setIsShiftSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [compensationFormError, setCompensationFormError] = useState("");
  const [shiftFormError, setShiftFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadCompensation = useCallback(
    async (signal?: AbortSignal) => {
      if (!canReadSalary) {
        return null;
      }

      setIsCompensationLoading(true);
      setCompensationError("");

      try {
        const result = await employeeService.getCompensation(employeeId, signal);
        setCompensation(result);
        return result;
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return null;
        }
        setCompensationError(
          getCompensationError(
            loadError,
            "No se pudo cargar la compensacion del empleado.",
          ),
        );
        return null;
      } finally {
        setIsCompensationLoading(false);
      }
    },
    [canReadSalary, employeeId],
  );

  const loadEmployeeShifts = useCallback(
    async (signal?: AbortSignal) => {
      if (!canReadShift) {
        return null;
      }

      setIsShiftLoading(true);
      setShiftError("");

      try {
        const result = await employeeService.getShifts(employeeId, signal);
        setEmployeeShifts(result);
        return result;
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return null;
        }
        setShiftError(
          getShiftError(loadError, "No se pudo cargar el turno del empleado."),
        );
        return null;
      } finally {
        setIsShiftLoading(false);
      }
    },
    [canReadShift, employeeId],
  );

  const loadAttendance = useCallback(
    async (signal?: AbortSignal) => {
      if (!canReadAttendance) {
        return null;
      }

      setIsAttendanceLoading(true);
      setAttendanceError("");

      try {
        const result = await attendanceService.listByEmployee(employeeId, {}, signal);
        setAttendance(result.slice(0, 5));
        return result;
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return null;
        }
        setAttendanceError(
          getAdminActionError(
            loadError,
            "No se pudo cargar la asistencia del empleado.",
          ),
        );
        return null;
      } finally {
        setIsAttendanceLoading(false);
      }
    },
    [canReadAttendance, employeeId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      employeeService.get(employeeId, controller.signal),
      positionService.list(controller.signal),
    ])
      .then(([employeeResult, positionResult]) => {
        setEmployee(employeeResult);
        setPositions(positionResult);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          getAdminActionError(loadError, "No se pudo cargar la ficha del empleado."),
        );
      });

    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    const controller = new AbortController();

    if (canReadSalary) {
      void employeeService
        .getCompensation(employeeId, controller.signal)
        .then((result) => {
          setCompensation(result);
          setCompensationError("");
        })
        .catch((loadError: unknown) => {
          if (loadError instanceof DOMException && loadError.name === "AbortError") {
            return;
          }
          setCompensationError(
            getCompensationError(
              loadError,
              "No se pudo cargar la compensacion del empleado.",
            ),
          );
        })
        .finally(() => {
          setIsCompensationLoading(false);
        });
    }

    return () => controller.abort();
  }, [canReadSalary, employeeId]);

  useEffect(() => {
    const controller = new AbortController();

    if (canReadShift) {
      void employeeService
        .getShifts(employeeId, controller.signal)
        .then((result) => {
          setEmployeeShifts(result);
          setShiftError("");
        })
        .catch((loadError: unknown) => {
          if (loadError instanceof DOMException && loadError.name === "AbortError") {
            return;
          }
          setShiftError(
            getShiftError(loadError, "No se pudo cargar el turno del empleado."),
          );
        })
        .finally(() => {
          setIsShiftLoading(false);
        });
    }

    return () => controller.abort();
  }, [canReadShift, employeeId]);

  useEffect(() => {
    const controller = new AbortController();

    if (canReadAttendance) {
      queueMicrotask(() => {
        void loadAttendance(controller.signal);
      });
    }

    return () => controller.abort();
  }, [canReadAttendance, loadAttendance]);

  useEffect(() => {
    const controller = new AbortController();

    if (canManageShift) {
      void shiftService
        .list(controller.signal)
        .then(setShifts)
        .catch((loadError: unknown) => {
          if (loadError instanceof DOMException && loadError.name === "AbortError") {
            return;
          }
          setShiftError(
            getShiftError(loadError, "No se pudo cargar la lista de turnos."),
          );
        });
    }

    return () => controller.abort();
  }, [canManageShift]);

  const closeAction = () => {
    if (!isSubmitting) {
      setAction(null);
      setError("");
    }
  };

  const closeCompensationAction = () => {
    if (!isCompensationSubmitting) {
      setCompensationAction(null);
      setCompensationFormError("");
    }
  };

  const closeShiftAction = () => {
    if (!isShiftSubmitting) {
      setShiftAction(null);
      setShiftFormError("");
    }
  };

  const handleAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!employee || !action || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");
    setStatusMessage("");

    try {
      let updated: EmployeeDetail;

      if (action === "edit") {
        const email = String(formData.get("email") ?? "").trim();
        const phone = String(formData.get("phone") ?? "").trim();
        updated = await employeeService.update(employee.id, {
          firstName: String(formData.get("firstName") ?? "").trim(),
          lastName: String(formData.get("lastName") ?? "").trim(),
          email: email || null,
          phone: phone || null,
        });
        setStatusMessage("Los datos del empleado fueron actualizados.");
      } else if (action === "terminate") {
        const notes = String(formData.get("notes") ?? "").trim();
        updated = await employeeService.terminate(employee.id, {
          endDate: String(formData.get("endDate") ?? ""),
          ...(notes ? { notes } : {}),
        });
        setStatusMessage("La relacion laboral fue finalizada.");
      } else {
        const notes = String(formData.get("notes") ?? "").trim();
        const input = {
          positionId: String(formData.get("positionId") ?? ""),
          startDate: String(formData.get("startDate") ?? ""),
          ...(notes ? { notes } : {}),
        };
        updated =
          action === "change"
            ? await employeeService.changePosition(employee.id, input)
            : await employeeService.reactivate(employee.id, input);
        setStatusMessage(
          action === "change"
            ? "El cambio de puesto quedo registrado."
            : "El empleado fue reactivado.",
        );
      }

      setEmployee(updated);
      if (canReadSalary) {
        void loadCompensation();
      }
      if (canReadShift) {
        void loadEmployeeShifts();
      }
      setAction(null);
    } catch (actionError) {
      setError(
        getAdminActionError(
          actionError,
          "No pudimos completar la operacion. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompensationSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!employee || !compensationAction || isCompensationSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = String(formData.get("amount") ?? "").trim();
    const payFrequency = String(formData.get("payFrequency") ?? "") as PayFrequency;
    const effectiveFrom = String(formData.get("effectiveFrom") ?? "");

    if (!validateAmountInput(amount)) {
      setCompensationFormError("Ingresa un monto mayor a cero con maximo 2 decimales.");
      return;
    }

    setIsCompensationSubmitting(true);
    setCompensationFormError("");
    setStatusMessage("");

    try {
      const updated = await employeeService.createCompensation(employee.id, {
        amount,
        currency: "GTQ",
        payFrequency,
        effectiveFrom,
      });
      setCompensation(updated);
      setCompensationAction(null);
      setStatusMessage(
        compensationAction === "assign"
          ? "El salario fue asignado correctamente."
          : "El cambio salarial fue registrado.",
      );
    } catch (submitError) {
      setCompensationFormError(
        getCompensationError(
          submitError,
          "No pudimos guardar la compensacion. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsCompensationSubmitting(false);
    }
  };

  const handleShiftSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!employee || !shiftAction || isShiftSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const shiftId = String(formData.get("shiftId") ?? "");
    const effectiveFrom = String(formData.get("effectiveFrom") ?? "");

    if (!shiftId) {
      setShiftFormError("Selecciona un turno activo.");
      return;
    }

    setIsShiftSubmitting(true);
    setShiftFormError("");
    setStatusMessage("");

    try {
      const updated = await employeeService.createShiftAssignment(employee.id, {
        shiftId,
        effectiveFrom,
      });
      setEmployeeShifts(updated);
      setShiftAction(null);
      setStatusMessage(
        shiftAction === "assign"
          ? "El turno fue asignado correctamente."
          : "El cambio de turno fue registrado.",
      );
    } catch (submitError) {
      setShiftFormError(
        getShiftError(submitError, "No pudimos guardar el turno. Intenta nuevamente."),
      );
    } finally {
      setIsShiftSubmitting(false);
    }
  };

  if (!employee) {
    return (
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Volver a empleados
        </Link>
        {error ? (
          <div className="admin-empty-panel mt-8 px-5 py-10 text-center">
            <h1 className="text-lg font-medium text-white">No se pudo abrir la ficha.</h1>
            <p className="mt-2 text-sm text-white/50" role="alert">{error}</p>
          </div>
        ) : (
          <div className="admin-panel mt-8 space-y-2 p-5" role="status">
            <span className="sr-only">Cargando ficha...</span>
            <div className="admin-skeleton h-8 w-52 rounded-md" />
            <div className="admin-skeleton h-24 rounded-md" />
          </div>
        )}
      </div>
    );
  }

  const activePositions = positions.filter((position) => position.isActive);
  const changePositions = activePositions.filter(
    (position) => position.id !== employee.currentEmployment?.position.id,
  );
  const latestEmployment = employee.employments[0] ?? null;
  const minimumChangeDate = employee.currentEmployment
    ? addDays(employee.currentEmployment.startDate, 1)
    : getTodayDate();
  const minimumReactivationDate = latestEmployment?.endDate
    ? addDays(latestEmployment.endDate, 1)
    : getTodayDate();
  const currentCompensation = compensation?.current ?? null;
  const canMutateCompensation =
    canUpdateSalary && employee.isActive && Boolean(employee.currentEmployment);
  const minimumCompensationDate = currentCompensation
    ? addDays(currentCompensation.effectiveFrom, 1)
    : employee.currentEmployment?.startDate ?? getTodayDate();
  const currentShiftAssignment = employeeShifts?.current ?? null;
  const activeShifts = shifts.filter((shift) => shift.isActive);
  const selectableShifts = activeShifts.filter(
    (shift) => shift.id !== currentShiftAssignment?.shiftId,
  );
  const canMutateShift =
    canManageShift && employee.isActive && Boolean(employee.currentEmployment);
  const minimumShiftDate = currentShiftAssignment
    ? addDays(currentShiftAssignment.effectiveFrom, 1)
    : employee.currentEmployment?.startDate ?? getTodayDate();

  return (
    <div>
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Volver a empleados
      </Link>

      <header className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs text-white/40">{employee.code}</p>
            <EmployeeStatusBadge active={employee.isActive} />
          </div>
          <h1 className="mt-3 break-words text-3xl font-medium text-white sm:text-4xl">
            {employee.name}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            {employee.currentEmployment?.position.name ?? "Sin puesto activo"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Button
              variant="outline-on-dark"
              className="min-h-10 rounded-lg border-white/10 px-3"
              onClick={() => setAction("edit")}
            >
              <Pencil aria-hidden="true" size={15} />
              Editar
            </Button>
          ) : null}
          {employee.isActive && canUpdate ? (
            <Button
              variant="outline-on-dark"
              className="min-h-10 rounded-lg border-white/10 px-3"
              disabled={changePositions.length === 0}
              onClick={() => setAction("change")}
            >
              <BriefcaseBusiness aria-hidden="true" size={15} />
              Cambiar puesto
            </Button>
          ) : null}
          {employee.isActive && canDeactivate ? (
            <Button
              variant="outline-on-dark"
              className="min-h-10 rounded-lg border-white/10 px-3"
              onClick={() => setAction("terminate")}
            >
              <UserMinus aria-hidden="true" size={15} />
              Finalizar relacion
            </Button>
          ) : null}
          {!employee.isActive && canUpdate ? (
            <Button
              variant="primary-on-dark"
              className="min-h-10 rounded-lg px-3"
              disabled={activePositions.length === 0}
              onClick={() => setAction("reactivate")}
            >
              <UserCheck aria-hidden="true" size={15} />
              Reactivar
            </Button>
          ) : null}
        </div>
      </header>

      <p className="mt-5 min-h-5 text-sm text-white/65" aria-live="polite">
        {statusMessage}
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <section className="admin-panel p-5 lg:col-span-2" aria-labelledby="employee-profile">
          <h2 id="employee-profile" className="text-base font-medium text-white">Perfil</h2>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-white/35">Email</dt>
              <dd className="mt-1 break-words text-sm text-white/75">
                {employee.email ?? "No registrado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Telefono</dt>
              <dd className="mt-1 text-sm text-white/75">
                {employee.phone ?? "No registrado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Puesto actual</dt>
              <dd className="mt-1 text-sm text-white/75">
                {employee.currentEmployment?.position.name ?? "Sin puesto activo"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Inicio del periodo</dt>
              <dd className="mt-1 text-sm text-white/75">
                {formatAdminDate(employee.currentEmployment?.startDate ?? null)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel p-5" aria-labelledby="employee-access">
          <h2 id="employee-access" className="text-base font-medium text-white">
            Acceso al sistema
          </h2>
          <p className="mt-4 text-sm font-medium text-white/75">
            {employee.hasSystemAccess ? "Cuenta vinculada" : "Sin cuenta vinculada"}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-white/45">
            {employee.user
              ? `${employee.user.email} - ${employee.user.isActive ? "activa" : "inactiva"}`
              : "El registro laboral no crea credenciales automaticamente."}
          </p>
        </section>
      </div>

      <section className="admin-panel mt-4 p-5" aria-labelledby="employee-compensation">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="employee-compensation" className="text-base font-medium text-white">
              Compensacion
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Condicion salarial vigente e historial asociado al empleo.
            </p>
          </div>
          {canReadSalary && canMutateCompensation ? (
            <Button
              variant={currentCompensation ? "outline-on-dark" : "primary-on-dark"}
              className="min-h-10 rounded-lg border-white/10 px-3"
              disabled={isCompensationLoading}
              onClick={() => setCompensationAction(currentCompensation ? "change" : "assign")}
            >
              <DollarSign aria-hidden="true" size={15} />
              {currentCompensation ? "Cambiar salario" : "Asignar salario"}
            </Button>
          ) : null}
        </div>

        {!canReadSalary ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white">
              No tienes permiso para consultar informacion salarial.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              La compensacion y su historial permanecen ocultos para tu cuenta.
            </p>
          </div>
        ) : isCompensationLoading && !compensation ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-4" role="status">
            <span className="sr-only">Cargando compensacion...</span>
            <div className="admin-skeleton h-20 rounded-md sm:col-span-2" />
            <div className="admin-skeleton h-20 rounded-md" />
            <div className="admin-skeleton h-20 rounded-md" />
          </div>
        ) : compensationError ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white" role="alert">
              {compensationError}
            </p>
          </div>
        ) : (
          <>
            {currentCompensation ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Salario actual</dt>
                  <dd className="mt-2 text-2xl font-medium text-white">
                    {formatCompensationAmount(currentCompensation)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Frecuencia</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {payFrequencyLabels[currentCompensation.payFrequency]}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Vigente desde</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {formatAdminDate(currentCompensation.effectiveFrom)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Moneda</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {currentCompensation.currency}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="admin-empty-panel mt-5 px-5 py-6">
                <p className="text-sm font-medium text-white">Sin salario asignado</p>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Este empleo todavia no tiene una compensacion registrada.
                </p>
              </div>
            )}

            <div className="mt-7">
              <h3 className="text-sm font-medium text-white">
                Historial de compensacion
              </h3>
              {compensation?.history.length ? (
                <div className="admin-module-list mt-4 divide-y divide-white/[0.07]">
                  {compensation.history.map((period) => (
                    <article
                      key={period.id}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-base font-medium text-white">
                            {formatCompensationAmount(period)}
                          </p>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">
                            {period.effectiveTo ? "Finalizado" : "Actual"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white/50">
                          {payFrequencyLabels[period.payFrequency]} - {period.currency}
                        </p>
                      </div>
                      <p className="text-sm text-white/55 sm:text-right">
                        {formatAdminDate(period.effectiveFrom)}
                        <span className="mx-2 text-white/20">-</span>
                        {period.effectiveTo
                          ? formatAdminDate(period.effectiveTo)
                          : "Actual"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/45">
                  No hay periodos salariales registrados.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="admin-panel mt-4 p-5" aria-labelledby="employee-shift">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="employee-shift" className="text-base font-medium text-white">
              Turno
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Horario vigente e historial de asignaciones del empleo.
            </p>
          </div>
          {canReadShift && canMutateShift ? (
            <Button
              variant={currentShiftAssignment ? "outline-on-dark" : "primary-on-dark"}
              className="min-h-10 rounded-lg border-white/10 px-3"
              disabled={isShiftLoading || selectableShifts.length === 0}
              onClick={() => setShiftAction(currentShiftAssignment ? "change" : "assign")}
            >
              <Clock3 aria-hidden="true" size={15} />
              {currentShiftAssignment ? "Cambiar turno" : "Asignar turno"}
            </Button>
          ) : null}
        </div>

        {!canReadShift ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white">
              No tienes permiso para consultar turnos.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Las asignaciones de horario permanecen ocultas para tu cuenta.
            </p>
          </div>
        ) : isShiftLoading && !employeeShifts ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3" role="status">
            <span className="sr-only">Cargando turno...</span>
            <div className="admin-skeleton h-20 rounded-md" />
            <div className="admin-skeleton h-20 rounded-md" />
            <div className="admin-skeleton h-20 rounded-md" />
          </div>
        ) : shiftError ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white" role="alert">
              {shiftError}
            </p>
          </div>
        ) : (
          <>
            {currentShiftAssignment ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Turno actual</dt>
                  <dd className="mt-2 text-sm font-medium text-white">
                    {currentShiftAssignment.shift.name}
                  </dd>
                  <p className="mt-1 font-mono text-xs text-white/35">
                    {currentShiftAssignment.shift.code}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Tipo</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {shiftTypeLabels[currentShiftAssignment.shift.type]}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Horario</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {formatShiftSchedule(currentShiftAssignment.shift)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                  <dt className="text-xs text-white/35">Dias</dt>
                  <dd className="mt-2 text-sm font-medium text-white/80">
                    {formatShiftDays(currentShiftAssignment.shift.workDays)}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="admin-empty-panel mt-5 px-5 py-6">
                <p className="text-sm font-medium text-white">Sin turno asignado</p>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Este empleo activo todavia no tiene un horario definido.
                </p>
              </div>
            )}

            <div className="mt-7">
              <h3 className="text-sm font-medium text-white">Historial de turnos</h3>
              {employeeShifts?.history.length ? (
                <div className="admin-module-list mt-4 divide-y divide-white/[0.07]">
                  {employeeShifts.history.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-medium text-white">
                            {assignment.shift.name}
                          </p>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">
                            {assignment.effectiveTo ? "Finalizado" : "Actual"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white/50">
                          {shiftTypeLabels[assignment.shift.type]} -{" "}
                          {formatShiftSchedule(assignment.shift)} -{" "}
                          {formatShiftDays(assignment.shift.workDays)}
                        </p>
                      </div>
                      <p className="text-sm text-white/55 sm:text-right">
                        {formatAdminDate(assignment.effectiveFrom)}
                        <span className="mx-2 text-white/20">-</span>
                        {assignment.effectiveTo
                          ? formatAdminDate(assignment.effectiveTo)
                          : "Actual"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/45">
                  No hay asignaciones de turno registradas.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section
        className="admin-panel mt-4 p-5"
        aria-labelledby="employee-attendance"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="employee-attendance"
              className="text-base font-medium text-white"
            >
              Asistencia
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Registros recientes por fecha laboral y turno esperado historico.
            </p>
          </div>
          {canReadAttendance ? (
            <Link
              href={`/admin/attendance?employeeId=${employee.id}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-medium text-white/72 transition-colors hover:border-white/22 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Ver historial completo
            </Link>
          ) : null}
        </div>

        {!canReadAttendance ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white">
              No tienes permiso para consultar asistencia.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Los fichajes permanecen ocultos para tu cuenta.
            </p>
          </div>
        ) : isAttendanceLoading && !attendance ? (
          <div className="mt-5 grid gap-3" role="status">
            <span className="sr-only">Cargando asistencia...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : attendanceError ? (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white" role="alert">
              {attendanceError}
            </p>
          </div>
        ) : attendance?.length ? (
          <div className="admin-module-list mt-5 divide-y divide-white/[0.07]">
            {attendance.map((record) => (
              <article
                key={record.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-white">
                      {formatAttendanceWorkDate(record.workDate)}
                    </p>
                    <span
                      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${attendanceStatusStyles[record.status]}`}
                    >
                      {attendanceStatusLabels[record.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {formatAttendanceDateTime(record.clockInAt)}
                    <span className="mx-2 text-white/20">-</span>
                    {formatAttendanceDateTime(record.clockOutAt)}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {record.expectedShiftName ?? "Sin snapshot"} ·{" "}
                    {getLateLabel(record.lateMinutes)}
                  </p>
                </div>
                <p className="text-sm text-white/55 sm:text-right">
                  {record.expectedStartTime && record.expectedEndTime
                    ? `${record.expectedStartTime} - ${record.expectedEndTime}`
                    : "Horario no registrado"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-panel mt-5 px-5 py-6">
            <p className="text-sm font-medium text-white">
              Sin asistencia registrada.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Este empleado aun no tiene fichajes visibles en el historial.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="employment-history">
        <h2 id="employment-history" className="text-lg font-medium text-white">
          Historial laboral
        </h2>
        <div className="admin-module-list mt-4 divide-y divide-white/[0.07]">
          {employee.employments.map((employment) => (
            <article
              key={employment.id}
              className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-medium text-white">
                    {employment.position.name}
                  </h3>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">
                    {employment.status === "ACTIVE" ? "Actual" : "Finalizado"}
                  </span>
                </div>
                {employment.notes ? (
                  <p className="mt-2 text-sm leading-6 text-white/45">{employment.notes}</p>
                ) : null}
              </div>
              <p className="text-sm text-white/55 sm:text-right">
                {formatAdminDate(employment.startDate)}
                <span className="mx-2 text-white/20">-</span>
                {employment.endDate ? formatAdminDate(employment.endDate) : "Actual"}
              </p>
            </article>
          ))}
        </div>
      </section>

      {action ? (
        <AdminModal
          open
          title={actionCopy[action].title}
          description={actionCopy[action].description}
          onClose={closeAction}
        >
          <form className="space-y-5" onSubmit={handleAction}>
            {action === "edit" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="admin-form-label">
                  Nombre
                  <input
                    className="admin-form-control"
                    name="firstName"
                    defaultValue={employee.firstName ?? ""}
                    maxLength={100}
                    required
                  />
                </label>
                <label className="admin-form-label">
                  Apellido
                  <input
                    className="admin-form-control"
                    name="lastName"
                    defaultValue={employee.lastName ?? ""}
                    maxLength={100}
                    required
                  />
                </label>
                <label className="admin-form-label">
                  Email
                  <input
                    className="admin-form-control"
                    name="email"
                    type="email"
                    defaultValue={employee.email ?? ""}
                    maxLength={254}
                  />
                </label>
                <label className="admin-form-label">
                  Telefono
                  <input
                    className="admin-form-control"
                    name="phone"
                    type="tel"
                    defaultValue={employee.phone ?? ""}
                    maxLength={30}
                  />
                </label>
              </div>
            ) : action === "terminate" ? (
              <>
                <label className="admin-form-label">
                  Ultimo dia laboral
                  <input
                    className="admin-form-control"
                    name="endDate"
                    type="date"
                    min={employee.currentEmployment?.startDate}
                    defaultValue={getTodayDate()}
                    required
                  />
                </label>
                <label className="admin-form-label">
                  Nota <span className="text-white/35">(opcional)</span>
                  <textarea
                    className="admin-form-control min-h-24 resize-y"
                    name="notes"
                    maxLength={500}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="admin-form-label">
                  Nuevo puesto
                  <select className="admin-form-control" name="positionId" required>
                    {(action === "change" ? changePositions : activePositions).map(
                      (position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="admin-form-label">
                  Fecha de inicio
                  <input
                    className="admin-form-control"
                    name="startDate"
                    type="date"
                    min={
                      action === "change" ? minimumChangeDate : minimumReactivationDate
                    }
                    defaultValue={
                      action === "change" ? minimumChangeDate : minimumReactivationDate
                    }
                    required
                  />
                </label>
                <label className="admin-form-label">
                  Nota <span className="text-white/35">(opcional)</span>
                  <textarea
                    className="admin-form-control min-h-24 resize-y"
                    name="notes"
                    maxLength={500}
                  />
                </label>
              </>
            )}

            <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
              {error}
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
                variant={action === "terminate" ? "outline-on-dark" : "primary-on-dark"}
                className="rounded-lg"
                isLoading={isSubmitting}
                loadingLabel="Guardando..."
              >
                Confirmar
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {compensationAction ? (
        <AdminModal
          open
          title={
            compensationAction === "assign" ? "Asignar salario" : "Cambiar salario"
          }
          description={
            compensationAction === "assign"
              ? "Registra la primera compensacion del empleo activo."
              : "Cierra el periodo vigente y crea uno nuevo desde la fecha indicada."
          }
          onClose={closeCompensationAction}
        >
          <form className="space-y-5" onSubmit={handleCompensationSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-form-label">
                Monto
                <input
                  className="admin-form-control"
                  name="amount"
                  inputMode="decimal"
                  pattern="\d+(\.\d{1,2})?"
                  placeholder="4500.00"
                  min="0.01"
                  defaultValue={currentCompensation?.amount.toFixed(2) ?? ""}
                  required
                />
              </label>
              <label className="admin-form-label">
                Moneda
                <input
                  className="admin-form-control"
                  name="currency"
                  value="GTQ"
                  disabled
                  readOnly
                />
              </label>
              <label className="admin-form-label">
                Frecuencia
                <select
                  className="admin-form-control"
                  name="payFrequency"
                  defaultValue={currentCompensation?.payFrequency ?? "MONTHLY"}
                  required
                >
                  <option value="MONTHLY">Mensual</option>
                  <option value="BIWEEKLY">Quincenal</option>
                </select>
              </label>
              <label className="admin-form-label">
                Fecha de vigencia
                <input
                  className="admin-form-control"
                  name="effectiveFrom"
                  type="date"
                  min={minimumCompensationDate}
                  defaultValue={minimumCompensationDate}
                  required
                />
              </label>
            </div>

            <p
              className="min-h-5 text-sm text-white/65"
              role="alert"
              aria-live="polite"
            >
              {compensationFormError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isCompensationSubmitting}
                onClick={closeCompensationAction}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary-on-dark"
                className="rounded-lg"
                isLoading={isCompensationSubmitting}
                loadingLabel="Guardando..."
              >
                Guardar salario
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {shiftAction ? (
        <AdminModal
          open
          title={shiftAction === "assign" ? "Asignar turno" : "Cambiar turno"}
          description={
            shiftAction === "assign"
              ? "Registra el primer horario del empleo activo."
              : "Cierra el turno vigente y crea una nueva asignacion desde la fecha indicada."
          }
          onClose={closeShiftAction}
        >
          <form className="space-y-5" onSubmit={handleShiftSubmit}>
            <label className="admin-form-label">
              Turno activo
              <select className="admin-form-control" name="shiftId" required>
                <option value="">Selecciona un turno</option>
                {selectableShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} - {shiftTypeLabels[shift.type]} -{" "}
                    {formatShiftSchedule(shift)}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-label">
              Fecha de vigencia
              <input
                className="admin-form-control"
                name="effectiveFrom"
                type="date"
                min={minimumShiftDate}
                defaultValue={minimumShiftDate}
                required
              />
            </label>

            {selectableShifts.length === 0 ? (
              <p className="text-sm leading-6 text-white/50">
                No hay turnos activos disponibles para asignar.
              </p>
            ) : null}

            <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
              {shiftFormError}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline-on-dark"
                className="rounded-lg border-white/10"
                disabled={isShiftSubmitting}
                onClick={closeShiftAction}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary-on-dark"
                className="rounded-lg"
                disabled={selectableShifts.length === 0}
                isLoading={isShiftSubmitting}
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
