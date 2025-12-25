import type { PrismaClient } from '@prisma/client';

export type DocumentType = 'Quote' | 'ProformaInvoice' | 'SalesOrder' | 'Invoice';

export interface CapturePriceHistoryOptions {
  prisma: PrismaClient;
  documentType: DocumentType;
  documentId: string;
  documentNo: string;
  documentDate: Date;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number | string;
    discountPct?: number;
  }>;
  currency?: string;
}

/**
 * Captures price history entries for all items in a sales document.
 * This is read-only audit data that tracks pricing over time.
 * Failures are logged but do NOT block the main request flow.
 */
export async function capturePriceHistory({
  prisma,
  documentType,
  documentId,
  documentNo,
  documentDate,
  customerId,
  items,
  currency = 'INR',
}: CapturePriceHistoryOptions): Promise<void> {
  try {
    // Check if history entries already exist for this document
    const existing = await prisma.priceHistory.findFirst({
      where: {
        documentType,
        documentId,
      },
    });

    // Skip if already captured (idempotent - prevents duplicates on updates)
    if (existing) {
      return;
    }

    // Create history entries for each item
    await prisma.priceHistory.createMany({
      data: items.map((item) => ({
        customerId,
        productId: item.productId,
        documentType,
        documentId,
        documentNo,
        documentDate,
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? item.unitPrice : item.unitPrice,
        discountPct: item.discountPct ?? 0,
        currency,
      })),
      skipDuplicates: true, // Extra safety against duplicates
    });
  } catch (error) {
    // Do NOT throw – price history is best-effort, never breaks primary workflow
    console.error('Failed to capture price history', {
      error,
      documentType,
      documentId,
      documentNo,
      customerId,
    });
  }
}

