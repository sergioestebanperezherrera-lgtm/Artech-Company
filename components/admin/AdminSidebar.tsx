"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { cn } from "@/lib/utils/cn";
import { useAdminIdentity } from "./AdminContext";
import { getVisibleAdminGroups } from "./adminNavigation";

type AdminSidebarProps = {
  isMobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
};

export function AdminSidebar({
  isMobile = false,
  onNavigate,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const identity = useAdminIdentity();
  const groups = getVisibleAdminGroups(identity.permissions);
  const userInitial = identity.user.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080808]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          onClick={onNavigate}
        >
          <LogoMark className="text-2xl" />
          <span className="text-sm font-medium">Artech Admin</span>
        </Link>
        {isMobile ? (
          <button
            type="button"
            className="press-feedback inline-flex size-11 items-center justify-center rounded-lg border border-white/10 text-white transition-colors hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label="Cerrar navegación"
            onClick={onClose}
          >
            <X aria-hidden="true" size={19} strokeWidth={1.7} />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Navegación administrativa"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
      >
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.label}
              aria-labelledby={`${isMobile ? "mobile" : "desktop"}-admin-nav-${group.label}`}
            >
              <h2
                id={`${isMobile ? "mobile" : "desktop"}-admin-nav-${group.label}`}
                className="px-3 text-[11px] font-medium uppercase text-white/40"
              >
                {group.label}
              </h2>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                        isActive
                          ? "bg-white/[0.09] text-white"
                          : "text-white/60 hover:bg-white/[0.045] hover:text-white",
                      )}
                    >
                      <Icon aria-hidden="true" size={17} strokeWidth={1.6} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/60 transition-colors hover:bg-white/[0.045] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.6} />
          Volver a la tienda
        </Link>
        <div className="mt-2 flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-sm font-medium text-white">
            {userInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {identity.user.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {identity.employee?.code ?? identity.user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
