import type { AuthUserRecord, PublicAuthResponse } from "./auth.types";

export function mapAuthUser(user: AuthUserRecord): PublicAuthResponse {
  const roles = user.roles.map((userRole) => userRole.role.name);
  const permissions = new Set<string>();

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    roles,
    permissions: Array.from(permissions).sort(),
  };
}
