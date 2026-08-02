import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "../lib/api";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  role: UserRole | null;
  loginSuccess: (payload: {
    token: string;
    username: string;
    role: UserRole;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      username: null,
      role: null,
      loginSuccess: ({ token, username, role }) =>
        set({ isAuthenticated: true, token, username, role }),
      logout: () =>
        set({
          isAuthenticated: false,
          token: null,
          username: null,
          role: null,
        }),
    }),
    {
      name: "auth", // storage key
    },
  ),
);
