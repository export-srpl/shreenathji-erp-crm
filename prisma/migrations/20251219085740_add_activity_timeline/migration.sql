-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "pipelineId" TEXT,
ADD COLUMN     "stageId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "statusId" TEXT;

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "srplId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "stageType" TEXT NOT NULL DEFAULT 'open',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "stageType" TEXT NOT NULL DEFAULT 'active',
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_entityType_entityId_createdAt_idx" ON "Activity"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_module_createdAt_idx" ON "Activity"("module", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_performedById_createdAt_idx" ON "Activity"("performedById", "createdAt");

-- CreateIndex
CREATE INDEX "DealPipeline_isDefault_idx" ON "DealPipeline"("isDefault");

-- CreateIndex
CREATE INDEX "DealPipeline_isActive_idx" ON "DealPipeline"("isActive");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_order_idx" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_name_key" ON "PipelineStage"("pipelineId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LeadStage_name_key" ON "LeadStage"("name");

-- CreateIndex
CREATE INDEX "LeadStage_order_idx" ON "LeadStage"("order");

-- CreateIndex
CREATE INDEX "LeadStage_isActive_idx" ON "LeadStage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_name_key" ON "LeadSource"("name");

-- CreateIndex
CREATE INDEX "LeadSource_isActive_idx" ON "LeadSource"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "Label_isActive_idx" ON "Label"("isActive");

-- CreateIndex
CREATE INDEX "Deal_pipelineId_idx" ON "Deal"("pipelineId");

-- CreateIndex
CREATE INDEX "Deal_stageId_idx" ON "Deal"("stageId");

-- CreateIndex
CREATE INDEX "Lead_statusId_idx" ON "Lead"("statusId");

-- CreateIndex
CREATE INDEX "Lead_sourceId_idx" ON "Lead"("sourceId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "DealPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "DealPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
