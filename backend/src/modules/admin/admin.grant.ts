import type { PrismaClient } from "@prisma/client";

export const superAdminRoleName = "SUPER_ADMIN";

export async function grantSuperAdminByEmail(
  database: PrismaClient,
  rawEmail: string,
) {
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    throw new Error("An existing user email is required.");
  }

  const [user, role] = await Promise.all([
    database.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    }),
    database.role.findUnique({
      where: { name: superAdminRoleName },
      select: { id: true, name: true },
    }),
  ]);

  if (!user) {
    throw new Error(`User ${email} does not exist.`);
  }

  if (!role) {
    throw new Error("SUPER_ADMIN does not exist. Run the RBAC seed first.");
  }

  const existingAssignment = await database.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    select: { userId: true },
  });

  await database.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  return {
    userId: user.id,
    email: user.email,
    role: role.name,
    created: !existingAssignment,
  };
}
