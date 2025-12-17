import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

/**
 * GET /api/reports/conversion-funnel
 * Returns conversion funnel metrics:
 * - Total leads
 * - Qualified/Converted leads
 * - Quotes created
 * - Proforma invoices created
 * - Sales orders created
 * - Invoices created
 * - Payments received
 */
export async function GET() {
  try {
    const prisma = await getPrismaClient();
    // Count all leads
    const totalLeads = await prisma.lead.count();

    // Count qualified/converted leads
    const qualifiedLeads = await prisma.lead.count({
      where: {
        status: { in: ['Qualified', 'Converted'] },
      },
    });

    // Count quotes
    const quotesCount = await prisma.quote.count();

    // Count proforma invoices
    const proformasCount = await prisma.proformaInvoice.count();

    // Count sales orders
    const salesOrdersCount = await prisma.salesOrder.count();

    // Count invoices
    const invoicesCount = await prisma.invoice.count();

    // Count payments
    const paymentsCount = await prisma.payment.count();

    // Calculate total payment amount
    const payments = await prisma.payment.findMany({
      select: { amount: true },
    });
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate total invoice amount
    const invoices = await prisma.invoice.findMany({
      include: { items: true },
    });
    const totalInvoiced = invoices.reduce((sum, inv) => {
      const invTotal = inv.items.reduce((itemSum, item) => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity || 0;
        const discount = (item.discountPct || 0) / 100;
        return itemSum + (price * qty * (1 - discount));
      }, 0);
      return sum + invTotal;
    }, 0);

    const result = {
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
      },
      quotes: {
        count: quotesCount,
        fromLeads: qualifiedLeads > 0 ? (quotesCount / qualifiedLeads) * 100 : 0,
      },
      proformaInvoices: {
        count: proformasCount,
        fromQuotes: quotesCount > 0 ? (proformasCount / quotesCount) * 100 : 0,
      },
      salesOrders: {
        count: salesOrdersCount,
        fromProformas: proformasCount > 0 ? (salesOrdersCount / proformasCount) * 100 : 0,
      },
      invoices: {
        count: invoicesCount,
        totalAmount: totalInvoiced,
        fromSalesOrders: salesOrdersCount > 0 ? (invoicesCount / salesOrdersCount) * 100 : 0,
      },
      payments: {
        count: paymentsCount,
        totalAmount: totalPayments,
        collectionRate: totalInvoiced > 0 ? (totalPayments / totalInvoiced) * 100 : 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate conversion funnel:', error);
    return NextResponse.json({ error: 'Failed to generate conversion funnel' }, { status: 500 });
  }
}

