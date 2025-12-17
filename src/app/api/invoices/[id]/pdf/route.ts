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
    // Simple tax calculation (18% GST for now - adjust based on your business logic)
    const taxTotal = subtotal * 0.18;
    const total = subtotal + taxTotal;

    const pdfData = {
      documentNumber: invoice.invoiceNumber,
      documentType: 'Invoice' as const,
      issueDate: invoice.issueDate,
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
      tax: {
        igst: taxTotal,
        total: taxTotal,
      },
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

