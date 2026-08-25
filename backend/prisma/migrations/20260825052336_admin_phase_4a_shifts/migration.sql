-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('DAY', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftWorkDay" (
    "shiftId" TEXT NOT NULL,
    "day" "Weekday" NOT NULL,

    CONSTRAINT "ShiftWorkDay_pkey" PRIMARY KEY ("shiftId","day")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");

-- CreateIndex
CREATE INDEX "Shift_type_idx" ON "Shift"("type");

-- CreateIndex
CREATE INDEX "Shift_isActive_idx" ON "Shift"("isActive");

-- CreateIndex
CREATE INDEX "ShiftWorkDay_day_idx" ON "ShiftWorkDay"("day");

-- CreateIndex
CREATE INDEX "ShiftAssignment_employmentId_idx" ON "ShiftAssignment"("employmentId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_employmentId_effectiveFrom_idx" ON "ShiftAssignment"("employmentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ShiftAssignment_employmentId_effectiveTo_idx" ON "ShiftAssignment"("employmentId", "effectiveTo");

-- PostgreSQL enforces one current shift assignment per employment.
CREATE UNIQUE INDEX "ShiftAssignment_one_open_per_employment"
ON "ShiftAssignment"("employmentId")
WHERE "effectiveTo" IS NULL;

-- AddForeignKey
ALTER TABLE "ShiftWorkDay" ADD CONSTRAINT "ShiftWorkDay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_date_order_check"
CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
