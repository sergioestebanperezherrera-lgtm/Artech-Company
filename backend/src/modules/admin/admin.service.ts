import type { Request } from "express";
import { getAuthContext } from "../auth/auth.middleware";

export function getAdminIdentity(request: Request) {
  const auth = getAuthContext(request);

  return {
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
    },
    employee: auth.user.employee
      ? {
          id: auth.user.employee.id,
          code: auth.user.employee.code,
          isActive: auth.user.employee.isActive,
        }
      : null,
    roles: auth.roles,
    permissions: auth.permissions,
    canAccessAdmin: true,
  };
}
