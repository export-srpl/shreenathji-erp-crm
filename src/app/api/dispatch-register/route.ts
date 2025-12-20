import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

// Cache key for dispatch register
const CACHE_KEY = 'dispatch-register-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache (in production, consider Redis)
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Invalidate dispatch register cache
 * Call this when Sales Orders or Invoices are created/updated
 */
export function invalidateDispatchCache() {
  cache.clear();
}

interface DispatchRegisterEntry {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productSKU?: string;
  primaryPONumber: string;
  primaryPODate: string | null;
  allPOs: Array<{
    poNumber: string;
    poDate: string;
    orderId: string;
    quantity: number;
  }>;
  totalOrderReceived: number;
  totalDispatched: number;
  totalPending: number;
  dispatchStatus: 'Pending' | 'Partially Dispatched' | 'Fully Dispatched' | 'Over-Dispatched';
  hasAnomaly: boolean;
  anomalyMessage?: string;
  salesPerson: string;
  salesPersonEmail: string;
  // Future-ready fields
  dispatchLocation?: string | null;
  plantId?: string | null;
  // Line items for drill-down
  lineItems: Array<{
    salesOrderId: string;
    salesOrderNumber: string;
    salesOrderDate: string;
    salesOrderItemId: string;
    orderedQuantity: number;
    dispatchedQuantity: number;
    pendingQuantity: number;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      quantity: number;
    }>;
  }>;
}

/**
 * Calculate dispatch status based on ordered vs dispatched quantities
 */
function calculateDispatchStatus(
  ordered: number,
  dispatched: number
): { status: DispatchRegisterEntry['dispatchStatus']; hasAnomaly: boolean; message?: string } {
  if (dispatched === 0) {
    return { status: 'Pending', hasAnomaly: false };
  } else if (dispatched < ordered) {
    return { status: 'Partially Dispatched', hasAnomaly: false };
  } else if (dispatched === ordered) {
    return { status: 'Fully Dispatched', hasAnomaly: false };
  } else {
    // Over-dispatched
    return {
      status: 'Over-Dispatched',
      hasAnomaly: true,
      message: `Dispatched quantity (${dispatched.toFixed(2)}) exceeds ordered quantity (${ordered.toFixed(2)}) by ${(dispatched - ordered).toFixed(2)} MTS`,
    };
  }
}

