import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateDocumentPDF } from '@/lib/pdf-generator';
import { requireAuth } from '@/lib/auth-utils';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { id: string };
};

/**
 * GET /api/proforma-invoices/[id]/pdf
 * Generate and return a PDF for the specified proforma invoice
 */
export async function GET(req: Request, { params }: Params) {
  const proformaId = params.id;
  console.log('[PDF API] Starting PDF generation for proforma invoice:', proformaId);
  
  try {
    // Check authentication
    console.log('[PDF API] Checking authentication');
    const authError = await requireAuth();
    if (authError) {
      console.error('[PDF API] Authentication failed');
      return authError;
    }

    const auth = await getAuthContext(req);
    if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales', 'finance'])) {
      console.error('[PDF API] Authorization failed for user:', auth.userId);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log('[PDF API] Fetching proforma invoice from database');
    const prisma = await getPrismaClient();
    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id: proformaId },
      include: {
        items: { include: { product: true } },
        customer: true,
        quote: { include: { salesRep: true } },
      },
    });

    if (!proforma) {
      console.error('[PDF API] Proforma invoice not found:', proformaId);
      return NextResponse.json({ error: 'Proforma invoice not found' }, { status: 404 });
    }

    console.log('[PDF API] Proforma invoice found:', proforma.proformaNumber);
    console.log('[PDF API] Items count:', proforma.items?.length ?? 0);

    if (!proforma.items || proforma.items.length === 0) {
      console.error('[PDF API] Proforma invoice has no line items');
      return NextResponse.json({ error: 'Proforma invoice has no line items' }, { status: 400 });
    }

    // Calculate totals
    console.log('[PDF API] Calculating line items and totals');
    const items = proforma.items.map((item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const discount = (item.discountPct || 0) / 100;
      const amount = unitPrice * qty * (1 - discount);
      return {
        productName: String(item.product?.name ?? 'Product'),
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
    
    console.log('[PDF API] Subtotal calculated:', subtotal);

    // GST logic based on customer country/state
    const isDomestic = String(proforma.customer.country ?? '').toLowerCase() === 'india';
    let sgst = 0;
    let cgst = 0;
    let igst = 0;

    console.log('[PDF API] Customer country:', proforma.customer.country, 'isDomestic:', isDomestic);

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

    // Destination: for domestic, just state; for international, city + state or cityState
    const destination =
      isDomestic
        ? proforma.customer.state || proforma.customer.city || proforma.customer.country
        : [proforma.customer.city, proforma.customer.state].filter(Boolean).join(', ') ||
          (proforma.customer as any).cityState ||
          proforma.customer.country;
    
    console.log('[PDF API] Tax total:', taxTotal, 'Total:', total);

    const pdfData = {
      documentNumber: String(proforma.proformaNumber ?? ''),
      documentType: 'Proforma Invoice' as const,
      issueDate: proforma.issueDate instanceof Date ? proforma.issueDate : new Date(proforma.issueDate),
      paymentTerms: proforma.paymentTerms ? String(proforma.paymentTerms) : undefined,
      incoTerms: proforma.incoTerms ? String(proforma.incoTerms) : undefined,
      poNumber: proforma.poNumber ? String(proforma.poNumber) : undefined,
      poDate: proforma.poDate ? (proforma.poDate instanceof Date ? proforma.poDate : new Date(proforma.poDate)) : undefined,
      destination: destination || undefined,
      isDomestic,
      salesPerson: proforma.quote?.salesRep
        ? {
            name: String(proforma.quote.salesRep.name ?? proforma.quote.salesRep.email ?? 'Sales Person'),
            email: proforma.quote.salesRep.email ? String(proforma.quote.salesRep.email) : undefined,
            phone: undefined, // Phone not available from salesRep relation
          }
        : undefined,
      customer: {
        companyName: String(proforma.customer.companyName ?? ''),
        billingAddress: proforma.customer.billingAddress ? String(proforma.customer.billingAddress) : undefined,
        shippingAddress: proforma.customer.shippingAddress ? String(proforma.customer.shippingAddress) : undefined,
        contactName: proforma.customer.contactName ? String(proforma.customer.contactName) : undefined,
        contactEmail: proforma.customer.contactEmail ? String(proforma.customer.contactEmail) : undefined,
        contactPhone: proforma.customer.contactPhone ? String(proforma.customer.contactPhone) : undefined,
        gstNo: proforma.customer.gstNo ? String(proforma.customer.gstNo) : undefined,
      },
      items,
      subtotal,
      tax: taxTotal > 0
        ? {
            sgst: sgst > 0 ? sgst : undefined,
            cgst: cgst > 0 ? cgst : undefined,
            igst: igst > 0 ? igst : undefined,
            total: taxTotal,
          }
        : undefined,
      total,
      notes: proforma.notes ? String(proforma.notes) : undefined,
      currency: 'INR',
    };
    
    console.log('[PDF API] PDF data prepared, validating...');

    // Validate PDF data before generation
    if (!pdfData.documentNumber || !pdfData.customer?.companyName) {
      console.error('[PDF API] Invalid PDF data:', { 
        documentNumber: pdfData.documentNumber, 
        hasCompanyName: !!pdfData.customer?.companyName 
      });
      return NextResponse.json(
        { error: 'Invalid PDF data', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!pdfData.items || pdfData.items.length === 0) {
      console.error('[PDF API] No items in PDF data');
      return NextResponse.json(
        { error: 'Invalid PDF data', message: 'No line items found' },
        { status: 400 }
      );
    }

    console.log('[PDF API] Calling generateDocumentPDF');
    const pdfBuffer = await generateDocumentPDF(pdfData);
    console.log('[PDF API] PDF generation completed, buffer size:', pdfBuffer?.length ?? 0);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('[PDF API] Generated PDF buffer is empty');
      return NextResponse.json(
        { error: 'Failed to generate PDF', message: 'PDF buffer is empty' },
        { status: 500 }
      );
    }

    console.log('[PDF API] Returning PDF response, size:', pdfBuffer.length);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proforma-${String(proforma.proformaNumber ?? proformaId)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[PDF API] Failed to generate proforma invoice PDF:', {
      error: error?.message || error,
      stack: error?.stack,
      proformaId: proformaId,
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

