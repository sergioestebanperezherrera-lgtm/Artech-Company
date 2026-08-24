import type { PrismaClient } from "@prisma/client";
import {
  permissionSeeds,
  rolePermissionMatrix,
  roleSeeds,
} from "./seed-data/rbac";

export async function seedRbac(database: PrismaClient) {
  await database.$transaction(
    permissionSeeds.map((permission) =>
      database.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: permission,
      }),
    ),
  );

  await database.$transaction(
    roleSeeds.map((role) =>
      database.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      }),
    ),
  );

  const [roles, permissions] = await Promise.all([
    database.role.findMany({
      where: { name: { in: roleSeeds.map((role) => role.name) } },
      select: { id: true, name: true },
    }),
    database.permission.findMany({
      where: { key: { in: permissionSeeds.map((permission) => permission.key) } },
      select: { id: true, key: true },
    }),
  ]);

  const roleIds = new Map(roles.map((role) => [role.name, role.id]));
  const permissionIds = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );

  for (const roleSeed of roleSeeds) {
    const roleId = roleIds.get(roleSeed.name);

    if (!roleId) {
      throw new Error(`RBAC seed could not resolve role ${roleSeed.name}.`);
    }

    const assignedPermissionIds = rolePermissionMatrix[roleSeed.name].map((key) => {
      const permissionId = permissionIds.get(key);

      if (!permissionId) {
        throw new Error(`RBAC seed could not resolve permission ${key}.`);
      }

      return permissionId;
    });

    await database.$transaction([
      database.rolePermission.deleteMany({
        where: {
          roleId,
          permissionId: { notIn: assignedPermissionIds },
        },
      }),
      database.rolePermission.createMany({
        data: assignedPermissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  const managedRoleIds = roles.map((role) => role.id);

  return {
    roles: roles.length,
    permissions: permissions.length,
    rolePermissions: await database.rolePermission.count({
      where: { roleId: { in: managedRoleIds } },
    }),
  };
}
