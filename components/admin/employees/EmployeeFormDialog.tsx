"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { employeeService } from "@/lib/services/employeeService";
import type { EmployeeDetail, Position } from "@/lib/types";
import { AdminModal } from "../AdminModal";
import { getAdminActionError, getTodayDate } from "./employeeUi";

type EmployeeFormDialogProps = {
  open: boolean;
  positions: Position[];
  onClose: () => void;
  onCreated: (employee: EmployeeDetail) => void;
};

export function EmployeeFormDialog({
  open,
  positions,
  onClose,
  onCreated,
}: EmployeeFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const activePositions = positions.filter((position) => position.isActive);

  const handleClose = () => {
    setError("");
    formRef.current?.reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");

    try {
      const email = String(formData.get("email") ?? "").trim();
      const phone = String(formData.get("phone") ?? "").trim();
      const employee = await employeeService.create({
        firstName: String(formData.get("firstName") ?? "").trim(),
        lastName: String(formData.get("lastName") ?? "").trim(),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        positionId: String(formData.get("positionId") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
      });
      onCreated(employee);
      handleClose();
    } catch (submissionError) {
      setError(
        getAdminActionError(
          submissionError,
          "No pudimos crear el empleado. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title="Nuevo empleado"
      description="Crea el registro laboral sin generar una cuenta de acceso."
      onClose={handleClose}
    >
      {activePositions.length === 0 ? (
        <div className="admin-empty-panel px-4 py-5 text-sm leading-6 text-white/60">
          <p>Necesitas al menos un puesto activo antes de crear empleados.</p>
          <Link
            href="/admin/employees/positions"
            className="mt-3 inline-flex font-medium text-white underline decoration-white/35 underline-offset-4"
            onClick={handleClose}
          >
            Gestionar puestos
          </Link>
        </div>
      ) : (
        <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-form-label">
              Nombre
              <input
                className="admin-form-control"
                name="firstName"
                autoComplete="given-name"
                maxLength={100}
                required
              />
            </label>
            <label className="admin-form-label">
              Apellido
              <input
                className="admin-form-control"
                name="lastName"
                autoComplete="family-name"
                maxLength={100}
                required
              />
            </label>
            <label className="admin-form-label">
              Email <span className="text-white/35">(opcional)</span>
              <input
                className="admin-form-control"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label className="admin-form-label">
              Telefono <span className="text-white/35">(opcional)</span>
              <input
                className="admin-form-control"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
              />
            </label>
            <label className="admin-form-label">
              Puesto inicial
              <select className="admin-form-control" name="positionId" required>
                {activePositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-label">
              Fecha de inicio
              <input
                className="admin-form-control"
                name="startDate"
                type="date"
                defaultValue={getTodayDate()}
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
              onClick={handleClose}
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
              Crear empleado
            </Button>
          </div>
        </form>
      )}
    </AdminModal>
  );
}
