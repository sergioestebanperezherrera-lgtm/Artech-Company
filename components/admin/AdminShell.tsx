"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isMenuOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }

    if (!isMenuOpen && dialog.open) {
      dialog.close();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMenu();
      }
    };

    mediaQuery.addEventListener("change", handleDesktop);
    return () => mediaQuery.removeEventListener("change", handleDesktop);
  }, [closeMenu]);

  return (
    <div className="admin-surface min-h-dvh text-text-primary-on-dark">
      <a
        href="#admin-main"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 lg:block">
        <AdminSidebar />
      </aside>

      <div className="min-w-0 lg:pl-64">
        <AdminTopbar
          menuButtonRef={menuButtonRef}
          onOpenMenu={() => setIsMenuOpen(true)}
        />
        <main id="admin-main" tabIndex={-1} className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <dialog
        ref={dialogRef}
        id="admin-mobile-navigation"
        aria-label="Navegación administrativa"
        className="admin-mobile-drawer h-dvh w-[min(88vw,20rem)] max-w-none p-0 text-white"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }}
      >
        <AdminSidebar isMobile onClose={closeMenu} onNavigate={closeMenu} />
      </dialog>
    </div>
  );
}
