import { getApiUrl } from "@/lib/config/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

export type AuthSession = {
  user: AuthUser;
  roles: string[];
  permissions: string[];
};

type AuthRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export class AuthServiceError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
  }
}

async function authRequest<T>(path: string, options: AuthRequestOptions = {}) {
  const response = await fetch(getApiUrl(path), {
    method: options.method ?? "GET",
    credentials: "include",
    headers:
      options.body === undefined
        ? undefined
        : {
            "Content-Type": "application/json",
          },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = "No pudimos completar la acción. Intenta nuevamente.";

    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      // Keep the generic message when the backend returns an empty response.
    }

    throw new AuthServiceError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const authService = {
  async register(name: string, email: string, password: string) {
    return authRequest<AuthSession>("/api/auth/register", {
      method: "POST",
      body: {
        name,
        email,
        password,
      },
    });
  },

  async login(email: string, password: string) {
    return authRequest<AuthSession>("/api/auth/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    });
  },

  async getMe() {
    try {
      return await authRequest<AuthSession>("/api/auth/me");
    } catch (error) {
      if (error instanceof AuthServiceError && error.status === 401) {
        return null;
      }

      throw error;
    }
  },

  async logout() {
    return authRequest<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
  },

  getGoogleLoginUrl() {
    return getApiUrl("/api/auth/google");
  },
};
