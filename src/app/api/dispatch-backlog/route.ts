import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/dispatch-backlog
 * Returns dispatch backlog summary with pending quantities by customer and product
 * Query params:
 *   - customerId: string (optional, filter by customer)
 *   - productId: string (optional, filter by product)
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    const prisma = await getPrismaClient();

    // Fetch sales orders with their items and invoices
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        ...(customerId && { customerId }),
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            srplId: true,
          },
        },
        items: {
          where: {
            ...(productId && { productId }),
          },
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

    // Aggregate by customer and product
    const backlogMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerSrplId: string | null;
        productId: string;
        productName: string;
        productSku: string | null;
        productSrplId: string | null;
        ordered: number;
        dispatched: number;
        pending: number;
        salesOrders: Array<{
          id: string;
          orderNumber: string;
          orderDate: string;
          quantity: number;
          dispatchedQuantity: number;
          pendingQuantity: number;
        }>;
        invoices: Array<{
          id: string;
          invoiceNumber: string;
          invoiceDate: string;
          quantity: number;
        }>;
      }
    >();

    salesOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${order.customerId}-${item.productId}`;

        // Calculate dispatched quantity for this line item
        let dispatchedQty = 0;
        const invoiceList: Array<{
          id: string;
          invoiceNumber: string;
          invoiceDate: string;
          quantity: number;
        }> = [];

        order.invoices.forEach((invoice) => {
          invoice.items.forEach((invoiceItem) => {
            if (invoiceItem.productId === item.productId) {
              const qty = Number(invoiceItem.quantity);
              dispatchedQty += qty;
              invoiceList.push({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.issueDate.toISOString(),
                quantity: qty,
              });
            }
          });
        });

        const orderedQty = Number(item.quantity);
        const pendingQty = orderedQty - dispatchedQty;

        if (!backlogMap.has(key)) {
          backlogMap.set(key, {
            customerId: order.customerId,
            customerName: order.customer.companyName,
            customerSrplId: order.customer.srplId,
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            productSrplId: item.product.srplId,
            ordered: 0,
            dispatched: 0,
            pending: 0,
            salesOrders: [],
            invoices: [],
          });
        }

        const backlogEntry = backlogMap.get(key)!;
        backlogEntry.ordered += orderedQty;
        backlogEntry.dispatched += dispatchedQty;
        backlogEntry.pending = backlogEntry.ordered - backlogEntry.dispatched;

        // Add sales order reference
        backlogEntry.salesOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate.toISOString(),
          quantity: orderedQty,
          dispatchedQuantity: dispatchedQty,
          pendingQuantity: pendingQty,
        });

        // Add invoice references
        invoiceList.forEach((inv) => {
          backlogEntry.invoices.push(inv);
        });
      });
    });

    // Filter out entries with zero pending quantity
    const backlogData = Array.from(backlogMap.values())
      .filter((item) => item.pending > 0)
      .sort((a, b) => {
        // Sort by customer name, then product name
        if (a.customerName !== b.customerName) {
          return a.customerName.localeCompare(b.customerName);
        }
        return a.productName.localeCompare(b.productName);
      });

    return NextResponse.json({
      data: backlogData,
      summary: {
        totalEntries: backlogData.length,
        totalPending: backlogData.reduce((sum, item) => sum + item.pending, 0),
        totalOrdered: backlogData.reduce((sum, item) => sum + item.ordered, 0),
        totalDispatched: backlogData.reduce((sum, item) => sum + item.dispatched, 0),
      },
    });
  } catch (error) {
    console.error('Failed to generate dispatch backlog:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate dispatch backlog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

