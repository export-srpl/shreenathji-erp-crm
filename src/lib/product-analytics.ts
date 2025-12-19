import type { PrismaClient } from '@prisma/client';

export interface ProductAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  customerType?: 'domestic' | 'international';
  salesRepId?: string;
  productId?: string;
}

export interface ProductDemandData {
  productId: string;
  productName: string;
  productSku?: string | null;
  // Demand from Leads (productInterest)
  leadCount: number;
  leadQuantity: number; // Sum of monthlyRequirement if available
  // Demand from Deals
  dealCount: number;
  dealQuantity: number; // Sum of DealItem.quantity
  // Demand from Quotes
  quoteCount: number;
  quoteQuantity: number; // Sum of QuoteItem.quantity
  // Demand from Sales Orders
  salesOrderCount: number;
  salesOrderQuantity: number; // Sum of SalesOrderItem.quantity
  // Demand from Invoices (actual sales)
  invoiceCount: number;
  invoiceQuantity: number; // Sum of InvoiceItem.quantity
  // Calculated metrics
  totalDemandQuantity: number;
  totalSoldQuantity: number;
  conversionRate: number; // (invoiceQuantity / leadQuantity) * 100
  avgDealSize: number; // Average deal value per product
  totalRevenue: number; // Sum of invoice line items value
}

export interface ProductTimeSeriesData {
  period: string; // 'YYYY-MM' or 'YYYY-QX'
  productId: string;
  productName: string;
  leadCount: number;
  dealCount: number;
  quoteCount: number;
  salesOrderCount: number;
  invoiceCount: number;
  quantity: number;
  revenue: number;
}

/**
 * Aggregates product demand across all modules (Leads, Deals, Quotes, SO, Invoices)
 */
export async function getProductDemand(
  prisma: PrismaClient,
  filters: ProductAnalyticsFilters = {},
): Promise<ProductDemandData[]> {
  const { startDate, endDate, customerType, salesRepId, productId } = filters;

  // Build base where clauses
  const leadWhere: any = {};
  const dealWhere: any = {};
  const quoteWhere: any = {};
  const soWhere: any = {};
  const invoiceWhere: any = {};

  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    leadWhere.createdAt = dateFilter;
    dealWhere.createdAt = dateFilter;
    quoteWhere.issueDate = dateFilter;
    soWhere.orderDate = dateFilter;
    invoiceWhere.issueDate = dateFilter;
  }

  if (customerType) {
    leadWhere.customerType = customerType;
    dealWhere.customer = { customerType };
    quoteWhere.customer = { customerType };
    soWhere.customer = { customerType };
    invoiceWhere.customer = { customerType };
  }

  if (salesRepId) {
    // Deal doesn't have ownerId, but we can filter via customer's owner if needed
    // For now, we'll skip deal filtering by salesRepId
    quoteWhere.salesRepId = salesRepId;
    soWhere.salesRepId = salesRepId;
    // Invoice might not have salesRepId directly, but can trace via salesOrder
  }

  // Fetch all products (or specific product)
  const products = await prisma.product.findMany({
    where: productId ? { id: productId } : {},
    select: { id: true, name: true, sku: true },
  });

  const results: ProductDemandData[] = [];

  for (const product of products) {
    // 1. Aggregate from Leads (productInterest JSON)
    const leads = await prisma.lead.findMany({
      where: {
        ...leadWhere,
        productInterest: { not: null },
      },
      select: { id: true, productInterest: true, monthlyRequirement: true },
    });

    let leadCount = 0;
    let leadQuantity = 0;

    for (const lead of leads) {
      if (!lead.productInterest) continue;
      try {
        const products = JSON.parse(lead.productInterest);
        if (Array.isArray(products)) {
          const hasProduct = products.some((p: any) => p.productId === product.id);
          if (hasProduct) {
            leadCount++;
            const productEntry = products.find((p: any) => p.productId === product.id);
            if (productEntry?.monthlyRequirement) {
              const qty = parseFloat(productEntry.monthlyRequirement) || 0;
              leadQuantity += qty;
            }
          }
        }
      } catch {
        // Legacy: treat as string product name match
        if (lead.productInterest === product.name || lead.productInterest === product.id) {
          leadCount++;
          if (lead.monthlyRequirement) {
            leadQuantity += parseFloat(lead.monthlyRequirement) || 0;
          }
        }
      }
    }

    // 2. Aggregate from Deals
    const dealItems = await prisma.dealItem.findMany({
      where: {
        productId: product.id,
        deal: dealWhere,
      },
      include: {
        deal: {
          select: { id: true, stage: true },
        },
      },
    });

    const dealCount = new Set(dealItems.map((item) => item.dealId)).size;
    const dealQuantity = dealItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    // 3. Aggregate from Quotes
    const quoteItems = await prisma.quoteItem.findMany({
      where: {
        productId: product.id,
        quote: quoteWhere,
      },
      include: {
        quote: {
          select: { id: true, status: true },
        },
      },
    });

    const quoteCount = new Set(quoteItems.map((item) => item.quoteId)).size;
    const quoteQuantity = quoteItems.reduce((sum, item) => sum + item.quantity, 0);

    // 4. Aggregate from Sales Orders
    const soItems = await prisma.salesOrderItem.findMany({
      where: {
        productId: product.id,
        salesOrder: soWhere,
      },
      include: {
        salesOrder: {
          select: { id: true, status: true },
        },
      },
    });

    const salesOrderCount = new Set(soItems.map((item) => item.salesOrderId)).size;
    const salesOrderQuantity = soItems.reduce((sum, item) => sum + item.quantity, 0);

    // 5. Aggregate from Invoices (actual sales)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        productId: product.id,
        invoice: invoiceWhere,
      },
      include: {
        invoice: {
          select: { id: true, status: true },
        },
      },
    });

    const invoiceCount = new Set(invoiceItems.map((item) => item.invoiceId)).size;
    const invoiceQuantity = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate metrics
    const totalDemandQuantity = leadQuantity + dealQuantity + quoteQuantity + salesOrderQuantity;
    const totalSoldQuantity = invoiceQuantity;
    const conversionRate = leadQuantity > 0 ? (totalSoldQuantity / leadQuantity) * 100 : 0;

    // Calculate average deal size (using product unitPrice as estimate)
    // Note: DealItem doesn't store unitPrice, so we use Product.unitPrice as approximation
    const product = await prisma.product.findUnique({
      where: { id: product.id },
      select: { unitPrice: true },
    });

    const avgDealSize =
      dealCount > 0 && product
        ? (dealQuantity * Number(product.unitPrice || 0)) / dealCount
        : 0;

    const totalRevenue = invoiceItems.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = item.quantity;
      const discount = (item.discountPct || 0) / 100;
      return sum + price * qty * (1 - discount);
    }, 0);

    results.push({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      leadCount,
      leadQuantity,
      dealCount,
      dealQuantity,
      quoteCount,
      quoteQuantity,
      salesOrderCount,
      salesOrderQuantity,
      invoiceCount,
      invoiceQuantity,
      totalDemandQuantity,
      totalSoldQuantity,
      conversionRate: isNaN(conversionRate) ? 0 : conversionRate,
      avgDealSize,
      totalRevenue,
    });
  }

  return results;
}

