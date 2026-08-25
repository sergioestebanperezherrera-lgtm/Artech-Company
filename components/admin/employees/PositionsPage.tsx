"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { positionService } from "@/lib/services/employeeService";
import type { Position } from "@/lib/types";
import { AdminModal } from "../AdminModal";
import { useAdminIdentity } from "../AdminContext";
import { getAdminActionError } from "./employeeUi";

type PositionDialogState =
  | { mode: "create" }
  | { mode: "edit"; position: Position }
  | null;

export function PositionsPage() {
  const identity = useAdminIdentity();
  const canCreate = identity.permissions.includes("employee.create");
  const canUpdate = identity.permissions.includes("employee.update");
  const formRef = useRef<HTMLFormElement>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [dialog, setDialog] = useState<PositionDialogState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadPositions = () => {
    const controller = new AbortController();
    void positionService
      .list(controller.signal)
      .then(setPositions)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setPositions([]);
        setError(getAdminActionError(loadError, "No se pudieron cargar los puestos."));
      });
    return controller;
  };

  useEffect(() => {
    const controller = new AbortController();
    void positionService
      .list(controller.signal)
      .then(setPositions)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setPositions([]);
        setError(getAdminActionError(loadError, "No se pudieron cargar los puestos."));
      });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dialog || isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    setIsSubmitting(true);
    setError("");

    try {
      if (dialog.mode === "create") {
        await positionService.create({ name, ...(description ? { description } : {}) });
        setStatusMessage("El puesto fue creado correctamente.");
      } else {
        await positionService.update(dialog.position.id, {
          name,
          description: description || null,
        });
        setStatusMessage("El puesto fue actualizado correctamente.");
      }

      setDialog(null);
      setError("");
      loadPositions();
    } catch (submissionError) {
      setError(
        getAdminActionError(
          submissionError,
          "No pudimos guardar el puesto. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePosition = async (position: Position) => {
    setError("");
    setStatusMessage("");

    try {
      await positionService.update(position.id, { isActive: !position.isActive });
      setStatusMessage(
        position.isActive ? "El puesto fue desactivado." : "El puesto fue activado.",
      );
      loadPositions();
    } catch (updateError) {
      setError(
        getAdminActionError(
          updateError,
          "No pudimos cambiar el estado del puesto.",
        ),
      );
    }
  };

  return (
    <div>
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Volver a empleados
      </Link>

      <header className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase text-white/45">Personal</p>
          <h1 className="mt-3 text-3xl font-medium text-white sm:text-4xl">Puestos</h1>
          <p className="mt-3 text-sm leading-6 text-white/50 sm:text-base">
            Administra el catalogo laboral sin mezclarlo con roles de acceso.
          </p>
        </div>
        {canCreate ? (
          <Button
            variant="primary-on-dark"
            className="min-h-11 rounded-lg px-4"
            onClick={() => {
              setError("");
              setDialog({ mode: "create" });
            }}
          >
            <Plus aria-hidden="true" size={17} />
            Nuevo puesto
          </Button>
        ) : null}
      </header>

      <div className="mt-6 min-h-6 text-sm" aria-live="polite">
        {error ? <p role="alert" className="text-white/70">{error}</p> : null}
        {!error && statusMessage ? <p className="text-white/60">{statusMessage}</p> : null}
      </div>

      {positions === null ? (
        <div className="admin-panel mt-3 space-y-1 p-5" role="status">
          <span className="sr-only">Cargando puestos...</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className="admin-skeleton h-16 rounded-md" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="admin-empty-panel mt-3 px-5 py-10 text-center">
          <p className="text-sm font-medium text-white">Todavia no hay puestos.</p>
          <p className="mt-2 text-sm text-white/45">
            Crea el primero para poder registrar empleados.
          </p>
        </div>
      ) : (
        <div className="admin-module-list mt-3 divide-y divide-white/[0.07]">
          {positions.map((position) => (
            <article
              key={position.id}
              className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-sm font-medium text-white">{position.name}</h2>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">
                    {position.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {position.description ?? "Sin descripcion."}
                </p>
              </div>
              {canUpdate ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline-on-dark"
                    className="min-h-10 rounded-lg border-white/10 px-3"
                  onClick={() => {
                    setError("");
                    setDialog({ mode: "edit", position });
                  }}
                  >
                    <Pencil aria-hidden="true" size={15} />
                    Editar
                  </Button>
                  <Button
                    variant="outline-on-dark"
                    className="min-h-10 rounded-lg border-white/10 px-3"
                    onClick={() => void togglePosition(position)}
                  >
                    {position.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {dialog ? (
      <AdminModal
        open
        title={dialog?.mode === "edit" ? "Editar puesto" : "Nuevo puesto"}
        description="Los puestos describen el trabajo; los roles controlan permisos."
        onClose={() => {
          setError("");
          setDialog(null);
        }}
      >
        <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
          <label className="admin-form-label">
            Nombre del puesto
            <input
              className="admin-form-control"
              name="name"
              defaultValue={dialog?.mode === "edit" ? dialog.position.name : ""}
              maxLength={100}
              required
            />
          </label>
          <label className="admin-form-label">
            Descripcion <span className="text-white/35">(opcional)</span>
            <textarea
              className="admin-form-control min-h-28 resize-y"
              name="description"
              defaultValue={
                dialog?.mode === "edit" ? dialog.position.description ?? "" : ""
              }
              maxLength={300}
            />
          </label>
          <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
            {error}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline-on-dark"
              className="rounded-lg border-white/10"
              onClick={() => {
                setError("");
                setDialog(null);
              }}
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
              Guardar puesto
            </Button>
          </div>
        </form>
      </AdminModal>
      ) : null}
    </div>
  );
}
