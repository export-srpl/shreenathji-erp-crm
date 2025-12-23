import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return a PDF for the specified invoice
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
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        salesOrder: { include: { salesRep: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.items || invoice.items.length === 0) {
      return NextResponse.json({ error: 'Invoice has no line items' }, { status: 400 });
    }

    // Calculate totals
    const items = invoice.items.map((item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const discount = (item.discountPct || 0) / 100;
      const amount = unitPrice * qty * (1 - discount);
      return {
        productName: item.product?.name || 'Product',
        hsnCode: item.product?.hsnCode || (item as any).hsnCode || undefined,
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
    const isDomestic = invoice.customer.country === 'India';
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    if (isDomestic && invoice.customer.state) {
      if (invoice.customer.state === 'Gujarat') {
        sgst = subtotal * 0.09;
        cgst = subtotal * 0.09;
      } else {
        igst = subtotal * 0.18;
      }
    }

    const taxTotal = sgst + cgst + igst;
    const total = subtotal + taxTotal;

    // Destination: for domestic, just state; for international, city + state or cityState
    const destination =
      isDomestic
        ? invoice.customer.state || invoice.customer.city || invoice.customer.country
        : [invoice.customer.city, invoice.customer.state].filter(Boolean).join(', ') ||
          (invoice.customer as any).cityState ||
          invoice.customer.country;

    const pdfData = {
      documentNumber: invoice.invoiceNumber,
      documentType: 'Invoice' as const,
      issueDate: invoice.issueDate,
      paymentTerms: invoice.paymentTerms || undefined,
      incoTerms: invoice.incoTerms || undefined,
      poNumber: invoice.poNumber || undefined,
      poDate: invoice.poDate || undefined,
      destination: destination || undefined,
      isDomestic,
      salesPerson: invoice.salesOrder?.salesRep
        ? {
            name: invoice.salesOrder.salesRep.name || invoice.salesOrder.salesRep.email || 'Sales Person',
            email: invoice.salesOrder.salesRep.email || undefined,
            phone: undefined, // Phone not available from salesRep relation
          }
        : undefined,
      customer: {
        companyName: invoice.customer.companyName,
        billingAddress: invoice.customer.billingAddress || undefined,
        shippingAddress: invoice.customer.shippingAddress || undefined,
        contactName: invoice.customer.contactName || undefined,
        contactEmail: invoice.customer.contactEmail || undefined,
        contactPhone: invoice.customer.contactPhone || undefined,
        gstNo: invoice.customer.gstNo || undefined,
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
      notes: invoice.notes || undefined,
      currency: 'INR',
    };

    // Validate PDF data before generation
    if (!pdfData.documentNumber || !pdfData.customer?.companyName) {
      console.error('Invalid PDF data:', { documentNumber: pdfData.documentNumber, hasCompanyName: !!pdfData.customer?.companyName });
      return NextResponse.json(
        { error: 'Invalid PDF data', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!pdfData.items || pdfData.items.length === 0) {
      console.error('No items in PDF data');
      return NextResponse.json(
        { error: 'Invalid PDF data', message: 'No line items found' },
        { status: 400 }
      );
    }

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
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to generate invoice PDF:', {
      error: error?.message || error,
      stack: error?.stack,
      invoiceId: params.id,
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

