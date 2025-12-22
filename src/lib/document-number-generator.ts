import { getPrismaClient } from './prisma';

/**
 * Generate the next sequential document number for a given type
 * Format: PREFIX-YYYY-NNNN (e.g., PI-2024-0001, SO-2024-0001, INV-2024-0001)
 */
export async function generateNextDocumentNumber(
  type: 'QUOTE' | 'PROFORMA' | 'SALES_ORDER' | 'INVOICE'
): Promise<string> {
  const prisma = await getPrismaClient();
  const currentYear = new Date().getFullYear();
  
  const prefixes: Record<string, string> = {
    QUOTE: 'Q',
    PROFORMA: 'PI',
    SALES_ORDER: 'SO',
    INVOICE: 'INV',
  };
  
  const prefix = prefixes[type];
  const yearPrefix = `${prefix}-${currentYear}-`;
  
  try {
    let maxNumber = 0;
    
    if (type === 'QUOTE') {
      const quotes = await prisma.quote.findMany({
        where: {
          quoteNumber: {
            startsWith: yearPrefix,
          },
        },
        select: { quoteNumber: true },
      });
      
      quotes.forEach((quote) => {
        const match = quote.quoteNumber.match(new RegExp(`^${yearPrefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    } else if (type === 'PROFORMA') {
      const proformas = await prisma.proformaInvoice.findMany({
        where: {
          proformaNumber: {
            startsWith: yearPrefix,
          },
        },
        select: { proformaNumber: true },
      });
      
      proformas.forEach((proforma) => {
        const match = proforma.proformaNumber.match(new RegExp(`^${yearPrefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    } else if (type === 'SALES_ORDER') {
      const orders = await prisma.salesOrder.findMany({
        where: {
          orderNumber: {
            startsWith: yearPrefix,
          },
        },
        select: { orderNumber: true },
      });
      
      orders.forEach((order) => {
        const match = order.orderNumber.match(new RegExp(`^${yearPrefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    } else if (type === 'INVOICE') {
      const invoices = await prisma.invoice.findMany({
        where: {
          invoiceNumber: {
            startsWith: yearPrefix,
          },
        },
        select: { invoiceNumber: true },
      });
      
      invoices.forEach((invoice) => {
        const match = invoice.invoiceNumber.match(new RegExp(`^${yearPrefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    }
    
    const nextNumber = maxNumber + 1;
    return `${yearPrefix}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error(`Error generating ${type} document number:`, error);
    // Fallback to timestamp-based number if sequence generation fails
    return `${prefix}-${Date.now()}`;
  }
}

