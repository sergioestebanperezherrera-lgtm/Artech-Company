import type { AuthUserRecord, PublicAuthResponse } from "./auth.types";

export function mapAuthorization(user: AuthUserRecord) {
  const roles = new Set<string>();
  const permissions = new Set<string>();

  for (const userRole of user.roles) {
    roles.add(userRole.role.name);

    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    roles: Array.from(roles).sort(),
    permissions: Array.from(permissions).sort(),
  };
}

export function mapAuthUser(user: AuthUserRecord): PublicAuthResponse {
  const authorization = mapAuthorization(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    ...authorization,
  };
}
