import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/reports/sales-performance
 * Returns sales performance metrics by sales person
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - salesRepId: string (optional, filter by specific sales person)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const salesRepId = searchParams.get('salesRepId');

    const prisma = await getPrismaClient();

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.orderDate = { gte: startDate, lte: endDate };
    }

    // Fetch sales orders
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        ...dateFilter,
        ...(salesRepId && { salesRepId }),
      },
      include: {
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        items: true,
        invoices: {
          include: {
            items: true,
          },
        },
      },
    });

    // Aggregate by sales person
    const performanceMap = new Map<
      string,
      {
        salesRepId: string;
        salesRepName: string;
        salesRepEmail: string;
        totalOrders: number;
        totalOrderValue: number;
        totalInvoiced: number;
        totalPendingDispatch: number;
        orders: Array<{
          id: string;
          orderNumber: string;
          orderDate: string;
          customerName: string;
          value: number;
        }>;
      }
    >();

    salesOrders.forEach((order) => {
      if (!order.salesRep) return;

      const repId = order.salesRep.id;
      if (!performanceMap.has(repId)) {
        performanceMap.set(repId, {
          salesRepId: repId,
          salesRepName: order.salesRep.name || order.salesRep.email || 'Unknown',
          salesRepEmail: order.salesRep.email || '',
          totalOrders: 0,
          totalOrderValue: 0,
          totalInvoiced: 0,
          totalPendingDispatch: 0,
          orders: [],
        });
      }

      const performance = performanceMap.get(repId)!;

      // Calculate order value
      const orderValue = order.items.reduce((sum, item) => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity || 0;
        const discount = (item.discountPct || 0) / 100;
        return sum + price * qty * (1 - discount);
      }, 0);

      // Calculate invoiced amount
      const invoicedAmount = order.invoices.reduce((sum, inv) => {
        return (
          sum +
          inv.items.reduce((itemSum, item) => {
            const price = Number(item.unitPrice) || 0;
            const qty = item.quantity || 0;
            const discount = (item.discountPct || 0) / 100;
            return itemSum + price * qty * (1 - discount);
          }, 0)
        );
      }, 0);

      // Calculate pending dispatch (ordered - invoiced quantities)
      const orderedQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const invoicedQty = order.invoices.reduce(
        (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );
      const pendingDispatch = orderedQty - invoicedQty;

      performance.totalOrders++;
      performance.totalOrderValue += orderValue;
      performance.totalInvoiced += invoicedAmount;
      performance.totalPendingDispatch += pendingDispatch;

      performance.orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate.toISOString(),
        customerName: order.customer.companyName,
        value: orderValue,
      });
    });

    // Convert to array and sort by total order value
    const result = Array.from(performanceMap.values())
      .sort((a, b) => b.totalOrderValue - a.totalOrderValue)
      .map((perf) => ({
        ...perf,
        invoiceRate: perf.totalOrderValue > 0 ? (perf.totalInvoiced / perf.totalOrderValue) * 100 : 0,
      }));

    return NextResponse.json({
      data: result,
      summary: {
        totalSalesReps: result.length,
        totalOrders: result.reduce((sum, p) => sum + p.totalOrders, 0),
        totalOrderValue: result.reduce((sum, p) => sum + p.totalOrderValue, 0),
        totalInvoiced: result.reduce((sum, p) => sum + p.totalInvoiced, 0),
      },
    });
  } catch (error) {
    console.error('Failed to generate sales performance report:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate sales performance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

