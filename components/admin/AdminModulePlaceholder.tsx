"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getButtonClassName } from "@/components/ui";
import { useAdminIdentity } from "./AdminContext";
import {
  canViewAdminItem,
  getAdminItemBySlug,
} from "./adminNavigation";

export function AdminModulePlaceholder({ slug }: Readonly<{ slug: string }>) {
  const identity = useAdminIdentity();
  const item = getAdminItemBySlug(slug);

  if (!item || !canViewAdminItem(item, identity.permissions)) {
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

  const Icon = item.icon;

  return (
    <section className="max-w-3xl">
      <span className="flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/70">
        <Icon aria-hidden="true" size={20} strokeWidth={1.6} />
      </span>
      <p className="mt-7 text-xs font-medium uppercase text-white/40">
        Próxima fase
      </p>
      <h1 className="mt-3 text-3xl font-medium text-white sm:text-4xl">
        {item.label}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
        Este módulo se implementará en una próxima fase.
      </p>
      <Link
        href="/admin"
        className={getButtonClassName("outline-on-dark", "mt-8 rounded-lg")}
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.7} />
        Volver al dashboard
      </Link>
    </section>
  );
}
