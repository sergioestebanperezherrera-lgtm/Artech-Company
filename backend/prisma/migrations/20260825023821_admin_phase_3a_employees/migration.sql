-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- Generate employee codes without relying on a race-prone row count.
CREATE SEQUENCE "employee_code_seq" MINVALUE 1 START 1;

SELECT setval(
    '"employee_code_seq"',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING("code" FROM 5) AS INTEGER))
            FROM "Employee"
            WHERE "code" ~ '^EMP-[0-9]+$'
        ),
        0
    ) + 1,
    false
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_normalizedName_key" ON "Position"("normalizedName");

-- CreateIndex
CREATE INDEX "Position_isActive_idx" ON "Position"("isActive");

-- CreateIndex
CREATE INDEX "Employment_employeeId_idx" ON "Employment"("employeeId");

-- CreateIndex
CREATE INDEX "Employment_positionId_idx" ON "Employment"("positionId");

-- CreateIndex
CREATE INDEX "Employment_status_idx" ON "Employment"("status");

-- CreateIndex
CREATE INDEX "Employment_employeeId_startDate_idx" ON "Employment"("employeeId", "startDate");

-- PostgreSQL enforces the employment invariant even under concurrent requests.
CREATE UNIQUE INDEX "Employment_one_active_per_employee"
ON "Employment"("employeeId")
WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An active employment is open; an ended employment always records its end date.
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_status_endDate_check"
CHECK (
    ("status" = 'ACTIVE' AND "endDate" IS NULL)
    OR
    ("status" = 'ENDED' AND "endDate" IS NOT NULL)
);

ALTER TABLE "Employment" ADD CONSTRAINT "Employment_date_order_check"
CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
