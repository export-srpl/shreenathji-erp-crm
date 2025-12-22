import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { logActivity } from '@/lib/activity-logger';
import { generateNextDocumentNumber } from '@/lib/document-number-generator';

type Params = {
  params: { id: string };
};

type DocumentType = 'QUOTE' | 'PROFORMA' | 'SALES_ORDER' | 'INVOICE';

interface ConversionRequest {
  targetType: 'PROFORMA' | 'SALES_ORDER' | 'INVOICE';
}

// Allowed conversion paths
const ALLOWED_CONVERSIONS: Record<DocumentType, DocumentType[]> = {
  QUOTE: ['PROFORMA', 'SALES_ORDER'],
  PROFORMA: ['SALES_ORDER', 'INVOICE'],
  SALES_ORDER: ['INVOICE'],
  INVOICE: [], // Invoices cannot be converted
};

/**
 * POST /api/documents/[id]/convert
 * Convert a document to another type with atomic transaction
 */
export async function POST(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body: ConversionRequest = await req.json();

  try {
    // Determine source document type by trying each model
    let sourceDoc: any = null;
    let sourceType: DocumentType | null = null;

    // Try Quote
    sourceDoc = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: { include: { product: true } }, customer: true },
    });
    if (sourceDoc) {
      sourceType = 'QUOTE';
    }

    // Try Proforma Invoice
    if (!sourceDoc) {
      sourceDoc = await prisma.proformaInvoice.findUnique({
        where: { id: params.id },
        include: { 
          items: { include: { product: true } }, 
          customer: true, 
          quote: { include: { salesRep: true } },
        },
      });
      if (sourceDoc) {
        sourceType = 'PROFORMA';
      }
    }

    // Try Sales Order
    if (!sourceDoc) {
      sourceDoc = await prisma.salesOrder.findUnique({
        where: { id: params.id },
        include: { 
          items: { include: { product: true } }, 
          customer: true, 
          quote: { include: { salesRep: true } },
          salesRep: true,
        },
      });
      if (sourceDoc) {
        sourceType = 'SALES_ORDER';
      }
    }

    // Try Invoice
    if (!sourceDoc) {
      sourceDoc = await prisma.invoice.findUnique({
        where: { id: params.id },
        include: { items: { include: { product: true } }, customer: true },
      });
      if (sourceDoc) {
        sourceType = 'INVOICE';
      }
    }

    if (!sourceDoc || !sourceType) {
      return NextResponse.json(
        {
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'Source document does not exist',
        },
        { status: 404 }
      );
    }

    // Validate conversion path
    const allowedTargets = ALLOWED_CONVERSIONS[sourceType];
    if (!allowedTargets.includes(body.targetType)) {
      return NextResponse.json(
        {
          errorCode: 'INVALID_CONVERSION',
          message: `Cannot convert ${sourceType} to ${body.targetType}. Allowed targets: ${allowedTargets.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Perform atomic conversion
    const result = await prisma.$transaction(async (tx) => {
      // Prepare common data
      const items = sourceDoc.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct || 0,
      }));

      let newDocument: any;

      if (body.targetType === 'PROFORMA' && sourceType === 'QUOTE') {
        // Quote -> Proforma Invoice
        const proformaNumber = await generateNextDocumentNumber('PROFORMA');
        newDocument = await tx.proformaInvoice.create({
          data: {
            proformaNumber,
            status: 'Draft',
            issueDate: new Date(),
            customerId: sourceDoc.customerId,
            quoteId: sourceDoc.id,
            incoTerms: sourceDoc.incoTerms,
            paymentTerms: sourceDoc.paymentTerms,
            poNumber: sourceDoc.poNumber,
            poDate: sourceDoc.poDate,
            notes: sourceDoc.notes,
            items: {
              create: items,
            },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        // Log activity
        await logActivity({
          prisma: tx as any,
          module: 'PI',
          entityType: 'proforma_invoice',
          entityId: newDocument.id,
          srplId: newDocument.srplId || null,
          action: 'create',
          description: `Proforma Invoice ${proformaNumber} created from Quote ${sourceDoc.quoteNumber}`,
          metadata: {
            sourceDocumentId: sourceDoc.id,
            sourceDocumentType: 'QUOTE',
            sourceDocumentNumber: sourceDoc.quoteNumber,
          },
          performedById: auth.userId || null,
        });
      } else if (body.targetType === 'SALES_ORDER') {
        // Quote/Proforma -> Sales Order
        const orderNumber = await generateNextDocumentNumber('SALES_ORDER');
        // SalesOrder only has quoteId, so use the quoteId from the source (or the source's quoteId if it's a Proforma)
        const quoteId = sourceType === 'QUOTE' ? sourceDoc.id : (sourceDoc.quoteId || null);
        // Get salesRepId from source or from quote if source is Proforma
        let salesRepId = sourceDoc.salesRepId || null;
        if (sourceType === 'PROFORMA' && sourceDoc.quote && sourceDoc.quote.salesRepId) {
          salesRepId = sourceDoc.quote.salesRepId;
        }

        newDocument = await tx.salesOrder.create({
          data: {
            orderNumber,
            status: 'Draft',
            orderDate: new Date(),
            customerId: sourceDoc.customerId,
            quoteId,
            salesRepId,
            incoTerms: sourceDoc.incoTerms,
            paymentTerms: sourceDoc.paymentTerms,
            poNumber: sourceDoc.poNumber,
            poDate: sourceDoc.poDate,
            notes: sourceDoc.notes,
            items: {
              create: items,
            },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        // Log activity
        await logActivity({
          prisma: tx as any,
          module: 'SO',
          entityType: 'sales_order',
          entityId: newDocument.id,
          srplId: newDocument.srplId || null,
          action: 'create',
          description: `Sales Order ${orderNumber} created from ${sourceType} ${sourceType === 'QUOTE' ? sourceDoc.quoteNumber : sourceDoc.proformaNumber}`,
          metadata: {
            sourceDocumentId: sourceDoc.id,
            sourceDocumentType: sourceType,
            sourceDocumentNumber: sourceType === 'QUOTE' ? sourceDoc.quoteNumber : sourceDoc.proformaNumber,
          },
          performedById: auth.userId || null,
        });
      } else if (body.targetType === 'INVOICE') {
        // Proforma/Sales Order -> Invoice
        const invoiceNumber = await generateNextDocumentNumber('INVOICE');
        const proformaId = sourceType === 'PROFORMA' ? sourceDoc.id : null;
        const salesOrderId = sourceType === 'SALES_ORDER' ? sourceDoc.id : null;

        newDocument = await tx.invoice.create({
          data: {
            invoiceNumber,
            status: 'Draft',
            issueDate: new Date(),
            customerId: sourceDoc.customerId,
            proformaId,
            salesOrderId,
            incoTerms: sourceDoc.incoTerms,
            paymentTerms: sourceDoc.paymentTerms,
            poNumber: sourceDoc.poNumber,
            poDate: sourceDoc.poDate,
            notes: sourceDoc.notes,
            items: {
              create: items,
            },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        // Log activity
        await logActivity({
          prisma: tx as any,
          module: 'INV',
          entityType: 'invoice',
          entityId: newDocument.id,
          srplId: newDocument.srplId || null,
          action: 'create',
          description: `Invoice ${invoiceNumber} created from ${sourceType} ${sourceType === 'PROFORMA' ? sourceDoc.proformaNumber : sourceDoc.orderNumber}`,
          metadata: {
            sourceDocumentId: sourceDoc.id,
            sourceDocumentType: sourceType,
            sourceDocumentNumber: sourceType === 'PROFORMA' ? sourceDoc.proformaNumber : sourceDoc.orderNumber,
          },
          performedById: auth.userId || null,
        });
      } else {
        throw new Error(`Unsupported conversion: ${sourceType} -> ${body.targetType}`);
      }

      return newDocument;
    });

    return NextResponse.json(
      {
        success: true,
        documentId: result.id,
        documentType: body.targetType,
        documentNumber: result.proformaNumber || result.orderNumber || result.invoiceNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Document conversion error:', {
      sourceDocumentId: params.id,
      targetType: body.targetType,
      userId: auth.userId,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        errorCode: 'CONVERSION_FAILED',
        message: error.message || 'Failed to convert document',
      },
      { status: 500 }
    );
  }
}

