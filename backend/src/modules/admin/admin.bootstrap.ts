import { Prisma, type PrismaClient } from "@prisma/client";
import { superAdminRoleName } from "./admin.grant";

type AdminBootstrapTransaction = Pick<
  Prisma.TransactionClient,
  "role" | "user" | "userRole"
>;

export async function bootstrapFirstSuperAdminInTransaction(
  database: AdminBootstrapTransaction,
  rawEmail: string,
) {
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    throw new Error("An existing user email is required.");
  }

  const [user, role] = await Promise.all([
    database.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        employee: {
          select: { isActive: true },
        },
      },
    }),
    database.role.findUnique({
      where: { name: superAdminRoleName },
      select: { id: true, name: true },
    }),
  ]);

  if (!user) {
    throw new Error(`User ${email} does not exist.`);
  }

  if (!user.isActive) {
    throw new Error(`User ${email} is inactive.`);
  }

  if (user.employee?.isActive === false) {
    throw new Error(`User ${email} is linked to an inactive employee.`);
  }

  if (!role) {
    throw new Error("SUPER_ADMIN does not exist. Run the RBAC seed first.");
  }

  const existingAssignments = await database.userRole.findMany({
    where: { roleId: role.id },
    select: { userId: true },
  });
  const targetAlreadyAssigned = existingAssignments.some(
    (assignment) => assignment.userId === user.id,
  );

  if (targetAlreadyAssigned) {
    return {
      email: user.email,
      role: role.name,
      created: false,
    };
  }

  if (existingAssignments.length > 0) {
    throw new Error(
      "Production bootstrap is closed because SUPER_ADMIN is already assigned.",
    );
  }

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
    select: { userId: true },
  });

  return {
    email: user.email,
    role: role.name,
    created: true,
  };
}

export async function bootstrapFirstSuperAdminByEmail(
  database: PrismaClient,
  email: string,
) {
  return database.$transaction(
    (transaction) =>
      bootstrapFirstSuperAdminInTransaction(transaction, email),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
