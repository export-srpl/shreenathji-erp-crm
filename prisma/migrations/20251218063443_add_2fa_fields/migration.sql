-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;
