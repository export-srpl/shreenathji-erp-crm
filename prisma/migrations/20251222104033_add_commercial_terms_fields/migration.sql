-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "incoTerms" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "poDate" TIMESTAMP(3),
ADD COLUMN     "poNumber" TEXT;

-- AlterTable
ALTER TABLE "ProformaInvoice" ADD COLUMN     "incoTerms" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "poDate" TIMESTAMP(3),
ADD COLUMN     "poNumber" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "incoTerms" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "poDate" TIMESTAMP(3),
ADD COLUMN     "poNumber" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "incoTerms" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "poDate" TIMESTAMP(3),
ADD COLUMN     "poNumber" TEXT;
