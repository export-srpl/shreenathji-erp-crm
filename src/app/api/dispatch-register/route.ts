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
  exceptionTypes?: Array<'over_dispatch' | 'delayed_dispatch' | 'excessive_partial'>;
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
    expectedShipDate?: string | null;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      quantity: number;
    }>;
    hasException?: boolean;
    exceptionType?: 'over_dispatch' | 'delayed_dispatch' | 'excessive_partial';
    exceptionMessage?: string;
  }>;
}

/**
 * Configuration for exception detection thresholds (in days)
 */
const EXCEPTION_THRESHOLDS = {
  DELAYED_DISPATCH_DAYS: 30, // Days after order date before flagging as delayed
  EXCESSIVE_PARTIAL_DAYS: 30, // Days partial dispatch can remain before flagging
  PARTIAL_DISPATCH_PERCENTAGE: 10, // Minimum percentage of order pending to flag as excessive partial
};

/**
 * Calculate dispatch status and exceptions based on ordered vs dispatched quantities
 */
function calculateDispatchStatus(
  ordered: number,
  dispatched: number,
  orderDate: Date,
  expectedShipDate: Date | null,
  asOfDate: Date
): {
  status: DispatchRegisterEntry['dispatchStatus'];
  hasAnomaly: boolean;
  message?: string;
  exceptionTypes?: Array<'over_dispatch' | 'delayed_dispatch' | 'excessive_partial'>;
} {
  const exceptions: Array<'over_dispatch' | 'delayed_dispatch' | 'excessive_partial'> = [];
  const messages: string[] = [];

  // Over-dispatch check
  if (dispatched > ordered) {
    exceptions.push('over_dispatch');
    messages.push(
      `Dispatched quantity (${dispatched.toFixed(2)}) exceeds ordered quantity (${ordered.toFixed(2)}) by ${(dispatched - ordered).toFixed(2)} MTS`
    );
  }

  // Delayed dispatch check
  const daysSinceOrder = Math.floor((asOfDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  const expectedDate = expectedShipDate || new Date(orderDate.getTime() + EXCEPTION_THRESHOLDS.DELAYED_DISPATCH_DAYS * 24 * 60 * 60 * 1000);
  
  if (asOfDate > expectedDate && dispatched < ordered) {
    const daysPastDue = Math.floor((asOfDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    exceptions.push('delayed_dispatch');
    messages.push(
      `Dispatch delayed by ${daysPastDue} day(s). Expected ship: ${expectedDate.toLocaleDateString()}, Pending: ${(ordered - dispatched).toFixed(2)} MTS`
    );
  } else if (!expectedShipDate && daysSinceOrder > EXCEPTION_THRESHOLDS.DELAYED_DISPATCH_DAYS && dispatched === 0) {
    exceptions.push('delayed_dispatch');
    messages.push(`Order placed ${daysSinceOrder} days ago, no dispatch yet`);
  }

  // Excessive partial dispatch check
  if (dispatched > 0 && dispatched < ordered) {
    const pendingQty = ordered - dispatched;
    const pendingPercentage = (pendingQty / ordered) * 100;
    
    // Check if partial dispatch has been pending for too long
    if (daysSinceOrder > EXCEPTION_THRESHOLDS.EXCESSIVE_PARTIAL_DAYS && pendingPercentage > EXCEPTION_THRESHOLDS.PARTIAL_DISPATCH_PERCENTAGE) {
      exceptions.push('excessive_partial');
      messages.push(
        `Partial dispatch pending for ${daysSinceOrder} days. ${pendingQty.toFixed(2)} MTS (${pendingPercentage.toFixed(1)}%) remaining`
      );
    }
  }

  // Determine status
  let status: DispatchRegisterEntry['dispatchStatus'];
  if (dispatched === 0) {
    status = 'Pending';
  } else if (dispatched < ordered) {
    status = 'Partially Dispatched';
  } else if (dispatched === ordered) {
    status = 'Fully Dispatched';
  } else {
    status = 'Over-Dispatched';
  }

  return {
    status,
    hasAnomaly: exceptions.length > 0,
    message: messages.length > 0 ? messages.join('; ') : undefined,
    exceptionTypes: exceptions.length > 0 ? exceptions : undefined,
  };
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
    const exceptionType = searchParams.get('exceptionType'); // 'over_dispatch' | 'delayed_dispatch' | 'excessive_partial'

    // Parse as of date (default to current date/time)
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
    asOfDate.setHours(23, 59, 59, 999); // End of day

    // Check cache
    const cacheKey = `${CACHE_KEY}-${asOfDate.toISOString()}-${includeAnomalies}-${exceptionType || 'all'}`;
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
        expectedShip: true,
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

        // Calculate line item exceptions
        const lineItemExceptionCalc = calculateDispatchStatus(
          orderedQty,
          lineItemDispatched,
          order.orderDate,
          order.expectedShip,
          asOfDate
        );

        // Add line item detail
        dispatch.lineItems.push({
          salesOrderId: order.id,
          salesOrderNumber: order.orderNumber,
          salesOrderDate: order.orderDate.toISOString(),
          salesOrderItemId: orderItem.id,
          orderedQuantity: orderedQty,
          dispatchedQuantity: lineItemDispatched,
          pendingQuantity: pendingQty,
          expectedShipDate: order.expectedShip?.toISOString() || null,
          invoices: lineItemInvoices,
          hasException: lineItemExceptionCalc.hasAnomaly,
          exceptionType: lineItemExceptionCalc.exceptionTypes?.[0],
          exceptionMessage: lineItemExceptionCalc.message,
        });

        // Update totals
        dispatch.totalOrderReceived += orderedQty;
        dispatch.totalDispatched += lineItemDispatched;
        dispatch.totalPending = dispatch.totalOrderReceived - dispatch.totalDispatched;
      });
    });

    // Calculate status and check for anomalies
    const dispatchData = Array.from(dispatchMap.values()).map((item) => {
      // Use the earliest order date and expected ship date for aggregate calculations
      const earliestOrderDate = new Date(
        Math.min(...item.lineItems.map((li) => new Date(li.salesOrderDate).getTime()))
      );
      const earliestExpectedShip = item.lineItems
        .map((li) => (li.expectedShipDate ? new Date(li.expectedShipDate).getTime() : null))
        .filter((d): d is number => d !== null);
      const earliestExpectedShipDate =
        earliestExpectedShip.length > 0 ? new Date(Math.min(...earliestExpectedShip)) : null;

      const statusCalc = calculateDispatchStatus(
        item.totalOrderReceived,
        item.totalDispatched,
        earliestOrderDate,
        earliestExpectedShipDate,
        asOfDate
      );

      // Collect all exception types from line items
      const allExceptionTypes = new Set<string>();
      item.lineItems.forEach((li) => {
        if (li.hasException && li.exceptionType) {
          allExceptionTypes.add(li.exceptionType);
        }
      });

      return {
        ...item,
        dispatchStatus: statusCalc.status,
        hasAnomaly: statusCalc.hasAnomaly || item.lineItems.some((li) => li.hasException),
        anomalyMessage: statusCalc.message,
        exceptionTypes: Array.from(allExceptionTypes) as Array<
          'over_dispatch' | 'delayed_dispatch' | 'excessive_partial'
        >,
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
    let filteredData = includeAnomalies
      ? dispatchData
      : dispatchData.filter((item) => !item.hasAnomaly);

    // Filter by exception type if specified
    if (exceptionType) {
      filteredData = filteredData.filter((item) =>
        item.exceptionTypes?.includes(exceptionType as any)
      );
    }

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
