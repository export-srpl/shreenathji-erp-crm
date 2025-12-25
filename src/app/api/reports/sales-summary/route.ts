import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

/**
 * GET /api/reports/sales-summary
 * Returns sales summary by month for the last 12 months
 * Includes: quotes, proforma invoices, sales orders, invoices
 */
export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  
  // Support both date range and months parameter for backward compatibility
  let startDate: Date;
  let endDate: Date = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (searchParams.get('startDate') && searchParams.get('endDate')) {
    // Use provided date range
    startDate = new Date(searchParams.get('startDate')!);
    endDate = new Date(searchParams.get('endDate')!);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Fallback to months parameter
    const months = parseInt(searchParams.get('months') || '12', 10);
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  try {
    const prisma = await getPrismaClient();
    // Get quotes
    const quotes = await prisma.quote.findMany({
      where: {
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
      },
    });

    // Get proforma invoices
    const proformas = await prisma.proformaInvoice.findMany({
      where: {
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
      },
    });

    // Get sales orders
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        orderDate: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
      },
    });

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
      },
    });

    // Helper to calculate total from items
    const calculateTotal = (items: Array<{ quantity: number; unitPrice: any; discountPct?: number }>) => {
      return items.reduce((sum, item) => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity || 0;
        const discount = (item.discountPct || 0) / 100;
        return sum + (price * qty * (1 - discount));
      }, 0);
    };

    // Group by month
    const monthlyData: Record<string, {
      month: string;
      quotes: { count: number; total: number };
      proformas: { count: number; total: number };
      salesOrders: { count: number; total: number };
      invoices: { count: number; total: number };
    }> = {};

    const formatMonth = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Process quotes
    quotes.forEach(quote => {
      const month = formatMonth(quote.issueDate);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          quotes: { count: 0, total: 0 },
          proformas: { count: 0, total: 0 },
          salesOrders: { count: 0, total: 0 },
          invoices: { count: 0, total: 0 },
        };
      }
      monthlyData[month].quotes.count++;
      monthlyData[month].quotes.total += calculateTotal(quote.items);
    });

    // Process proformas
    proformas.forEach(proforma => {
      const month = formatMonth(proforma.issueDate);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          quotes: { count: 0, total: 0 },
          proformas: { count: 0, total: 0 },
          salesOrders: { count: 0, total: 0 },
          invoices: { count: 0, total: 0 },
        };
      }
      monthlyData[month].proformas.count++;
      monthlyData[month].proformas.total += calculateTotal(proforma.items);
    });

    // Process sales orders
    salesOrders.forEach(order => {
      const month = formatMonth(order.orderDate);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          quotes: { count: 0, total: 0 },
          proformas: { count: 0, total: 0 },
          salesOrders: { count: 0, total: 0 },
          invoices: { count: 0, total: 0 },
        };
      }
      monthlyData[month].salesOrders.count++;
      monthlyData[month].salesOrders.total += calculateTotal(order.items);
    });

    // Process invoices
    invoices.forEach(invoice => {
      const month = formatMonth(invoice.issueDate);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          quotes: { count: 0, total: 0 },
          proformas: { count: 0, total: 0 },
          salesOrders: { count: 0, total: 0 },
          invoices: { count: 0, total: 0 },
        };
      }
      monthlyData[month].invoices.count++;
      monthlyData[month].invoices.total += calculateTotal(invoice.items);
    });

    // Convert to array and sort by month
    const result = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate sales summary:', error);
    return NextResponse.json({ error: 'Failed to generate sales summary' }, { status: 500 });
  }
}

