/**
 * Migration script to generate SRPL IDs for existing records
 * Run this once after deploying the SRPL ID system
 * 
 * Usage: npx tsx scripts/migrate-srpl-ids.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateSRPLId } from '../src/lib/srpl-id-generator';

const prisma = new PrismaClient();

async function migrateModule(
  model: string,
  moduleCode: 'LEAD' | 'CUST' | 'PROD' | 'DEAL' | 'QUOT' | 'SO' | 'PI' | 'INV',
  batchSize = 100
) {
  console.log(`\nMigrating ${model} (${moduleCode})...`);
  
  const modelClient = (prisma as any)[model];
  if (!modelClient) {
    console.error(`Model ${model} not found`);
    return;
  }

  let offset = 0;
  let hasMore = true;
  let migrated = 0;

  while (hasMore) {
    const records = await modelClient.findMany({
      where: {
        srplId: null,
      },
      take: batchSize,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });

    if (records.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`  Processing batch of ${records.length} records...`);

    for (const record of records) {
      try {
        const srplId = await generateSRPLId({
          moduleCode,
          prisma,
        });

        await modelClient.update({
          where: { id: record.id },
          data: { srplId },
        });

        migrated++;
      } catch (error) {
        console.error(`  Failed to migrate record ${record.id}:`, error);
      }
    }

    offset += batchSize;
    console.log(`  Migrated ${migrated} records so far...`);
  }

  console.log(`✓ Completed ${model}: ${migrated} records migrated`);
}

async function main() {
  console.log('Starting SRPL ID migration...\n');

  try {
    // Migrate each module
    await migrateModule('lead', 'LEAD');
    await migrateModule('customer', 'CUST');
    await migrateModule('product', 'PROD');
    await migrateModule('deal', 'DEAL');
    await migrateModule('quote', 'QUOT');
    await migrateModule('salesOrder', 'SO');
    await migrateModule('proformaInvoice', 'PI');
    await migrateModule('invoice', 'INV');

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

