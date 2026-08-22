"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, UserRound } from "lucide-react";
import { Button, Card, getButtonClassName } from "@/components/ui";
import { authService } from "@/lib/services/authService";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { UserProfileCard } from "./UserProfileCard";

export function AccountView() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signOut = useAuthStore((state) => state.signOut);
  const [initialAuthParam] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("auth");
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const showGoogleError = initialAuthParam === "google_error" && !isAuthenticated;

  useEffect(() => {
    if (initialAuthParam && (initialAuthParam !== "google_error" || isAuthenticated)) {
      router.replace("/cuenta");
    }
  }, [initialAuthParam, isAuthenticated, router]);

  const openAuth = () => {
    window.dispatchEvent(
      new CustomEvent("artech:auth-open", {
        detail: { redirectTo: "/cuenta" },
      }),
    );
  };

  const startGoogleLogin = () => {
    window.location.assign(authService.getGoogleLoginUrl());
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading && !user) {
    return (
      <main className="artech-page-shell min-h-screen px-6 py-16 text-text-primary-on-dark">
        <div className="mx-auto max-w-2xl rounded-card border border-border-on-dark bg-bg-base/75 px-6 py-12 text-center">
          <UserRound
            aria-hidden="true"
            className="mx-auto text-text-secondary-on-dark"
            size={40}
            strokeWidth={1.5}
          />
          <h1 className="mt-5 text-3xl font-medium">Tu cuenta</h1>
          <p className="mt-4 text-sm leading-6 text-text-secondary-on-dark">
            Verificando tu sesión...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="artech-page-shell min-h-screen px-6 py-16 text-text-primary-on-dark">
        <div className="mx-auto max-w-2xl rounded-card border border-border-on-dark bg-bg-base/75 px-6 py-12 text-center">
          <UserRound
            aria-hidden="true"
            className="mx-auto text-text-secondary-on-dark"
            size={40}
            strokeWidth={1.5}
          />
          <h1 className="mt-5 text-3xl font-medium">Tu cuenta</h1>
          <p className="mt-4 text-sm leading-6 text-text-secondary-on-dark">
            Inicia sesión o crea una cuenta para ver tu panel.
          </p>
          {showGoogleError ? (
            <p
              className="mx-auto mt-5 max-w-md text-sm leading-6 text-text-secondary-on-dark"
              role="alert"
            >
              No se pudo iniciar sesión con Google.
            </p>
          ) : null}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="primary-on-dark" onClick={openAuth}>
              Acceder
            </Button>
            <Button variant="outline-on-dark" onClick={startGoogleLogin}>
              Continuar con Google
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="artech-page-shell min-h-screen px-6 py-10 text-text-primary-on-dark">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-border-on-dark pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-border-on-dark text-lg font-medium">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-medium">Hola, {user.name}</h1>
              <p className="mt-1 text-sm text-text-secondary-on-dark">{user.email}</p>
            </div>
          </div>
          <Link href="/" className={getButtonClassName("outline-on-dark")}>
            Volver a la tienda
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <UserProfileCard user={user} />
          <OrdersEmptyState />
          <Card className="p-6">
            <MapPin
              aria-hidden="true"
              className="text-text-secondary-on-light"
              size={32}
              strokeWidth={1.5}
            />
            <h2 className="mt-4 text-xl font-medium">Direcciones guardadas</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary-on-light">
              La gestión de direcciones se conectará en una fase posterior.
            </p>
          </Card>
          <Card className="flex flex-col justify-between gap-5 p-6">
            <div>
              <h2 className="text-xl font-medium">Sesión</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary-on-light">
                Tu sesión está protegida por una cookie HttpOnly gestionada por el backend.
              </p>
            </div>
            <Button
              variant="primary-on-light"
              className="w-max"
              isLoading={isSigningOut}
              loadingLabel="Cerrando sesión..."
              onClick={handleSignOut}
            >
              Cerrar sesión
            </Button>
          </Card>
        </div>
      </div>
    </main>
  );
}
