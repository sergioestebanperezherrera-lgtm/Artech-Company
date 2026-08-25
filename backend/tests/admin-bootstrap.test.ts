import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "@prisma/client";
import {
  bootstrapFirstSuperAdminInTransaction,
} from "../src/modules/admin/admin.bootstrap";
import {
  productionBootstrapConfirmation,
  productionBootstrapEnvironmentVariable,
  validateProductionBootstrapRequest,
} from "../scripts/bootstrap-super-admin.guard";

const targetEmail = "owner@artech.test";

function productionEnvironment() {
  return {
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    RAILWAY_SERVICE_ID: "service-test",
    [productionBootstrapEnvironmentVariable]: productionBootstrapConfirmation,
  };
}

function productionArguments(email = targetEmail) {
  return [
    "--email",
    email,
    "--confirm-email",
    email,
    "--confirm-production",
  ];
}

type FakeDatabaseOptions = {
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    employee: { isActive: boolean } | null;
  } | null;
  role?: { id: string; name: string } | null;
  assignedUserIds?: string[];
};

function createFakeDatabase(options: FakeDatabaseOptions = {}) {
  const calls = {
    userSelect: undefined as Record<string, unknown> | undefined,
    upserts: 0,
  };
  const user =
    options.user === undefined
      ? {
          id: "user-target",
          email: targetEmail,
          isActive: true,
          employee: null,
        }
      : options.user;
  const role =
    options.role === undefined
      ? { id: "role-super-admin", name: "SUPER_ADMIN" }
      : options.role;
  const assignedUserIds = options.assignedUserIds ?? [];
  const database = {
    user: {
      findUnique: async (query: { select: Record<string, unknown> }) => {
        calls.userSelect = query.select;
        return user;
      },
    },
    role: {
      findUnique: async () => role,
    },
    userRole: {
      findMany: async () =>
        assignedUserIds.map((userId) => ({ userId })),
      upsert: async () => {
        calls.upserts += 1;
        return { userId: user?.id ?? "" };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "role" | "user" | "userRole">;

  return { calls, database };
}

test("production bootstrap requires every explicit Railway guard", () => {
  assert.throws(
    () =>
      validateProductionBootstrapRequest(productionArguments(), {
        ...productionEnvironment(),
        NODE_ENV: "development",
      }),
    /NODE_ENV=production/,
  );
  assert.throws(
    () =>
      validateProductionBootstrapRequest(productionArguments(), {
        ...productionEnvironment(),
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    /Railway production service/,
  );
  assert.throws(
    () =>
      validateProductionBootstrapRequest(productionArguments(), {
        ...productionEnvironment(),
        [productionBootstrapEnvironmentVariable]: undefined,
      }),
    /bootstrap is locked/,
  );
  assert.throws(
    () =>
      validateProductionBootstrapRequest(
        productionArguments().filter((value) => value !== "--confirm-production"),
        productionEnvironment(),
      ),
    /Usage:/,
  );
  assert.throws(
    () =>
      validateProductionBootstrapRequest(
        [
          "--email",
          targetEmail,
          "--confirm-email",
          "different@artech.test",
          "--confirm-production",
        ],
        productionEnvironment(),
      ),
    /Usage:/,
  );

  assert.deepEqual(
    validateProductionBootstrapRequest(
      productionArguments(" Owner@Artech.Test "),
      productionEnvironment(),
    ),
    { email: targetEmail },
  );
});

test("bootstrap grants only the first SUPER_ADMIN with minimal user fields", async () => {
  const { calls, database } = createFakeDatabase();
  const result = await bootstrapFirstSuperAdminInTransaction(
    database,
    targetEmail,
  );

  assert.deepEqual(result, {
    email: targetEmail,
    role: "SUPER_ADMIN",
    created: true,
  });
  assert.equal(calls.upserts, 1);
  assert.deepEqual(Object.keys(calls.userSelect ?? {}).sort(), [
    "email",
    "employee",
    "id",
    "isActive",
  ]);
  assert.equal("passwordHash" in (calls.userSelect ?? {}), false);
});

test("bootstrap is idempotent for the same existing SUPER_ADMIN", async () => {
  const { calls, database } = createFakeDatabase({
    assignedUserIds: ["user-target"],
  });
  const result = await bootstrapFirstSuperAdminInTransaction(
    database,
    targetEmail,
  );

  assert.equal(result.created, false);
  assert.equal(calls.upserts, 0);
});

test("bootstrap closes before assigning a different SUPER_ADMIN", async () => {
  const { calls, database } = createFakeDatabase({
    assignedUserIds: ["another-user"],
  });

  await assert.rejects(
    bootstrapFirstSuperAdminInTransaction(database, targetEmail),
    /bootstrap is closed/,
  );
  assert.equal(calls.upserts, 0);
});

test("bootstrap never creates users and rejects missing or inactive accounts", async () => {
  const missing = createFakeDatabase({ user: null });
  await assert.rejects(
    bootstrapFirstSuperAdminInTransaction(missing.database, targetEmail),
    /does not exist/,
  );
  assert.equal(missing.calls.upserts, 0);

  const inactive = createFakeDatabase({
    user: {
      id: "user-target",
      email: targetEmail,
      isActive: false,
      employee: null,
    },
  });
  await assert.rejects(
    bootstrapFirstSuperAdminInTransaction(inactive.database, targetEmail),
    /is inactive/,
  );
  assert.equal(inactive.calls.upserts, 0);

  const inactiveEmployee = createFakeDatabase({
    user: {
      id: "user-target",
      email: targetEmail,
      isActive: true,
      employee: { isActive: false },
    },
  });
  await assert.rejects(
    bootstrapFirstSuperAdminInTransaction(
      inactiveEmployee.database,
      targetEmail,
    ),
    /inactive employee/,
  );
  assert.equal(inactiveEmployee.calls.upserts, 0);
});
