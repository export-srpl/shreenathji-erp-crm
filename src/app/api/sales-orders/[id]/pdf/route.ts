import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/sales-orders/[id]/pdf
 * Generate and return a PDF for the specified sales order
 */
export async function GET(req: Request, { params }: Params) {
  try {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    const auth = await getAuthContext(req);
    if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales', 'finance'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const prisma = await getPrismaClient();
    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        salesRep: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    if (!order.items || order.items.length === 0) {
      return NextResponse.json({ error: 'Sales order has no line items' }, { status: 400 });
    }

    // Calculate line items and subtotal
    const items = order.items.map((item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const discount = (item.discountPct || 0) / 100;
      const amount = unitPrice * qty * (1 - discount);
      return {
        productName: item.product?.name || 'Product',
        quantity: qty,
        unitPrice,
        discountPct: item.discountPct || 0,
        amount: isNaN(amount) ? 0 : amount,
      };
    });

    const subtotal = items.reduce((sum, item) => {
      const amount = typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0;
      return sum + amount;
    }, 0);

    // GST logic based on customer country/state
    const isDomestic = order.customer.country === 'India';
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    if (isDomestic && order.customer.state) {
      if (order.customer.state === 'Gujarat') {
        sgst = subtotal * 0.09;
        cgst = subtotal * 0.09;
      } else {
        igst = subtotal * 0.18;
      }
    }

    const taxTotal = sgst + cgst + igst;
    const total = subtotal + taxTotal;

    const pdfData = {
      documentNumber: order.orderNumber,
      documentType: 'Sales Order' as const,
      issueDate: order.orderDate,
      paymentTerms: order.paymentTerms || undefined,
      incoTerms: order.incoTerms || undefined,
      poNumber: order.poNumber || undefined,
      poDate: order.poDate || undefined,
      salesPerson: order.salesRep
        ? {
            name: order.salesRep.name || order.salesRep.email || '',
            email: order.salesRep.email || undefined,
          }
        : undefined,
      customer: {
        companyName: order.customer.companyName,
        billingAddress: order.customer.billingAddress || undefined,
        shippingAddress: order.customer.shippingAddress || undefined,
        contactName: order.customer.contactName || undefined,
        contactEmail: order.customer.contactEmail || undefined,
        contactPhone: order.customer.contactPhone || undefined,
        gstNo: order.customer.gstNo || undefined,
      },
      items,
      subtotal,
      tax: taxTotal
        ? {
            sgst: sgst || undefined,
            cgst: cgst || undefined,
            igst: igst || undefined,
            total: taxTotal,
          }
        : undefined,
      total,
      notes: order.notes || undefined,
      currency: 'INR',
    };

    const pdfBuffer = await generateDocumentPDF(pdfData);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('Generated PDF buffer is empty');
      return NextResponse.json(
        { error: 'Failed to generate PDF', message: 'PDF buffer is empty' },
        { status: 500 }
      );
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-order-${order.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to generate sales order PDF:', {
      error: error?.message || error,
      stack: error?.stack,
      salesOrderId: params.id,
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


