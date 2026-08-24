"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { getAdminItemByPath } from "./adminNavigation";

type AdminTopbarProps = {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
};

export function AdminTopbar({
  menuButtonRef,
  onOpenMenu,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const sectionTitle = getAdminItemByPath(pathname)?.label ?? "Administración";

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setLogoutError("");

    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("No pudimos cerrar la sesión. Intenta nuevamente.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="admin-topbar sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Abrir navegación administrativa"
          aria-controls="admin-mobile-navigation"
          className="press-feedback inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white transition-colors hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
          onClick={onOpenMenu}
        >
          <Menu aria-hidden="true" size={19} strokeWidth={1.7} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white sm:text-base">
            {sectionTitle}
          </p>
          <p className="mt-0.5 hidden text-xs text-white/40 sm:block">
            Panel administrativo
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <p className="sr-only" role="status" aria-live="polite">
          {logoutError}
        </p>
        <Button
          variant="outline-on-dark"
          className="min-h-10 rounded-lg border-white/10 px-3 hover:border-white/25 hover:bg-white/[0.05] sm:px-4"
          isLoading={isSigningOut}
          loadingLabel="Cerrando..."
          onClick={handleSignOut}
        >
          <LogOut aria-hidden="true" size={16} strokeWidth={1.7} />
          <span className="hidden sm:inline">Cerrar sesión</span>
          <span className="sr-only sm:hidden">Cerrar sesión</span>
        </Button>
      </div>
    </header>
  );
}
