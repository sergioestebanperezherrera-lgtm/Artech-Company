-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "shiftAssignmentId" TEXT,
    "workDate" DATE NOT NULL,
    "expectedShiftName" TEXT,
    "expectedShiftType" "ShiftType",
    "expectedStartTime" TIME(0),
    "expectedEndTime" TIME(0),
    "expectedCrossesMidnight" BOOLEAN,
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "adjustedByUserId" TEXT,
    "adjustmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_workDate_idx" ON "AttendanceRecord"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_workDate_idx" ON "AttendanceRecord"("workDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_shiftAssignmentId_idx" ON "AttendanceRecord"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_adjustedByUserId_idx" ON "AttendanceRecord"("adjustedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employmentId_workDate_key" ON "AttendanceRecord"("employmentId", "workDate");

-- Attendance integrity checks kept close to the table that owns the data.
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_lateMinutes_non_negative_check"
CHECK ("lateMinutes" >= 0);

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_clock_order_check"
CHECK ("clockOutAt" IS NULL OR "clockInAt" IS NULL OR "clockOutAt" > "clockInAt");

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_adjustment_trace_check"
CHECK (
  ("adjustedByUserId" IS NULL AND "adjustmentReason" IS NULL)
  OR
  ("adjustedByUserId" IS NOT NULL AND "adjustmentReason" IS NOT NULL AND length(btrim("adjustmentReason")) > 0)
);

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_adjustedByUserId_fkey" FOREIGN KEY ("adjustedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
