"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ChevronRight, Search, UserPlus } from "lucide-react";
import { Button, getButtonClassName } from "@/components/ui";
import { employeeService, positionService } from "@/lib/services/employeeService";
import type { EmployeeFilters, EmployeeSummary, Position } from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import {
  formatAdminDate,
  getAdminActionError,
  getEmploymentTimelineStatus,
} from "./employeeUi";

export function EmployeesPage() {
  const identity = useAdminIdentity();
  const canCreate = identity.permissions.includes("employee.create");
  const [employees, setEmployees] = useState<EmployeeSummary[] | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [filters, setFilters] = useState<EmployeeFilters>({ status: "all" });
  const [searchDraft, setSearchDraft] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void positionService
      .list(controller.signal)
      .then(setPositions)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          getAdminActionError(loadError, "No se pudieron cargar los puestos."),
        );
      });

    return () => controller.abort();
  }, []);

  const loadEmployees = useCallback(
    (signal?: AbortSignal) => {
      return employeeService
        .list(filters, signal)
        .then(setEmployees)
        .catch((loadError: unknown) => {
          if (loadError instanceof DOMException && loadError.name === "AbortError") {
            return;
          }
          setEmployees([]);
          setError(
            getAdminActionError(
              loadError,
              "No se pudo cargar la lista de empleados.",
            ),
          );
        });
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);
    return () => controller.abort();
  }, [loadEmployees, reloadKey]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setEmployees(null);
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
  };

  const handleCreated = (employee: EmployeeSummary) => {
    setError("");
    setStatusMessage(`${employee.code} fue creado correctamente.`);
    setEmployees(null);
    setReloadKey((current) => current + 1);
  };

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase text-white/45">Personal</p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Empleados
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50 sm:text-base">
            Consulta el estado laboral, puesto actual e historial del equipo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/employees/positions"
            className={getButtonClassName(
              "outline-on-dark",
              "min-h-11 rounded-lg border-white/10 px-4",
            )}
          >
            <BriefcaseBusiness aria-hidden="true" size={17} strokeWidth={1.7} />
            Puestos
          </Link>
          {canCreate ? (
            <Button
              variant="primary-on-dark"
              className="min-h-11 rounded-lg px-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <UserPlus aria-hidden="true" size={17} strokeWidth={1.7} />
              Nuevo empleado
            </Button>
          ) : null}
        </div>
      </header>

      <section className="admin-panel mt-8 p-4 sm:p-5" aria-label="Filtros de empleados">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_12rem_14rem_auto] lg:items-end"
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
                placeholder="Codigo o nombre"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
          </label>
          <label className="admin-form-label">
            Estado
            <select
              className="admin-form-control"
              value={filters.status ?? "all"}
              onChange={(event) => {
                setError("");
                setEmployees(null);
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as EmployeeFilters["status"],
                }));
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          <label className="admin-form-label min-w-0">
            Puesto actual
            <select
              className="admin-form-control"
              value={filters.positionId ?? ""}
              onChange={(event) => {
                setError("");
                setEmployees(null);
                setFilters((current) => ({
                  ...current,
                  positionId: event.target.value || undefined,
                }));
              }}
            >
              <option value="">Todos los puestos</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                  {position.isActive ? "" : " (inactivo)"}
                </option>
              ))}
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

      <div className="mt-5 min-h-6 text-sm" aria-live="polite">
        {error ? <p role="alert" className="text-white/70">{error}</p> : null}
        {!error && statusMessage ? (
          <p className="text-white/65">{statusMessage}</p>
        ) : null}
      </div>

      <section className="mt-3" aria-labelledby="employee-results-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="employee-results-heading" className="text-lg font-medium text-white">
            Equipo
          </h2>
          {employees ? (
            <span className="text-xs text-white/40">
              {employees.length} {employees.length === 1 ? "registro" : "registros"}
            </span>
          ) : null}
        </div>

        {employees === null ? (
          <div className="admin-panel mt-4 space-y-1 p-5" role="status">
            <span className="sr-only">Cargando empleados...</span>
            {[0, 1, 2].map((item) => (
              <div key={item} className="admin-skeleton h-14 rounded-md" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-10 text-center">
            <p className="text-sm font-medium text-white">No hay empleados para mostrar.</p>
            <p className="mt-2 text-sm text-white/45">
              Ajusta los filtros o crea el primer registro laboral.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden xl:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Empleado</th>
                    <th>Puesto actual</th>
                    <th>Inicio</th>
                    <th>Estado</th>
                    <th>Acceso al sistema</th>
                    <th><span className="sr-only">Abrir ficha</span></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="font-mono text-xs text-white/50">{employee.code}</td>
                      <td>
                        <Link
                          href={`/admin/employees/${employee.id}`}
                          className="font-medium text-white hover:underline hover:underline-offset-4"
                        >
                          {employee.name}
                        </Link>
                        <p className="mt-1 text-xs text-white/40">
                          {employee.email ?? "Sin email"}
                        </p>
                      </td>
                      <td>{employee.currentEmployment?.position.name ?? "Sin puesto activo"}</td>
                      <td>{formatAdminDate(employee.currentEmployment?.startDate ?? null)}</td>
                      <td>
                        <EmployeeStatusBadge active={employee.isActive} />
                        <p className="mt-2 text-xs text-white/38">
                          {getEmploymentTimelineStatus(
                            employee.isActive,
                            employee.currentEmployment?.startDate,
                          )}
                        </p>
                      </td>
                      <td>{employee.hasSystemAccess ? "Vinculado" : "Sin acceso"}</td>
                      <td className="text-right">
                        <Link
                          href={`/admin/employees/${employee.id}`}
                          aria-label={`Abrir ficha de ${employee.name}`}
                          className="inline-flex size-10 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2"
                        >
                          <ChevronRight aria-hidden="true" size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 xl:hidden">
              {employees.map((employee) => (
                <Link
                  key={employee.id}
                  href={`/admin/employees/${employee.id}`}
                  className="admin-module-card block p-4 focus-visible:outline focus-visible:outline-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{employee.name}</p>
                      <p className="mt-1 font-mono text-xs text-white/40">{employee.code}</p>
                    </div>
                    <EmployeeStatusBadge active={employee.isActive} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-white/35">Puesto</dt>
                      <dd className="mt-1 truncate text-white/70">
                        {employee.currentEmployment?.position.name ?? "Sin puesto"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/35">Inicio</dt>
                      <dd className="mt-1 text-white/70">
                        {formatAdminDate(employee.currentEmployment?.startDate ?? null)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-white/35">Estado laboral</dt>
                      <dd className="mt-1 text-white/70">
                        {getEmploymentTimelineStatus(
                          employee.isActive,
                          employee.currentEmployment?.startDate,
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-white/35">Acceso al sistema</dt>
                      <dd className="mt-1 text-white/70">
                        {employee.hasSystemAccess ? "Cuenta vinculada" : "Sin acceso"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {canCreate ? (
        <EmployeeFormDialog
          open={isCreateOpen}
          positions={positions}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}
