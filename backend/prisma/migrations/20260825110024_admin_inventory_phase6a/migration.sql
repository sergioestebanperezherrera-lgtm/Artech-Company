-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryMovement_createdByUserId_idx" ON "InventoryMovement"("createdByUserId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
