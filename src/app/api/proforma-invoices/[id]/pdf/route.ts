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
      },
    });

    if (!proforma) {
      return NextResponse.json({ error: 'Proforma invoice not found' }, { status: 404 });
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
    // Proforma invoices typically don't include tax
    const total = subtotal;

    const pdfData = {
      documentNumber: proforma.proformaNumber,
      documentType: 'Proforma Invoice' as const,
      issueDate: proforma.issueDate,
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
  } catch (error) {
    console.error('Failed to generate proforma invoice PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

