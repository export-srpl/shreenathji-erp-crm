import type { PrismaClient } from '@prisma/client';

export interface SearchResult {
  id: string;
  srplId?: string | null;
  type: 'lead' | 'deal' | 'customer' | 'product' | 'quote' | 'invoice' | 'sales_order' | 'proforma_invoice';
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
  relevanceScore: number;
}

export interface SearchOptions {
  limit?: number;
  entityTypes?: string[];
  userId?: string; // For RBAC filtering
}

/**
 * Global search across all entities
 */
export async function globalSearch(
  prisma: PrismaClient,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { limit = 20, entityTypes, userId } = options;
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const results: SearchResult[] = [];

  // Search Leads
  if (!entityTypes || entityTypes.includes('lead')) {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { contactName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
        ...(userId ? { ownerId: userId } : {}), // RBAC: only own leads if not admin
      },
      take: limit,
      select: {
        id: true,
        srplId: true,
        companyName: true,
        contactName: true,
        email: true,
        status: true,
      },
    });

    for (const lead of leads) {
      const relevance = calculateRelevance(lead.companyName, searchTerm) * 0.4 +
        (lead.contactName ? calculateRelevance(lead.contactName, searchTerm) * 0.3 : 0) +
        (lead.srplId && lead.srplId.toLowerCase().includes(searchTerm) ? 0.3 : 0);

      results.push({
        id: lead.id,
        srplId: lead.srplId,
        type: 'lead',
        title: lead.companyName,
        subtitle: lead.contactName || undefined,
        description: lead.status,
        relevanceScore: relevance,
      });
    }
  }

  // Search Customers
  if (!entityTypes || entityTypes.includes('customer')) {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { contactName: { contains: searchTerm, mode: 'insensitive' } },
          { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        srplId: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        customerType: true,
      },
    });

    for (const customer of customers) {
      const relevance = calculateRelevance(customer.companyName, searchTerm) * 0.5 +
        (customer.srplId && customer.srplId.toLowerCase().includes(searchTerm) ? 0.5 : 0);

      results.push({
        id: customer.id,
        srplId: customer.srplId,
        type: 'customer',
        title: customer.companyName,
        subtitle: customer.contactName || customer.contactEmail || undefined,
        description: customer.customerType,
        relevanceScore: relevance,
      });
    }
  }

  // Search Products
  if (!entityTypes || entityTypes.includes('product')) {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        srplId: true,
        name: true,
        sku: true,
        unitPrice: true,
      },
    });

    for (const product of products) {
      const relevance = calculateRelevance(product.name, searchTerm) * 0.4 +
        (product.sku && product.sku.toLowerCase().includes(searchTerm) ? 0.4 : 0) +
        (product.srplId && product.srplId.toLowerCase().includes(searchTerm) ? 0.2 : 0);

      results.push({
        id: product.id,
        srplId: product.srplId,
        type: 'product',
        title: product.name,
        subtitle: product.sku || undefined,
        description: product.unitPrice ? `₹${Number(product.unitPrice).toLocaleString('en-IN')}` : undefined,
        relevanceScore: relevance,
      });
    }
  }

  // Search Deals
  if (!entityTypes || entityTypes.includes('deal')) {
    const deals = await prisma.deal.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        customer: {
          select: { companyName: true },
        },
      },
      select: {
        id: true,
        srplId: true,
        title: true,
        stage: true,
        customer: {
          select: { companyName: true },
        },
      },
    });

    for (const deal of deals) {
      const relevance = calculateRelevance(deal.title, searchTerm) * 0.5 +
        (deal.srplId && deal.srplId.toLowerCase().includes(searchTerm) ? 0.5 : 0);

      results.push({
        id: deal.id,
        srplId: deal.srplId,
        type: 'deal',
        title: deal.title,
        subtitle: deal.customer.companyName,
        description: deal.stage,
        relevanceScore: relevance,
      });
    }
  }

  // Search Quotes
  if (!entityTypes || entityTypes.includes('quote')) {
    const quotes = await prisma.quote.findMany({
      where: {
        OR: [
          { quoteNumber: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        customer: {
          select: { companyName: true },
        },
      },
      select: {
        id: true,
        srplId: true,
        quoteNumber: true,
        status: true,
        customer: {
          select: { companyName: true },
        },
      },
    });

    for (const quote of quotes) {
      const relevance = calculateRelevance(quote.quoteNumber, searchTerm) * 0.5 +
        (quote.srplId && quote.srplId.toLowerCase().includes(searchTerm) ? 0.5 : 0);

      results.push({
        id: quote.id,
        srplId: quote.srplId,
        type: 'quote',
        title: quote.quoteNumber,
        subtitle: quote.customer.companyName,
        description: quote.status,
        relevanceScore: relevance,
      });
    }
  }

  // Search Invoices
  if (!entityTypes || entityTypes.includes('invoice')) {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
          { srplId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        customer: {
          select: { companyName: true },
        },
      },
      select: {
        id: true,
        srplId: true,
        invoiceNumber: true,
        status: true,
        customer: {
          select: { companyName: true },
        },
      },
    });

    for (const invoice of invoices) {
      const relevance = calculateRelevance(invoice.invoiceNumber, searchTerm) * 0.5 +
        (invoice.srplId && invoice.srplId.toLowerCase().includes(searchTerm) ? 0.5 : 0);

      results.push({
        id: invoice.id,
        srplId: invoice.srplId,
        type: 'invoice',
        title: invoice.invoiceNumber,
        subtitle: invoice.customer.companyName,
        description: invoice.status,
        relevanceScore: relevance,
      });
    }
  }

  // Sort by relevance and limit
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Calculate relevance score (0-1) based on match quality
 */
function calculateRelevance(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match
  if (lowerText === lowerQuery) return 1.0;

  // Starts with query
  if (lowerText.startsWith(lowerQuery)) return 0.9;

  // Contains query
  if (lowerText.includes(lowerQuery)) {
    // Closer to start = higher score
    const index = lowerText.indexOf(lowerQuery);
    return 0.7 - (index / text.length) * 0.2;
  }

  // Word boundary match
  const words = lowerText.split(/\s+/);
  const queryWords = lowerQuery.split(/\s+/);
  let wordMatches = 0;
  for (const qWord of queryWords) {
    if (words.some((w) => w.startsWith(qWord) || w.includes(qWord))) {
      wordMatches++;
    }
  }
  if (wordMatches > 0) {
    return 0.5 * (wordMatches / queryWords.length);
  }

  return 0.1;
}

/**
 * Get quick action suggestions based on query
 */
export function getQuickActions(query: string): Array<{ label: string; action: string; icon?: string }> {
  const lowerQuery = query.toLowerCase().trim();
  const actions: Array<{ label: string; action: string; icon?: string }> = [];

  // Create new lead
  if (lowerQuery.length > 0) {
    actions.push({
      label: `Create new lead: "${query}"`,
      action: `create:lead:${query}`,
      icon: 'plus',
    });
  }

  // Common actions
  actions.push(
    { label: 'Create Lead', action: 'create:lead', icon: 'plus' },
    { label: 'Create Deal', action: 'create:deal', icon: 'plus' },
    { label: 'Create Customer', action: 'create:customer', icon: 'plus' },
    { label: 'Create Product', action: 'create:product', icon: 'plus' },
  );

  return actions;
}

