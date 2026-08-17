"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  signIn: (email: string) => User;
  signUp: (name: string, email: string) => User;
  signOut: () => void;
};

function getNameFromEmail(email: string) {
  const [name] = email.split("@");
  return name ? name.replace(/[._-]/g, " ") : "Cliente Artech";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (email) => {
        const user = {
          id: "mock-user",
          name: getNameFromEmail(email),
          email,
        };

        set({ user });
        return user;
      },
      signUp: (name, email) => {
        const user = {
          id: "mock-user",
          name: name.trim() || "Cliente Artech",
          email,
        };

        set({ user });
        return user;
      },
      signOut: () => set({ user: null }),
    }),
    {
      name: "artech-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
