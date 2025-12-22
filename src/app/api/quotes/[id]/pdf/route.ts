import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/quotes/[id]/pdf
 * Generate and return a PDF for the specified quote
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
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        salesRep: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (!quote.items || quote.items.length === 0) {
      return NextResponse.json({ error: 'Quote has no line items' }, { status: 400 });
    }

    // Calculate totals
    const items = quote.items.map((item) => {
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
    const isDomestic = quote.customer.country === 'India';
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    if (isDomestic && quote.customer.state) {
      if (quote.customer.state === 'Gujarat') {
        sgst = subtotal * 0.09;
        cgst = subtotal * 0.09;
      } else {
        igst = subtotal * 0.18;
      }
    }

    const taxTotal = sgst + cgst + igst;
    const total = subtotal + taxTotal;

    const pdfData = {
      documentNumber: quote.quoteNumber,
      documentType: 'Quote' as const,
      issueDate: quote.issueDate,
      paymentTerms: quote.paymentTerms || undefined,
      incoTerms: quote.incoTerms || undefined,
      poNumber: quote.poNumber || undefined,
      poDate: quote.poDate || undefined,
      salesPerson: quote.salesRep
        ? {
            name: quote.salesRep.name || quote.salesRep.email || '',
            email: quote.salesRep.email || undefined,
          }
        : undefined,
      customer: {
        companyName: quote.customer.companyName,
        billingAddress: quote.customer.billingAddress || undefined,
        shippingAddress: quote.customer.shippingAddress || undefined,
        contactName: quote.customer.contactName || undefined,
        contactEmail: quote.customer.contactEmail || undefined,
        contactPhone: quote.customer.contactPhone || undefined,
        gstNo: quote.customer.gstNo || undefined,
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
      notes: quote.notes || undefined,
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
        'Content-Disposition': `attachment; filename="quote-${quote.quoteNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to generate quote PDF:', {
      error: error?.message || error,
      stack: error?.stack,
      quoteId: params.id,
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

