import "dotenv/config";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

const phase5aMigration = "20260825070000_admin_phase_5a_cash_pos";

function deployMigrations(schemaPath: string, databaseUrl: string) {
  const prismaCli = require.resolve("prisma/build/index.js");
  execFileSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", schemaPath],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    },
  );
}

test("Phase 5A migrates legacy WEB and POS sales while enforcing new POS rows", async () => {
  const sourcePrisma = resolve("prisma");
  const sourceMigrations = join(sourcePrisma, "migrations");
  const temporaryRoot = mkdtempSync(join(tmpdir(), "artech-phase5a-"));
  const temporaryPrisma = join(temporaryRoot, "prisma");
  const temporaryMigrations = join(temporaryPrisma, "migrations");
  const schemaPath = join(temporaryPrisma, "schema.prisma");
  const databaseUrl = process.env.DATABASE_URL;

  assert.ok(databaseUrl, "DATABASE_URL is required for migration verification.");
  mkdirSync(temporaryMigrations, { recursive: true });
  cpSync(join(sourcePrisma, "schema.prisma"), schemaPath);
  cpSync(
    join(sourceMigrations, "migration_lock.toml"),
    join(temporaryMigrations, "migration_lock.toml"),
  );

  for (const entry of readdirSync(sourceMigrations, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name < phase5aMigration) {
      cpSync(
        join(sourceMigrations, entry.name),
        join(temporaryMigrations, entry.name),
        { recursive: true },
      );
    }
  }

  const schemaName = `phase5a_${crypto.randomUUID().replaceAll("-", "")}`;
  assert.match(schemaName, /^[a-z0-9_]+$/);
  const isolatedUrl = new URL(databaseUrl);
  isolatedUrl.searchParams.set("schema", schemaName);
  const isolatedDatabaseUrl = isolatedUrl.toString();
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const isolated = new PrismaClient({
    datasources: { db: { url: isolatedDatabaseUrl } },
  });

  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
    deployMigrations(schemaPath, isolatedDatabaseUrl);

    await isolated.$executeRawUnsafe(`
      INSERT INTO "Category" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
      VALUES ('legacy-category', 'Legacy', 'legacy', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await isolated.$executeRawUnsafe(`
      INSERT INTO "Product" (
        "id", "name", "slug", "description", "sku", "price", "categoryId",
        "hasRgbLighting", "isActive", "isFeatured", "createdAt", "updatedAt"
      ) VALUES (
        'legacy-product', 'Legacy Product', 'legacy-product', 'Legacy product',
        'LEGACY-SKU', 100.00, 'legacy-category', false, true, false,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);
    await isolated.$executeRawUnsafe(`
      INSERT INTO "Sale" (
        "id", "channel", "status", "subtotal", "discount", "total", "createdAt", "updatedAt"
      ) VALUES
        ('legacy-web', 'WEB', 'CONFIRMED', 100.00, 0, 100.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('legacy-pos', 'POS', 'CONFIRMED', 100.00, 0, 100.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await isolated.$executeRawUnsafe(`
      INSERT INTO "SaleItem" ("id", "saleId", "productId", "quantity", "unitPrice", "subtotal")
      VALUES
        ('legacy-web-item', 'legacy-web', 'legacy-product', 1, 100.00, 100.00),
        ('legacy-pos-item', 'legacy-pos', 'legacy-product', 1, 100.00, 100.00)
    `);
    await isolated.$executeRawUnsafe(`
      INSERT INTO "Payment" (
        "id", "saleId", "method", "status", "amount", "createdAt", "updatedAt"
      ) VALUES (
        'legacy-payment', 'legacy-pos', 'CASH', 'PAID', 100.00,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    cpSync(
      join(sourceMigrations, phase5aMigration),
      join(temporaryMigrations, phase5aMigration),
      { recursive: true },
    );
    deployMigrations(schemaPath, isolatedDatabaseUrl);

    const sales = await isolated.$queryRawUnsafe<
      Array<{
        id: string;
        channel: string;
        saleNumber: string;
        cashSessionId: string | null;
      }>
    >(`
      SELECT "id", "channel"::text, "saleNumber", "cashSessionId"
      FROM "Sale"
      ORDER BY "id"
    `);
    assert.equal(sales.length, 2);
    assert.deepEqual(
      sales.map((sale) => sale.id),
      ["legacy-pos", "legacy-web"],
    );
    assert.ok(sales.every((sale) => /^SALE-\d{6,}$/.test(sale.saleNumber)));
    assert.equal(sales.find((sale) => sale.id === "legacy-pos")?.cashSessionId, null);

    const snapshots = await isolated.$queryRawUnsafe<
      Array<{ productName: string; sku: string }>
    >(`SELECT "productName", "sku" FROM "SaleItem" ORDER BY "id"`);
    assert.equal(snapshots.length, 2);
    assert.ok(
      snapshots.every(
        (snapshot) =>
          snapshot.productName === "Legacy Product" && snapshot.sku === "LEGACY-SKU",
      ),
    );

    const [payment] = await isolated.$queryRawUnsafe<Array<{ changeAmount: unknown }>>(
      `SELECT "changeAmount" FROM "Payment" WHERE "id" = 'legacy-payment'`,
    );
    assert.equal(String(payment?.changeAmount), "0");

    const constraints = await isolated.$queryRawUnsafe<
      Array<{ conname: string; convalidated: boolean }>
    >(`
      SELECT constraint_row."conname", constraint_row."convalidated"
      FROM "pg_constraint" AS constraint_row
      INNER JOIN "pg_namespace" AS namespace_row
        ON namespace_row."oid" = constraint_row."connamespace"
      WHERE namespace_row."nspname" = current_schema()
        AND constraint_row."conname" IN (
        'Sale_amounts_check',
        'Sale_pos_cash_session_check',
        'SaleItem_values_check',
        'Payment_values_check',
        'InventoryMovement_quantity_check'
      )
    `);
    assert.equal(constraints.length, 5);
    assert.ok(constraints.every((constraint) => constraint.convalidated === false));

    await assert.rejects(
      isolated.$executeRawUnsafe(`
        INSERT INTO "Sale" (
          "id", "saleNumber", "channel", "status", "subtotal", "discount", "total",
          "createdAt", "updatedAt"
        ) VALUES (
          'new-invalid-pos', 'SALE-INVALID', 'POS', 'CONFIRMED', 100.00, 0, 100.00,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `),
    );
  } finally {
    await isolated.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
