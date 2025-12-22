import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';

type Params = {
  params: { id: string };
};

/**
 * GET /api/proforma-invoices/[id]/pdf
 * Generate and return a PDF for the specified proforma invoice
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const prisma = await getPrismaClient();
    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        quote: { include: { salesRep: true } },
      },
    });

    if (!proforma) {
      return NextResponse.json({ error: 'Proforma invoice not found' }, { status: 404 });
    }

    if (!proforma.items || proforma.items.length === 0) {
      return NextResponse.json({ error: 'Proforma invoice has no line items' }, { status: 400 });
    }

    // Calculate totals
    const items = proforma.items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const qty = item.quantity;
      const discount = (item.discountPct || 0) / 100;
      const amount = unitPrice * qty * (1 - discount);
      return {
        productName: item.product.name,
        quantity: qty,
        unitPrice,
        discountPct: item.discountPct || 0,
        amount,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    // GST logic based on customer country/state
    const isDomestic = proforma.customer.country === 'India';
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    if (isDomestic && proforma.customer.state) {
      if (proforma.customer.state === 'Gujarat') {
        sgst = subtotal * 0.09;
        cgst = subtotal * 0.09;
      } else {
        igst = subtotal * 0.18;
      }
    }

    const taxTotal = sgst + cgst + igst;
    const total = subtotal + taxTotal;

    const pdfData = {
      documentNumber: proforma.proformaNumber,
      documentType: 'Proforma Invoice' as const,
      issueDate: proforma.issueDate,
      paymentTerms: proforma.paymentTerms || undefined,
      incoTerms: proforma.incoTerms || undefined,
      poNumber: proforma.poNumber || undefined,
      poDate: proforma.poDate || undefined,
      salesPerson: proforma.quote?.salesRep
        ? {
            name: proforma.quote.salesRep.name || proforma.quote.salesRep.email || '',
            email: proforma.quote.salesRep.email || undefined,
          }
        : undefined,
      customer: {
        companyName: proforma.customer.companyName,
        billingAddress: proforma.customer.billingAddress || undefined,
        shippingAddress: proforma.customer.shippingAddress || undefined,
        contactName: proforma.customer.contactName || undefined,
        contactEmail: proforma.customer.contactEmail || undefined,
        contactPhone: proforma.customer.contactPhone || undefined,
        gstNo: proforma.customer.gstNo || undefined,
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
      notes: proforma.notes || undefined,
      currency: 'INR',
    };

    const pdfBuffer = await generateDocumentPDF(pdfData);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proforma-${proforma.proformaNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to generate proforma invoice PDF:', {
      error: error?.message || error,
      stack: error?.stack,
      proformaId: params.id,
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

