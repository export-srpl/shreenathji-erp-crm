import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';

type Params = {
  params: { id: string };
};

/**
 * GET /api/quotes/[id]/pdf
 * Generate and return a PDF for the specified quote
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const prisma = await getPrismaClient();
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Calculate totals
    const items = quote.items.map((item) => {
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
      documentNumber: quote.quoteNumber,
      documentType: 'Quote' as const,
      issueDate: quote.issueDate,
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
      tax: {
        igst: taxTotal,
        total: taxTotal,
      },
      total,
      notes: quote.notes || undefined,
      currency: 'INR',
    };

    const pdfBuffer = await generateDocumentPDF(pdfData);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate quote PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

