import { PrismaClient } from '@prisma/client';

export type ModuleCode = 
  | 'CUST'  // Customer
  | 'LEAD'  // Lead
  | 'PROD'  // Product
  | 'VEND'  // Vendor
  | 'DEAL'  // Deal
  | 'QUOT'  // Quotation
  | 'PI'    // Proforma Invoice
  | 'SO'    // Sales Order
  | 'INV'   // Invoice
  | 'CN'    // Credit Note
  | 'DN'    // Debit Note
  | 'DC'    // Delivery Challan
  | 'RCPT'  // Receipt
  | 'TASK'  // Task
  | 'ACT'   // Activity
  | 'PAY'   // Payment
  | 'PROF'; // Proforma

interface GenerateSRPLIdOptions {
  moduleCode: ModuleCode;
  prisma: PrismaClient;
  year?: number;
  financialYear?: string;
}

/**
 * Generates a unique SRPL ID for a module using atomic database operations.
 * Format: SRPL-<MODULE-CODE>-<SEQUENCE> or SRPL-<MODULE-CODE>-FY<YY>-<SEQUENCE>
 * 
 * This function is thread-safe and uses database-level locking to prevent race conditions.
 * 
 * @param options - Configuration options
 * @returns The generated SRPL ID
 */
export async function generateSRPLId(
  options: GenerateSRPLIdOptions
): Promise<string> {
  const { moduleCode, prisma, year, financialYear } = options;

  // Get or create sequence configuration
  let config = await prisma.sequenceConfig.findUnique({
    where: { moduleCode },
  });

  if (!config) {
    // Create default configuration
    config = await prisma.sequenceConfig.create({
      data: {
        moduleCode,
        useYearPrefix: false,
        useFinancialYear: false,
        financialYearStart: 4, // April
        padding: 6,
      },
    });
  }

  // Determine if we need year/FY prefix
  const useYear = config.useYearPrefix && year;
  const useFY = config.useFinancialYear && financialYear;
  const currentYear = year || new Date().getFullYear();
  const currentFY = financialYear || getFinancialYear(new Date(), config.financialYearStart);

  // Use a transaction with row-level locking to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Build where clause for finding counter
    const whereClause: any = {
      moduleCode,
    };
    
    if (useYear) {
      whereClause.year = currentYear;
    } else {
      whereClause.year = null;
    }
    
    if (useFY) {
      whereClause.financialYear = currentFY;
    } else {
      whereClause.financialYear = null;
    }

    // Use raw query with FOR UPDATE for proper locking, then upsert
    // First, try to find and lock the record
    const existing = await tx.$queryRaw<Array<{
      id: string;
      currentValue: number;
    }>>`
      SELECT id, "currentValue" FROM "SequenceCounter"
      WHERE "moduleCode" = ${moduleCode}
        AND ("year" IS NULL AND ${!useYear} OR "year" = ${useYear ? currentYear : null})
        AND ("financialYear" IS NULL AND ${!useFY} OR "financialYear" = ${useFY ? currentFY : null})
      FOR UPDATE
      LIMIT 1
    `;

    let counterRecord;
    
    if (existing.length > 0) {
      // Update existing counter
      counterRecord = await tx.sequenceCounter.update({
        where: { id: existing[0].id },
        data: {
          currentValue: { increment: 1 },
        },
      });
    } else {
      // Create new counter
      counterRecord = await tx.sequenceCounter.create({
        data: {
          moduleCode,
          currentValue: 1,
          year: useYear ? currentYear : null,
          financialYear: useFY ? currentFY : null,
          lastResetAt: new Date(),
        },
      });
    }
      create: {
        moduleCode,
        currentValue: 1, // Start at 1 for first record
        year: useYear ? currentYear : null,
        financialYear: useFY ? currentFY : null,
        lastResetAt: new Date(),
      },
      update: {
        currentValue: { increment: 1 },
      },
    });

    // Generate the SRPL ID
    const sequence = String(counterRecord.currentValue).padStart(config.padding, '0');
    
    let srplId: string;
    if (useFY) {
      srplId = `SRPL-${moduleCode}-${currentFY}-${sequence}`;
    } else if (useYear) {
      srplId = `SRPL-${moduleCode}-${currentYear}-${sequence}`;
    } else {
      srplId = `SRPL-${moduleCode}-${sequence}`;
    }

    return srplId;
  }, {
    isolationLevel: 'Serializable', // Highest isolation level for safety
    timeout: 10000, // 10 second timeout
  });

  return result;
}

/**
 * Gets the financial year string (e.g., 'FY25') for a given date
 */
function getFinancialYear(date: Date, fyStartMonth: number): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= fyStartMonth) {
    // Current calendar year is the FY year
    return `FY${String(year).slice(-2)}`;
  } else {
    // Previous calendar year is the FY year
    return `FY${String(year - 1).slice(-2)}`;
  }
}

/**
 * Initializes default sequence counters for all modules
 * Call this during application startup or migration
 */
export async function initializeSequenceCounters(prisma: PrismaClient): Promise<void> {
  const modules: ModuleCode[] = [
    'CUST', 'LEAD', 'PROD', 'VEND', 'DEAL', 'QUOT', 'PI', 'SO',
    'INV', 'CN', 'DN', 'DC', 'RCPT', 'TASK', 'ACT', 'PAY', 'PROF',
  ];

  for (const moduleCode of modules) {
    // Create config if it doesn't exist
    await prisma.sequenceConfig.upsert({
      where: { moduleCode },
      create: {
        moduleCode,
        useYearPrefix: false,
        useFinancialYear: false,
        financialYearStart: 4,
        padding: 6,
      },
      update: {},
    });

    // Create initial counter if it doesn't exist
    const existing = await prisma.sequenceCounter.findFirst({
      where: {
        moduleCode,
        year: null,
        financialYear: null,
      },
    });

    if (!existing) {
      await prisma.sequenceCounter.create({
        data: {
          moduleCode,
          currentValue: 0,
        },
      });
    }
  }
}

/**
 * Gets the next sequence number without incrementing (for preview)
 */
export async function previewNextSRPLId(
  options: GenerateSRPLIdOptions
): Promise<string> {
  const { moduleCode, prisma, year, financialYear } = options;

  const config = await prisma.sequenceConfig.findUnique({
    where: { moduleCode },
  });

  if (!config) {
    // Return preview with default config
    return `SRPL-${moduleCode}-000001`;
  }

  const useYear = config.useYearPrefix && year;
  const useFY = config.useFinancialYear && financialYear;
  const currentYear = year || new Date().getFullYear();
  const currentFY = financialYear || getFinancialYear(new Date(), config.financialYearStart);

  const counter = await prisma.sequenceCounter.findFirst({
    where: {
      moduleCode,
      ...(useYear ? { year: currentYear } : { year: null }),
      ...(useFY ? { financialYear: currentFY } : { financialYear: null }),
    },
    orderBy: { updatedAt: 'desc' },
  });

  const nextValue = (counter?.currentValue || 0) + 1;
  const sequence = String(nextValue).padStart(config.padding, '0');

  if (useFY) {
    return `SRPL-${moduleCode}-${currentFY}-${sequence}`;
  } else if (useYear) {
    return `SRPL-${moduleCode}-${currentYear}-${sequence}`;
  } else {
    return `SRPL-${moduleCode}-${sequence}`;
  }
}

