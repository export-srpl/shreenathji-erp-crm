import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/planning-signal
 * Returns planning signal aggregated from confirmed Sales Orders
 * Query params:
 *   - startDate: ISO date string (optional, defaults to current month)
 *   - endDate: ISO date string (optional)
 *   - productId: string (optional, filter by product)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const productId = searchParams.get('productId');

    const prisma = await getPrismaClient();

    // Default to current month if no dates provided
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 6, 0); // Default to 6 months ahead

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch confirmed sales orders
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        status: 'Confirmed', // Only confirmed orders
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                srplId: true,
              },
            },
          },
        },
        invoices: {
          include: {
            items: true,
          },
        },
      },
    });

    // Aggregate by product and month
    const planningMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string | null;
        productSrplId: string | null;
        monthlyData: Map<
          string,
          {
            month: string;
            ordered: number;
            dispatched: number;
            pending: number;
            salesOrders: Array<{
              id: string;
              orderNumber: string;
              orderDate: string;
              quantity: number;
            }>;
          }
        >;
      }
    >();

    salesOrders.forEach((order) => {
      const orderMonth = `${order.orderDate.getFullYear()}-${String(
        order.orderDate.getMonth() + 1
      ).padStart(2, '0')}`;

      order.items.forEach((item) => {
        // Apply product filter if provided
        if (productId && item.productId !== productId) return;

        const productKey = item.productId;
        if (!planningMap.has(productKey)) {
          planningMap.set(productKey, {
            productId: item.product.id,
            productName: item.product.name,
            productSku: item.product.sku,
            productSrplId: item.product.srplId,
            monthlyData: new Map(),
          });
        }

        const productData = planningMap.get(productKey)!;
        if (!productData.monthlyData.has(orderMonth)) {
          productData.monthlyData.set(orderMonth, {
            month: orderMonth,
            ordered: 0,
            dispatched: 0,
            pending: 0,
            salesOrders: [],
          });
        }

        const monthData = productData.monthlyData.get(orderMonth)!;
        const orderedQty = Number(item.quantity);
        monthData.ordered += orderedQty;

        // Calculate dispatched quantity from invoices
        let dispatchedQty = 0;
        order.invoices.forEach((invoice) => {
          invoice.items.forEach((invoiceItem) => {
            if (invoiceItem.productId === item.productId) {
              dispatchedQty += Number(invoiceItem.quantity);
            }
          });
        });

        monthData.dispatched += dispatchedQty;
        monthData.pending = monthData.ordered - monthData.dispatched;

        // Add sales order reference
        monthData.salesOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate.toISOString(),
          quantity: orderedQty,
        });
      });
    });

    // Convert to response format
    const result = Array.from(planningMap.values()).map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productSku: product.productSku,
      productSrplId: product.productSrplId,
      monthlySummary: Array.from(product.monthlyData.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((month) => ({
          month: month.month,
          ordered: month.ordered,
          dispatched: month.dispatched,
          pending: month.pending,
          salesOrderCount: month.salesOrders.length,
          salesOrders: month.salesOrders,
        })),
      totalOrdered: Array.from(product.monthlyData.values()).reduce(
        (sum, m) => sum + m.ordered,
        0
      ),
      totalDispatched: Array.from(product.monthlyData.values()).reduce(
        (sum, m) => sum + m.dispatched,
        0
      ),
      totalPending: Array.from(product.monthlyData.values()).reduce(
        (sum, m) => sum + m.pending,
        0
      ),
    }));

    return NextResponse.json({
      data: result,
      summary: {
        totalProducts: result.length,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to generate planning signal:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate planning signal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

