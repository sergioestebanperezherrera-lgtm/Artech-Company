import type { Request, RequestHandler } from "express";
import { AppError } from "../../errors/app-error";
import { resolveAuthSession } from "./auth.session";
import type { AuthSessionContext } from "./auth.types";

async function resolveRequiredAuth(request: Request) {
  if (request.auth) {
    return request.auth;
  }

  const session = await resolveAuthSession(request);

  if (!session) {
    throw new AppError("Authentication required.", 401);
  }

  request.auth = session;
  return session;
}

export function getAuthContext(request: Request): AuthSessionContext {
  if (!request.auth) {
    throw new AppError("Authentication required.", 401);
  }

  return request.auth;
}

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    await resolveRequiredAuth(request);
    next();
  } catch (error) {
    next(error);
  }
};

export function requirePermission(permissionKey: string): RequestHandler {
  return async (request, _response, next) => {
    try {
      const auth = await resolveRequiredAuth(request);

      if (!auth.permissions.includes(permissionKey)) {
        next(new AppError("Permission denied.", 403));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAdminAccess: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    const auth = await resolveRequiredAuth(request);
    const inactiveEmployee = auth.user.employee?.isActive === false;

    if (
      auth.roles.length === 0 ||
      auth.permissions.length === 0 ||
      inactiveEmployee
    ) {
      next(new AppError("Internal admin access required.", 403));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
