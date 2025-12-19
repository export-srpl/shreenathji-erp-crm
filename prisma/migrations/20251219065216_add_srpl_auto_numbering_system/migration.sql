/*
  Warnings:

  - A unique constraint covering the columns `[srplId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `ProformaInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[srplId]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "ProformaInvoice" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "srplId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "srplId" TEXT;

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "id" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER,
    "financialYear" TEXT,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceConfig" (
    "id" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "useYearPrefix" BOOLEAN NOT NULL DEFAULT false,
    "useFinancialYear" BOOLEAN NOT NULL DEFAULT false,
    "financialYearStart" INTEGER NOT NULL DEFAULT 4,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SequenceCounter_moduleCode_year_idx" ON "SequenceCounter"("moduleCode", "year");

-- CreateIndex
CREATE INDEX "SequenceCounter_moduleCode_financialYear_idx" ON "SequenceCounter"("moduleCode", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceCounter_moduleCode_year_financialYear_key" ON "SequenceCounter"("moduleCode", "year", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceConfig_moduleCode_key" ON "SequenceConfig"("moduleCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_srplId_key" ON "Customer"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_srplId_key" ON "Deal"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_srplId_key" ON "Invoice"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_srplId_key" ON "Lead"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_srplId_key" ON "Product"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_srplId_key" ON "ProformaInvoice"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_srplId_key" ON "Quote"("srplId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_srplId_key" ON "SalesOrder"("srplId");
