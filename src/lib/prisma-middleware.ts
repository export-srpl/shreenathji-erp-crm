import { Prisma } from '@prisma/client';
import { getPrismaClient } from './prisma';
import { generateSRPLId, ModuleCode } from './srpl-id-generator';

// Map Prisma model names to module codes
const MODEL_TO_MODULE_CODE: Record<string, ModuleCode> = {
  Customer: 'CUST',
  Lead: 'LEAD',
  Product: 'PROD',
  Deal: 'DEAL',
  Quote: 'QUOT',
  SalesOrder: 'SO',
  ProformaInvoice: 'PI',
  Invoice: 'INV',
  Payment: 'PAY',
};

/**
 * Sets up Prisma middleware to auto-generate SRPL IDs on create
 */
export function setupSRPLIdMiddleware(prisma: any) {
  prisma.$use(async (params: any, next: any) => {
    // Only intercept create operations for models that have srplId field
    if (params.action === 'create' && MODEL_TO_MODULE_CODE[params.model]) {
      const moduleCode = MODEL_TO_MODULE_CODE[params.model];
      
      // Only generate if srplId is not already provided
      if (!params.args.data.srplId) {
        try {
          const srplId = await generateSRPLId({
            moduleCode,
            prisma,
            year: params.args.data.year,
            financialYear: params.args.data.financialYear,
          });
          
          params.args.data.srplId = srplId;
        } catch (error) {
          console.error(`Failed to generate SRPL ID for ${params.model}:`, error);
          // Don't fail the create operation, but log the error
          // The ID can be generated later via migration
        }
      }
    }

    // Also handle createMany operations
    if (params.action === 'createMany' && MODEL_TO_MODULE_CODE[params.model]) {
      const moduleCode = MODEL_TO_MODULE_CODE[params.model];
      
      // For createMany, we need to generate IDs for each record
      if (Array.isArray(params.args.data)) {
        for (const record of params.args.data) {
          if (!record.srplId) {
            try {
              const srplId = await generateSRPLId({
                moduleCode,
                prisma,
              });
              record.srplId = srplId;
            } catch (error) {
              console.error(`Failed to generate SRPL ID for ${params.model}:`, error);
            }
          }
        }
      }
    }

    return next(params);
  });
}

