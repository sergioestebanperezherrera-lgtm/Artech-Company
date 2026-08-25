"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getButtonClassName } from "@/components/ui";
import { useAdminIdentity } from "./AdminContext";

type AdminPermissionBoundaryProps = {
  permission: string;
  children: React.ReactNode;
};

export function AdminPermissionBoundary({
  permission,
  children,
}: AdminPermissionBoundaryProps) {
  const identity = useAdminIdentity();

  if (!identity.permissions.includes(permission)) {
    return (
      <section className="admin-state-panel max-w-2xl px-6 py-8 sm:px-8">
        <p className="text-xs font-medium uppercase text-white/40">Artech Admin</p>
        <h1 className="mt-4 text-2xl font-medium text-white">
          Módulo no disponible
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
          Esta sección no está habilitada para tu cuenta.
        </p>
        <Link
          href="/admin"
          className={getButtonClassName("outline-on-dark", "mt-7 rounded-lg")}
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.7} />
          Volver al dashboard
        </Link>
      </section>
    );
  }

  return children;
}
