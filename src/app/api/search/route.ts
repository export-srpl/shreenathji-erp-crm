import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const prisma = await getPrismaClient();
    const searchTerm = `%${query.trim()}%`;

    // Search across multiple entities in parallel
    const [leads, customers, deals, quotes, invoices, products] = await Promise.all([
      // Search Leads
      prisma.lead.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { contactName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),

      // Search Customers
      prisma.customer.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { contactName: { contains: query, mode: 'insensitive' } },
            { contactEmail: { contains: query, mode: 'insensitive' } },
            { contactPhone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          customerType: true,
          createdAt: true,
        },
      }),

      // Search Deals
      prisma.deal.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: {
          id: true,
          title: true,
          stage: true,
          customer: {
            select: { companyName: true },
          },
          createdAt: true,
        },
      }),

      // Search Quotes
      prisma.quote.findMany({
        where: {
          OR: [
            { quoteNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          customer: {
            select: { companyName: true },
          },
          createdAt: true,
        },
      }),

      // Search Invoices
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          customer: {
            select: { companyName: true },
          },
          createdAt: true,
        },
      }),

      // Search Products
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          sku: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    // Format results with entity type
    const results = [
      ...leads.map((lead: any) => ({
        type: 'lead' as const,
        id: lead.id,
        title: lead.companyName,
        subtitle: lead.contactName || lead.email || '',
        metadata: { status: lead.status },
        url: `/sales/leads/add?leadId=${lead.id}`,
      })),
      ...customers.map((customer: any) => ({
        type: 'customer' as const,
        id: customer.id,
        title: customer.companyName,
        subtitle: customer.contactName || customer.contactEmail || '',
        metadata: { type: customer.customerType },
        url: `/customers/add?customerId=${customer.id}`,
      })),
      ...deals.map((deal: any) => ({
        type: 'deal' as const,
        id: deal.id,
        title: deal.title,
        subtitle: deal.customer?.companyName || '',
        metadata: { stage: deal.stage },
        url: `/deals`,
      })),
      ...quotes.map((quote: any) => ({
        type: 'quote' as const,
        id: quote.id,
        title: quote.quoteNumber,
        subtitle: quote.customer?.companyName || '',
        metadata: { status: quote.status },
        url: `/sales/quote`,
      })),
      ...invoices.map((invoice: any) => ({
        type: 'invoice' as const,
        id: invoice.id,
        title: invoice.invoiceNumber,
        subtitle: invoice.customer?.companyName || '',
        metadata: { status: invoice.status },
        url: `/sales/create-invoice`,
      })),
      ...products.map((product: any) => ({
        type: 'product' as const,
        id: product.id,
        title: product.name,
        subtitle: product.sku || product.description || '',
        metadata: { sku: product.sku },
        url: `/inventory/products`,
      })),
    ];

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error('Universal search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

