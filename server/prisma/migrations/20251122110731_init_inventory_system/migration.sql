/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedById" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT;

-- AlterTable
ALTER TABLE "InternalTransfer" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedById" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedById" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "warehouseId" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "reference" TEXT,
    "action" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPermissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canReceipt" BOOLEAN NOT NULL DEFAULT true,
    "canDelivery" BOOLEAN NOT NULL DEFAULT true,
    "canTransfer" BOOLEAN NOT NULL DEFAULT true,
    "canAdjust" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPermissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_taskType_taskId_idx" ON "ActivityLog"("taskType", "taskId");

-- CreateIndex
CREATE INDEX "ActivityLog_performedById_idx" ON "ActivityLog"("performedById");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPermissions_userId_key" ON "StaffPermissions"("userId");

-- CreateIndex
CREATE INDEX "StaffPermissions_userId_idx" ON "StaffPermissions"("userId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_assignedToId_idx" ON "DeliveryOrder"("assignedToId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_acceptedById_idx" ON "DeliveryOrder"("acceptedById");

-- CreateIndex
CREATE INDEX "InternalTransfer_assignedToId_idx" ON "InternalTransfer"("assignedToId");

-- CreateIndex
CREATE INDEX "InternalTransfer_acceptedById_idx" ON "InternalTransfer"("acceptedById");

-- CreateIndex
CREATE INDEX "Receipt_assignedToId_idx" ON "Receipt"("assignedToId");

-- CreateIndex
CREATE INDEX "Receipt_acceptedById_idx" ON "Receipt"("acceptedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_warehouseId_idx" ON "User"("warehouseId");

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPermissions" ADD CONSTRAINT "StaffPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
