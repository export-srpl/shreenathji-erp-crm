import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/analytics/products/conversion
 * Returns conversion funnel metrics per product (Leads -> Deals -> Quotes -> SO -> Invoices)
 * Query params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - productId: string (optional)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const prisma = await getPrismaClient();

    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null;
    const productId = searchParams.get('productId');

    // Build date filters
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Fetch all products (or specific product)
    const products = await prisma.product.findMany({
      where: productId ? { id: productId } : {},
      select: { id: true, name: true, sku: true },
    });

    const results = [];

    for (const product of products) {
      // Count leads with this product
      const leads = await prisma.lead.findMany({
        where: {
          ...(dateFilter && { createdAt: dateFilter }),
          productInterest: { not: null },
        },
        select: { id: true, productInterest: true },
      });

      let leadCount = 0;
      for (const lead of leads) {
        if (!lead.productInterest) continue;
        try {
          const products = JSON.parse(lead.productInterest);
          if (Array.isArray(products)) {
            if (products.some((p: any) => p.productId === product.id)) {
              leadCount++;
            }
          }
        } catch {
          if (lead.productInterest === product.name || lead.productInterest === product.id) {
            leadCount++;
          }
        }
      }

      // Count deals with this product
      const dealCount = await prisma.dealItem.count({
        where: {
          productId: product.id,
          deal: dateFilter ? { createdAt: dateFilter } : {},
        },
        distinct: ['dealId'],
      });

      // Count quotes with this product
      const quoteCount = await prisma.quoteItem.count({
        where: {
          productId: product.id,
          quote: dateFilter ? { issueDate: dateFilter } : {},
        },
        distinct: ['quoteId'],
      });

      // Count sales orders with this product
      const salesOrderCount = await prisma.salesOrderItem.count({
        where: {
          productId: product.id,
          salesOrder: dateFilter ? { orderDate: dateFilter } : {},
        },
        distinct: ['salesOrderId'],
      });

      // Count invoices with this product (final conversion)
      const invoiceCount = await prisma.invoiceItem.count({
        where: {
          productId: product.id,
          invoice: dateFilter ? { issueDate: dateFilter } : {},
        },
        distinct: ['invoiceId'],
      });

      // Calculate conversion rates
      const leadToDealRate = leadCount > 0 ? (dealCount / leadCount) * 100 : 0;
      const dealToQuoteRate = dealCount > 0 ? (quoteCount / dealCount) * 100 : 0;
      const quoteToSORate = quoteCount > 0 ? (salesOrderCount / quoteCount) * 100 : 0;
      const soToInvoiceRate = salesOrderCount > 0 ? (invoiceCount / salesOrderCount) * 100 : 0;
      const overallConversionRate = leadCount > 0 ? (invoiceCount / leadCount) * 100 : 0;

      results.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        funnel: {
          leads: leadCount,
          deals: dealCount,
          quotes: quoteCount,
          salesOrders: salesOrderCount,
          invoices: invoiceCount,
        },
        conversionRates: {
          leadToDeal: isNaN(leadToDealRate) ? 0 : leadToDealRate,
          dealToQuote: isNaN(dealToQuoteRate) ? 0 : dealToQuoteRate,
          quoteToSO: isNaN(quoteToSORate) ? 0 : quoteToSORate,
          soToInvoice: isNaN(soToInvoiceRate) ? 0 : soToInvoiceRate,
          overall: isNaN(overallConversionRate) ? 0 : overallConversionRate,
        },
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch product conversion analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product conversion analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

