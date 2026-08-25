-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT', 'SALE');

-- Stable human-readable sale numbers. Sequence gaps are expected after rollbacks.
CREATE SEQUENCE "sale_number_seq";

-- Extend existing commercial records without replacing their tables.
ALTER TABLE "InventoryMovement" ADD COLUMN "saleId" TEXT;
ALTER TABLE "Payment"
  ADD COLUMN "changeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Sale"
  ADD COLUMN "cashSessionId" TEXT,
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "saleNumber" TEXT;
ALTER TABLE "SaleItem"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "sku" TEXT;

-- Preserve pre-existing rows by deriving immutable snapshots from their current product.
UPDATE "SaleItem" AS item
SET
  "productName" = product."name",
  "sku" = product."sku"
FROM "Product" AS product
WHERE product."id" = item."productId";

ALTER TABLE "SaleItem"
  ALTER COLUMN "productName" SET NOT NULL,
  ALTER COLUMN "sku" SET NOT NULL;

UPDATE "Sale"
SET "saleNumber" = 'SALE-' || LPAD(nextval('"sale_number_seq"')::TEXT, 6, '0')
WHERE "saleNumber" IS NULL;

ALTER TABLE "Sale" ALTER COLUMN "saleNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "CashRegister" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashRegister_code_not_blank" CHECK (BTRIM("code") <> ''),
  CONSTRAINT "CashRegister_name_not_blank" CHECK (BTRIM("name") <> '')
);

-- CreateTable
CREATE TABLE "CashSession" (
  "id" TEXT NOT NULL,
  "cashRegisterId" TEXT NOT NULL,
  "employmentId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openingAmount" DECIMAL(12,2) NOT NULL,
  "expectedClosingAmount" DECIMAL(12,2),
  "actualClosingAmount" DECIMAL(12,2),
  "differenceAmount" DECIMAL(12,2),
  "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashSession_opening_amount_check" CHECK ("openingAmount" >= 0),
  CONSTRAINT "CashSession_closing_amounts_check" CHECK (
    ("expectedClosingAmount" IS NULL OR "expectedClosingAmount" >= 0)
    AND ("actualClosingAmount" IS NULL OR "actualClosingAmount" >= 0)
  ),
  CONSTRAINT "CashSession_state_check" CHECK (
    (
      "status" = 'OPEN'
      AND "closedAt" IS NULL
      AND "closedByUserId" IS NULL
      AND "expectedClosingAmount" IS NULL
      AND "actualClosingAmount" IS NULL
      AND "differenceAmount" IS NULL
    )
    OR
    (
      "status" = 'CLOSED'
      AND "closedAt" IS NOT NULL
      AND "closedAt" >= "openedAt"
      AND "closedByUserId" IS NOT NULL
      AND "expectedClosingAmount" IS NOT NULL
      AND "actualClosingAmount" IS NOT NULL
      AND "differenceAmount" = "actualClosingAmount" - "expectedClosingAmount"
    )
  )
);

-- CreateTable
CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "cashSessionId" TEXT NOT NULL,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "saleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashMovement_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "CashMovement_source_check" CHECK (
    ("type" = 'SALE' AND "saleId" IS NOT NULL AND "reason" IS NULL)
    OR
    ("type" IN ('CASH_IN', 'CASH_OUT') AND "saleId" IS NULL AND BTRIM("reason") <> '')
  )
);

-- Indexes and database-level concurrency guards.
CREATE UNIQUE INDEX "CashRegister_code_key" ON "CashRegister"("code");
CREATE INDEX "CashRegister_isActive_idx" ON "CashRegister"("isActive");
CREATE UNIQUE INDEX "CashSession_one_open_per_register"
  ON "CashSession"("cashRegisterId") WHERE "status" = 'OPEN';
CREATE INDEX "CashSession_cashRegisterId_idx" ON "CashSession"("cashRegisterId");
CREATE INDEX "CashSession_employmentId_idx" ON "CashSession"("employmentId");
CREATE INDEX "CashSession_openedByUserId_idx" ON "CashSession"("openedByUserId");
CREATE INDEX "CashSession_closedByUserId_idx" ON "CashSession"("closedByUserId");
CREATE INDEX "CashSession_status_idx" ON "CashSession"("status");
CREATE INDEX "CashSession_openedAt_idx" ON "CashSession"("openedAt");
CREATE UNIQUE INDEX "CashMovement_saleId_key" ON "CashMovement"("saleId");
CREATE INDEX "CashMovement_cashSessionId_idx" ON "CashMovement"("cashSessionId");
CREATE INDEX "CashMovement_type_idx" ON "CashMovement"("type");
CREATE INDEX "CashMovement_createdByUserId_idx" ON "CashMovement"("createdByUserId");
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");
CREATE INDEX "InventoryMovement_saleId_idx" ON "InventoryMovement"("saleId");
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");
CREATE UNIQUE INDEX "Sale_clientRequestId_key" ON "Sale"("clientRequestId");
CREATE INDEX "Sale_cashSessionId_idx" ON "Sale"("cashSessionId");

-- Legacy rows are intentionally not scanned by these NOT VALID constraints.
-- PostgreSQL still enforces every constraint for rows inserted or updated after
-- this migration, so new POS sales cannot omit cashSessionId.
ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_amounts_check" CHECK (
    "subtotal" >= 0 AND "discount" >= 0 AND "total" >= 0
    AND "total" = "subtotal" - "discount"
  ) NOT VALID,
  ADD CONSTRAINT "Sale_pos_cash_session_check" CHECK (
    "channel" <> 'POS' OR "cashSessionId" IS NOT NULL
  ) NOT VALID;
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_values_check" CHECK (
    "quantity" > 0 AND "unitPrice" >= 0 AND "subtotal" = "unitPrice" * "quantity"
  ) NOT VALID;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_values_check" CHECK (
    "amount" > 0 AND "changeAmount" >= 0
  ) NOT VALID;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_quantity_check" CHECK ("quantity" > 0) NOT VALID;

-- Foreign keys preserve the operational audit trail.
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_cashSessionId_fkey"
  FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession"
  ADD CONSTRAINT "CashSession_cashRegisterId_fkey"
  FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_employmentId_fkey"
  FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_openedByUserId_fkey"
  FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement"
  ADD CONSTRAINT "CashMovement_cashSessionId_fkey"
  FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashMovement_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashMovement_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