/**
 * GET /api/dispatch-register
 * Enhanced dispatch register with line-item level calculations, date filtering, and audit trail
 * Query params:
 *   - asOfDate: ISO date string (optional, defaults to current date)
 *   - includeAnomalies: boolean (optional, defaults to true)
 */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfDateParam = searchParams.get('asOfDate');
    const includeAnomalies = searchParams.get('includeAnomalies') !== 'false';

    // Parse as of date (default to current date/time)
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
    asOfDate.setHours(23, 59, 59, 999); // End of day

    // Check cache
    const cacheKey = `${CACHE_KEY}-${asOfDate.toISOString()}-${includeAnomalies}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const prisma = await getPrismaClient();

    // Fetch sales orders and their items up to asOfDate
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        orderDate: { lte: asOfDate },
      },
      select: {
        id: true,
        srplId: true,
        orderNumber: true,
        orderDate: true,
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        invoices: {
          where: {
            issueDate: { lte: asOfDate },
          },
          select: {
            id: true,
            srplId: true,
            invoiceNumber: true,
            issueDate: true,
            items: {
              select: {
                id: true,
                quantity: true,
                productId: true,
              },
            },
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    // Aggregate at line-item level (SalesOrderItem level)
    const dispatchMap = new Map<string, DispatchRegisterEntry>();

    salesOrders.forEach((order: any) => {
      const salesPersonName = order.salesRep?.name || order.salesRep?.email || 'N/A';
      const salesPersonEmail = order.salesRep?.email || '';

      order.items.forEach((orderItem: any) => {
        // Key: customer-product combination
        const key = `${order.customer.id}-${orderItem.product.id}`;

        // Calculate dispatched quantity for this specific line item
        let lineItemDispatched = 0;
        const lineItemInvoices: Array<{
          invoiceId: string;
          invoiceNumber: string;
          invoiceDate: string;
          quantity: number;
        }> = [];

        order.invoices.forEach((invoice: any) => {
          invoice.items.forEach((invoiceItem: any) => {
            if (invoiceItem.productId === orderItem.product.id) {
              const qty = Number(invoiceItem.quantity);
              lineItemDispatched += qty;
              lineItemInvoices.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.issueDate.toISOString(),
                quantity: qty,
              });
            }
          });
        });

        const orderedQty = Number(orderItem.quantity);
        const pendingQty = orderedQty - lineItemDispatched;

        // Get or create dispatch entry
        if (!dispatchMap.has(key)) {
          dispatchMap.set(key, {
            customerId: order.customer.id,
            customerName: order.customer.companyName,
            productId: orderItem.product.id,
            productName: orderItem.product.name,
            productSKU: orderItem.product.sku || orderItem.product.srplId || null,
            primaryPONumber: order.orderNumber,
            primaryPODate: order.orderDate.toISOString(),
            allPOs: [],
            totalOrderReceived: 0,
            totalDispatched: 0,
            totalPending: 0,
            dispatchStatus: 'Pending',
            hasAnomaly: false,
            salesPerson: salesPersonName,
            salesPersonEmail,
            lineItems: [],
          });
        }

        const dispatch = dispatchMap.get(key)!;

        // Add PO information
        const existingPO = dispatch.allPOs.find((po) => po.orderId === order.id);
        if (!existingPO) {
          dispatch.allPOs.push({
            poNumber: order.orderNumber,
            poDate: order.orderDate.toISOString(),
            orderId: order.id,
            quantity: 0,
          });
        }
        const poEntry = dispatch.allPOs.find((po) => po.orderId === order.id)!;
        poEntry.quantity += orderedQty;

        // Update primary PO (most recent)
        if (new Date(order.orderDate) > new Date(dispatch.primaryPODate || 0)) {
          dispatch.primaryPONumber = order.orderNumber;
          dispatch.primaryPODate = order.orderDate.toISOString();
        }

        // Add line item detail
        dispatch.lineItems.push({
          salesOrderId: order.id,
          salesOrderNumber: order.orderNumber,
          salesOrderDate: order.orderDate.toISOString(),
          salesOrderItemId: orderItem.id,
          orderedQuantity: orderedQty,
          dispatchedQuantity: lineItemDispatched,
          pendingQuantity: pendingQty,
          invoices: lineItemInvoices,
        });

        // Update totals
        dispatch.totalOrderReceived += orderedQty;
        dispatch.totalDispatched += lineItemDispatched;
        dispatch.totalPending = dispatch.totalOrderReceived - dispatch.totalDispatched;
      });
    });

    // Calculate status and check for anomalies
    const dispatchData = Array.from(dispatchMap.values()).map((item) => {
      const statusCalc = calculateDispatchStatus(item.totalOrderReceived, item.totalDispatched);
      return {
        ...item,
        dispatchStatus: statusCalc.status,
        hasAnomaly: statusCalc.hasAnomaly || item.hasAnomaly,
        anomalyMessage: statusCalc.message,
        // Sort POs by date (most recent first)
        allPOs: item.allPOs.sort(
          (a, b) => new Date(b.poDate).getTime() - new Date(a.poDate).getTime()
        ),
        // Sort line items by date
        lineItems: item.lineItems.sort(
          (a, b) => new Date(b.salesOrderDate).getTime() - new Date(a.salesOrderDate).getTime()
        ),
      };
    });

    // Filter anomalies if requested
    const filteredData = includeAnomalies
      ? dispatchData
      : dispatchData.filter((item) => !item.hasAnomaly);

    // Sort by customer name, then product name
    filteredData.sort((a, b) => {
      if (a.customerName !== b.customerName) {
        return a.customerName.localeCompare(b.customerName);
      }
      return a.productName.localeCompare(b.productName);
    });

    const result = {
      data: filteredData,
      asOfDate: asOfDate.toISOString(),
      totalEntries: filteredData.length,
      anomaliesCount: filteredData.filter((item) => item.hasAnomaly).length,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Clean up old cache entries (keep last 10)
    if (cache.size > 10) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      entries.slice(10).forEach(([key]) => cache.delete(key));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch dispatch register:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dispatch register',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
