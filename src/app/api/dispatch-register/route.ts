import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

// GET /api/dispatch-register - Get dispatch register data aggregated by customer and product
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();

    // Fetch all sales orders with related data
    const salesOrders = await prisma.salesOrder.findMany({
      select: {
        id: true,
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
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
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

    // Aggregate data by customer and product
    const dispatchMap = new Map<string, {
      customerId: string;
      customerName: string;
      productId: string;
      productName: string;
      poNumbers: string[];
      poDates: Date[];
      totalOrderReceived: number;
      totalDispatched: number;
      salesPersonName: string;
      salesPersonEmail: string;
    }>();

    salesOrders.forEach((order) => {
      const salesPersonName = order.salesRep?.name || order.salesRep?.email || 'N/A';
      const salesPersonEmail = order.salesRep?.email || '';

      order.items.forEach((item) => {
        const key = `${order.customer.id}-${item.product.id}`;
        
        if (!dispatchMap.has(key)) {
          dispatchMap.set(key, {
            customerId: order.customer.id,
            customerName: order.customer.companyName,
            productId: item.product.id,
            productName: item.product.name,
            poNumbers: [],
            poDates: [],
            totalOrderReceived: 0,
            totalDispatched: 0,
            salesPersonName,
            salesPersonEmail,
          });
        }

        const dispatch = dispatchMap.get(key)!;
        
        // Add PO number and date if not already present
        if (!dispatch.poNumbers.includes(order.orderNumber)) {
          dispatch.poNumbers.push(order.orderNumber);
        }
        if (!dispatch.poDates.some(d => d.getTime() === order.orderDate.getTime())) {
          dispatch.poDates.push(order.orderDate);
        }

        // Add to total order received (convert Int to number for MTS)
        dispatch.totalOrderReceived += Number(item.quantity);

        // Calculate dispatched quantity from invoices
        order.invoices.forEach((invoice) => {
          invoice.items.forEach((invoiceItem) => {
            if (invoiceItem.productId === item.product.id) {
              dispatch.totalDispatched += Number(invoiceItem.quantity);
            }
          });
        });
      });
    });

    // Convert map to array and format dates
    const dispatchData = Array.from(dispatchMap.values()).map((item) => ({
      customerId: item.customerId,
      customerName: item.customerName,
      productId: item.productId,
      productName: item.productName,
      poNo: item.poNumbers.join(', '),
      poDate: item.poDates.length > 0 
        ? item.poDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString()
        : null,
      totalOrderReceived: item.totalOrderReceived,
      totalDispatched: item.totalDispatched,
      totalPending: item.totalOrderReceived - item.totalDispatched,
      salesPerson: item.salesPersonName,
    }));

    return NextResponse.json(dispatchData);
  } catch (error) {
    console.error('Failed to fetch dispatch register:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispatch register', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