/**
 * Get time-series data for products (monthly or quarterly)
 */
export async function getProductTimeSeries(
  prisma: PrismaClient,
  filters: ProductAnalyticsFilters & { groupBy: 'month' | 'quarter' } = { groupBy: 'month' },
): Promise<ProductTimeSeriesData[]> {
  const { startDate, endDate, groupBy, productId } = filters;

  // Default to last 12 months if no date range
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const actualStart = startDate || defaultStart;
  const actualEnd = endDate || now;

  const formatPeriod = (date: Date): string => {
    if (groupBy === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Fetch products
  const products = await prisma.product.findMany({
    where: productId ? { id: productId } : {},
    select: { id: true, name: true },
  });

  const results: ProductTimeSeriesData[] = [];

  for (const product of products) {
    // Aggregate by period from Invoices (actual sales)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        productId: product.id,
        invoice: {
          issueDate: {
            gte: actualStart,
            lte: actualEnd,
          },
        },
      },
      include: {
        invoice: {
          select: { id: true, issueDate: true },
        },
      },
    });

    // Group by period
    const periodMap: Record<string, ProductTimeSeriesData> = {};

    for (const item of invoiceItems) {
      const period = formatPeriod(item.invoice.issueDate);
      if (!periodMap[period]) {
        periodMap[period] = {
          period,
          productId: product.id,
          productName: product.name,
          leadCount: 0,
          dealCount: 0,
          quoteCount: 0,
          salesOrderCount: 0,
          invoiceCount: 0,
          quantity: 0,
          revenue: 0,
        };
      }

      periodMap[period].invoiceCount++;
      periodMap[period].quantity += item.quantity;
      const price = Number(item.unitPrice) || 0;
      const discount = (item.discountPct || 0) / 100;
      periodMap[period].revenue += price * item.quantity * (1 - discount);
    }

    results.push(...Object.values(periodMap));
  }

  return results.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get top products by revenue, quantity, or conversion rate
 */
export async function getTopProducts(
  prisma: PrismaClient,
  filters: ProductAnalyticsFilters & { limit?: number; sortBy?: 'revenue' | 'quantity' | 'conversion' } = {
    limit: 10,
    sortBy: 'revenue',
  },
): Promise<ProductDemandData[]> {
  const allProducts = await getProductDemand(prisma, filters);

  // Sort and limit
  const sorted = allProducts.sort((a, b) => {
    switch (filters.sortBy) {
      case 'quantity':
        return b.totalSoldQuantity - a.totalSoldQuantity;
      case 'conversion':
        return b.conversionRate - a.conversionRate;
      case 'revenue':
      default:
        return b.totalRevenue - a.totalRevenue;
    }
  });

  return sorted.slice(0, filters.limit || 10);
}

