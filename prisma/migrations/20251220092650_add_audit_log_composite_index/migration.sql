-- CreateIndex
CREATE INDEX "AuditLog_userId_action_timestamp_idx" ON "AuditLog"("userId", "action", "timestamp");
