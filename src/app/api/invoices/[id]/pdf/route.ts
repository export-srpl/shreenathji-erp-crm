import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';

type Params = {
  params: { id: string };
};

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return a PDF for the specified invoice
 */
export async function GET(_req: Request, { params }: Params) {
  try {
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

    // Calculate totals
    const items = invoice.items.map((item) => {
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

    const pdfData = {
      documentNumber: invoice.invoiceNumber,
      documentType: 'Invoice' as const,
      issueDate: invoice.issueDate,
      paymentTerms: invoice.paymentTerms || undefined,
      incoTerms: invoice.incoTerms || undefined,
      poNumber: invoice.poNumber || undefined,
      poDate: invoice.poDate || undefined,
      salesPerson: invoice.salesOrder?.salesRep
        ? {
            name: invoice.salesOrder.salesRep.name || invoice.salesOrder.salesRep.email || '',
            email: invoice.salesOrder.salesRep.email || undefined,
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

    const pdfBuffer = await generateDocumentPDF(pdfData);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

