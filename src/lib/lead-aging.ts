import type { PrismaClient } from '@prisma/client';

/**
 * Track lead stage aging - call this when lead stage changes
 */
export async function trackStageChange(
  prisma: PrismaClient,
  leadId: string,
  newStageId: string | null,
  newStageName: string
): Promise<void> {
  try {
    // Get current stage aging entry (if any)
    const currentAging = await prisma.leadStageAging.findFirst({
      where: {
        leadId,
        exitedAt: null, // Still in this stage
      },
      orderBy: { enteredAt: 'desc' },
    });

    // Exit current stage if exists
    if (currentAging && currentAging.stageName !== newStageName) {
      const exitDate = new Date();
      const daysInStage = Math.floor(
        (exitDate.getTime() - currentAging.enteredAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      await prisma.leadStageAging.update({
        where: { id: currentAging.id },
        data: {
          exitedAt: exitDate,
          daysInStage,
        },
      });
    }

    // Create new stage entry if stage actually changed
    if (!currentAging || currentAging.stageName !== newStageName) {
      await prisma.leadStageAging.create({
        data: {
          leadId,
          stageId: newStageId,
          stageName: newStageName,
          enteredAt: new Date(),
        },
      });
    }
  } catch (error) {
    // Best-effort aging - don't block workflow
    console.error('Failed to track stage aging:', error);
  }
}

/**
 * Get current aging information for a lead
 */
export async function getLeadAging(prisma: PrismaClient, leadId: string) {
  const currentAging = await prisma.leadStageAging.findFirst({
    where: {
      leadId,
      exitedAt: null,
    },
    orderBy: { enteredAt: 'desc' },
  });

  if (!currentAging) {
    return null;
  }

  const now = new Date();
  const daysInStage = Math.floor(
    (now.getTime() - currentAging.enteredAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    ...currentAging,
    currentDaysInStage: daysInStage,
  };
}

