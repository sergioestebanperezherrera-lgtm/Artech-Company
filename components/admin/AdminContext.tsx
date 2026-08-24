"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  adminService,
  AdminServiceError,
} from "@/lib/services/adminService";
import type { AdminContext as AdminIdentity } from "@/lib/types";

export type AdminAccessState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "restricted" }
  | { status: "error" }
  | { status: "ready"; identity: AdminIdentity };

type AdminContextValue = {
  state: AdminAccessState;
  retry: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AdminAccessState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void adminService
      .getContext(controller.signal)
      .then((identity) => {
        setState({ status: "ready", identity });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (error instanceof AdminServiceError && error.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }

        if (error instanceof AdminServiceError && error.status === 403) {
          setState({ status: "restricted" });
          return;
        }

        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo(() => ({ state, retry }), [retry, state]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminAccess() {
  const value = useContext(AdminContext);

  if (!value) {
    throw new Error("useAdminAccess must be used inside AdminProvider.");
  }

  return value;
}

export function useAdminIdentity() {
  const { state } = useAdminAccess();

  if (state.status !== "ready") {
    throw new Error("Admin identity is not available before access is ready.");
  }

  return state.identity;
}
