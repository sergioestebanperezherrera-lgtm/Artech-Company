-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GTQ');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('MONTHLY', 'BIWEEKLY');

-- CreateTable
CREATE TABLE "CompensationPeriod" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GTQ',
    "payFrequency" "PayFrequency" NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompensationPeriod_employmentId_idx" ON "CompensationPeriod"("employmentId");

-- CreateIndex
CREATE INDEX "CompensationPeriod_employmentId_effectiveFrom_idx" ON "CompensationPeriod"("employmentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CompensationPeriod_employmentId_effectiveTo_idx" ON "CompensationPeriod"("employmentId", "effectiveTo");

-- PostgreSQL enforces one current compensation period per employment.
CREATE UNIQUE INDEX "CompensationPeriod_one_open_per_employment"
ON "CompensationPeriod"("employmentId")
WHERE "effectiveTo" IS NULL;

-- AddForeignKey
ALTER TABLE "CompensationPeriod" ADD CONSTRAINT "CompensationPeriod_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompensationPeriod" ADD CONSTRAINT "CompensationPeriod_amount_positive_check"
CHECK ("amount" > 0);

ALTER TABLE "CompensationPeriod" ADD CONSTRAINT "CompensationPeriod_date_order_check"
CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
