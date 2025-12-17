-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "application" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "monthlyRequirement" TEXT,
ADD COLUMN     "productInterest" TEXT;
