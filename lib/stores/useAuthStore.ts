"use client";

import { create } from "zustand";
import {
  authService,
  type AuthSession,
  type AuthUser,
} from "@/lib/services/authService";

type AuthState = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCheckedSession: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (name: string, email: string, password: string) => Promise<AuthSession>;
  signOut: () => Promise<void>;
};

let sessionRequest: Promise<AuthSession | null> | null = null;

function removeLegacyMockSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("artech-auth");
}

function applySession(session: AuthSession | null) {
  return {
    user: session?.user ?? null,
    roles: session?.roles ?? [],
    permissions: session?.permissions ?? [],
    isAuthenticated: Boolean(session?.user),
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  roles: [],
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
  hasCheckedSession: false,
  error: null,

  initialize: async () => {
    if (get().hasCheckedSession) {
      return;
    }

    await get().refreshSession();
  },

  refreshSession: async () => {
    removeLegacyMockSession();
    set({ isLoading: true, error: null });

    try {
      sessionRequest ??= authService.getMe();
      const session = await sessionRequest;

      set({
        ...applySession(session),
        isLoading: false,
        hasCheckedSession: true,
        error: null,
      });

      return session;
    } catch {
      set({
        user: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        hasCheckedSession: true,
        error: "No pudimos verificar tu sesión. Intenta nuevamente.",
      });

      return null;
    } finally {
      sessionRequest = null;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const session = await authService.login(email, password);

      set({
        ...applySession(session),
        isLoading: false,
        hasCheckedSession: true,
        error: null,
      });

      return session;
    } catch (error) {
      set({
        isLoading: false,
        error: "No pudimos iniciar sesión. Intenta nuevamente.",
      });

      throw error;
    }
  },

  signUp: async (name, email, password) => {
    set({ isLoading: true, error: null });

    try {
      const session = await authService.register(name, email, password);

      set({
        ...applySession(session),
        isLoading: false,
        hasCheckedSession: true,
        error: null,
      });

      return session;
    } catch (error) {
      set({
        isLoading: false,
        error: "No pudimos crear tu cuenta. Intenta nuevamente.",
      });

      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        hasCheckedSession: true,
        error: null,
      });
    }
  },
}));
