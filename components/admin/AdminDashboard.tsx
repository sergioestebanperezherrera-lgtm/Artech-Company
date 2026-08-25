"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useAdminIdentity } from "./AdminContext";
import {
  adminNavigationGroups,
  canViewAdminItem,
} from "./adminNavigation";

const availableModuleHrefs = new Set([
  "/admin/employees",
  "/admin/shifts",
  "/admin/attendance",
]);

export function AdminDashboard() {
  const identity = useAdminIdentity();
  const firstName = identity.user.name.trim().split(/\s+/)[0] || "Admin";
  const visibleModules = adminNavigationGroups
    .flatMap((group) =>
      group.items.map((item) => ({ ...item, groupLabel: group.label })),
    )
    .filter(
      (item) =>
        item.href !== "/admin" && canViewAdminItem(item, identity.permissions),
    );
  const quickLinks = visibleModules.slice(0, 4);

  return (
    <div>
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase text-white/45">
          Artech Admin
        </p>
        <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
          Hola, {firstName}.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
          Gestiona las operaciones internas de ARTECH desde un espacio centralizado.
          Los modulos se habilitan segun tus permisos efectivos.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="admin-quick-links">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="admin-quick-links" className="text-lg font-medium text-white">
              Accesos rapidos
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Modulos disponibles para tu cuenta.
            </p>
          </div>
        </div>

        {quickLinks.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="admin-module-card group min-h-36 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/70 transition-colors group-hover:text-white">
                      <Icon aria-hidden="true" size={18} strokeWidth={1.6} />
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="text-white/30 transition-colors group-hover:text-white/70"
                      size={17}
                      strokeWidth={1.6}
                    />
                  </div>
                  <p className="mt-7 text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-white/40">{item.groupLabel}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="admin-empty-panel mt-5 px-5 py-6 text-sm text-white/55">
            No hay modulos adicionales habilitados para esta cuenta.
          </p>
        )}
      </section>

      <section className="mt-12" aria-labelledby="admin-modules">
        <h2 id="admin-modules" className="text-lg font-medium text-white">
          Modulos
        </h2>
        <p className="mt-1 text-sm text-white/45">
          Estado de las areas disponibles en esta fase.
        </p>

        <div className="admin-module-list mt-5 divide-y divide-white/[0.07]">
          {visibleModules.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.href}
                className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon
                    aria-hidden="true"
                    className="shrink-0 text-white/45"
                    size={17}
                    strokeWidth={1.6}
                  />
                  <span className="truncate text-sm text-white/80">{item.label}</span>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/45">
                  {availableModuleHrefs.has(item.href) ? "Disponible" : "Proximamente"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
