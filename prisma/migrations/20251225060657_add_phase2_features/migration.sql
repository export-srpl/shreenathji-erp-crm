-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "winLossReasonId" TEXT,
ADD COLUMN     "wonLostAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER DEFAULT 0,
ADD COLUMN     "temperature" TEXT,
ADD COLUMN     "winLossReasonId" TEXT,
ADD COLUMN     "wonLostAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LeadStageAging" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "stageId" TEXT,
    "stageName" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "daysInStage" INTEGER,

    CONSTRAINT "LeadStageAging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScoreHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "temperature" TEXT NOT NULL,
    "reason" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScoringConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT NOT NULL,
    "temperatureThresholds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinLossReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinLossReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadStageAging_leadId_idx" ON "LeadStageAging"("leadId");

-- CreateIndex
CREATE INDEX "LeadStageAging_stageId_idx" ON "LeadStageAging"("stageId");

-- CreateIndex
CREATE INDEX "LeadStageAging_enteredAt_idx" ON "LeadStageAging"("enteredAt");

-- CreateIndex
CREATE INDEX "LeadScoreHistory_leadId_calculatedAt_idx" ON "LeadScoreHistory"("leadId", "calculatedAt");

-- CreateIndex
CREATE INDEX "LeadScoreHistory_calculatedAt_idx" ON "LeadScoreHistory"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadScoringConfig_name_key" ON "LeadScoringConfig"("name");

-- CreateIndex
CREATE INDEX "LeadScoringConfig_isActive_isDefault_idx" ON "LeadScoringConfig"("isActive", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "WinLossReason_name_key" ON "WinLossReason"("name");

-- CreateIndex
CREATE INDEX "WinLossReason_type_module_isActive_idx" ON "WinLossReason"("type", "module", "isActive");

-- CreateIndex
CREATE INDEX "WinLossReason_order_idx" ON "WinLossReason"("order");

-- CreateIndex
CREATE INDEX "SavedView_userId_module_idx" ON "SavedView"("userId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_module_name_key" ON "SavedView"("userId", "module", "name");

-- CreateIndex
CREATE INDEX "Deal_winLossReasonId_idx" ON "Deal"("winLossReasonId");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_temperature_idx" ON "Lead"("temperature");

-- CreateIndex
CREATE INDEX "Lead_lastActivityDate_idx" ON "Lead"("lastActivityDate");

-- CreateIndex
CREATE INDEX "Lead_winLossReasonId_idx" ON "Lead"("winLossReasonId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_winLossReasonId_fkey" FOREIGN KEY ("winLossReasonId") REFERENCES "WinLossReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_winLossReasonId_fkey" FOREIGN KEY ("winLossReasonId") REFERENCES "WinLossReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageAging" ADD CONSTRAINT "LeadStageAging_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScoreHistory" ADD CONSTRAINT "LeadScoreHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
