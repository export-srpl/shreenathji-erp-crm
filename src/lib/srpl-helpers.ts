import { PrismaClient } from '@prisma/client';
import { generateSRPLId, ModuleCode } from './srpl-id-generator';

/**
 * Helper function to create a record with auto-generated SRPL ID
 * Use this instead of direct prisma.model.create() calls
 */
export async function createWithSRPLId<T extends { srplId?: string | null }>(
  prisma: PrismaClient,
  model: string,
  moduleCode: ModuleCode,
  data: any
): Promise<T> {
  // Generate SRPL ID if not provided
  if (!data.srplId) {
    data.srplId = await generateSRPLId({
      moduleCode,
      prisma,
    });
  }

  // Use dynamic model access
  const modelClient = (prisma as any)[model];
  if (!modelClient) {
    throw new Error(`Model ${model} not found in Prisma client`);
  }

  return modelClient.create({
    data,
  });
}

/**
 * Helper function to create many records with auto-generated SRPL IDs
 */
export async function createManyWithSRPLId<T extends { srplId?: string | null }>(
  prisma: PrismaClient,
  model: string,
  moduleCode: ModuleCode,
  data: any[]
): Promise<{ count: number }> {
  // Generate SRPL IDs for all records
  for (const record of data) {
    if (!record.srplId) {
      record.srplId = await generateSRPLId({
        moduleCode,
        prisma,
      });
    }
  }

  const modelClient = (prisma as any)[model];
  if (!modelClient) {
    throw new Error(`Model ${model} not found in Prisma client`);
  }

  return modelClient.createMany({
    data,
  });
}

