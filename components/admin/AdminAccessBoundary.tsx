"use client";

import Link from "next/link";
import { AlertTriangle, LockKeyhole, RotateCw } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { Button, getButtonClassName } from "@/components/ui";
import { useAdminAccess } from "./AdminContext";
import { AdminShell } from "./AdminShell";

export function AdminAccessBoundary({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { state, retry } = useAdminAccess();

  if (state.status === "loading") {
    return <AdminLoadingState />;
  }

  if (state.status === "unauthenticated") {
    return (
      <AdminStateScreen
        icon={LockKeyhole}
        title="Necesitas iniciar sesión para acceder."
        description="Accede con tu cuenta de ARTECH para verificar tus permisos administrativos."
      >
        <Link href="/cuenta" className={getButtonClassName("primary-on-dark")}>
          Iniciar sesión
        </Link>
      </AdminStateScreen>
    );
  }

  if (state.status === "restricted") {
    return (
      <AdminStateScreen
        icon={LockKeyhole}
        title="Acceso restringido"
        description="Tu cuenta no tiene permisos para acceder al panel administrativo."
      >
        <Link href="/" className={getButtonClassName("primary-on-dark")}>
          Volver a la tienda
        </Link>
      </AdminStateScreen>
    );
  }

  if (state.status === "error") {
    return (
      <AdminStateScreen
        icon={AlertTriangle}
        title="No se pudo cargar el panel administrativo."
        description="Revisa tu conexión e intenta nuevamente."
      >
        <Button variant="primary-on-dark" onClick={retry}>
          <RotateCw aria-hidden="true" size={16} strokeWidth={1.7} />
          Reintentar
        </Button>
      </AdminStateScreen>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}

function AdminLoadingState() {
  return (
    <main
      className="admin-access-screen"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 text-text-primary-on-dark">
          <LogoMark className="text-2xl" />
          <span className="text-sm font-medium">Artech Admin</span>
        </div>
        <div className="mt-10 space-y-4" aria-hidden="true">
          <div className="h-7 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <p className="mt-7 text-sm text-text-secondary-on-dark">
          Verificando acceso administrativo...
        </p>
      </div>
    </main>
  );
}

type AdminStateScreenProps = {
  icon: typeof LockKeyhole;
  title: string;
  description: string;
  children: React.ReactNode;
};

function AdminStateScreen({
  icon: Icon,
  title,
  description,
  children,
}: AdminStateScreenProps) {
  return (
    <main className="admin-access-screen px-5">
      <section className="admin-state-panel w-full max-w-lg px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center gap-2 text-text-primary-on-dark">
          <LogoMark className="text-2xl" />
          <span className="text-sm font-medium">Artech Admin</span>
        </div>
        <Icon
          aria-hidden="true"
          className="mt-10 text-text-secondary-on-dark"
          size={34}
          strokeWidth={1.5}
        />
        <h1 className="mt-5 text-2xl font-medium leading-tight text-text-primary-on-dark sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary-on-dark">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">{children}</div>
      </section>
    </main>
  );
}
