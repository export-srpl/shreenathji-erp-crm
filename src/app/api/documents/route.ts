import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { saveDocument } from '@/lib/document-storage';
import { logActivity } from '@/lib/activity-logger';
import { scanFile, validateFileType, validateFileSize } from '@/lib/virus-scanner';

/**
 * GET /api/documents
 * List documents for an entity
 * Query params: entityType, entityId
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    const documents = await p.document.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1, // Latest version
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Upload a new document
 */
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string | null;
    const productId = formData.get('productId') as string | null;
    const customerId = formData.get('customerId') as string | null;

    if (!file || !entityType || !entityId || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const fileTypeValidation = validateFileType(file.type, file.name);
    if (!fileTypeValidation.valid) {
      return NextResponse.json({ error: fileTypeValidation.message }, { status: 400 });
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(file.size);
    if (!fileSizeValidation.valid) {
      return NextResponse.json({ error: fileSizeValidation.message }, { status: 400 });
    }

    // Validate document type requirements
    const productRequiredTypes = ['COA', 'TDS', 'MSDS'];
    const customerRequiredTypes = ['contract'];

    if (productRequiredTypes.includes(type) && !productId) {
      return NextResponse.json(
        { error: `Product selection is required for ${type} documents` },
        { status: 400 },
      );
    }

    if (customerRequiredTypes.includes(type) && !customerId) {
      return NextResponse.json(
        { error: `Customer selection is required for ${type} documents` },
        { status: 400 },
      );
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Scan for viruses before saving
    const scanResult = await scanFile(file.name, buffer);
    if (!scanResult.isClean) {
      return NextResponse.json(
        {
          error: 'File failed virus scan',
          details: scanResult.message,
          scanResult: scanResult.scanResult,
        },
        { status: 400 },
      );
    }

    // Save file
    const { filePath, fileUrl } = await saveDocument(buffer, file.name, entityType, entityId);

    // Create document record
    const document = await p.document.create({
      data: {
        name,
        type,
        description,
        entityType,
        entityId,
        productId: productId || null,
        customerId: customerId || null,
        mimeType: file.type,
        fileSize: file.size,
        filePath,
        fileUrl,
        isScanned: scanResult.isScanned,
        scanResult: scanResult.scanResult,
        uploadedById: auth.userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        product: productId
          ? {
              select: { id: true, name: true, srplId: true },
            }
          : undefined,
        customer: customerId
          ? {
              select: { id: true, companyName: true, srplId: true },
            }
          : undefined,
      },
    });

    // Create initial version
    await p.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        name: file.name,
        filePath,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        uploadedById: auth.userId,
      },
    });

    // Log activity
    await logActivity({
      prisma,
      module: (entityType.toUpperCase() === 'PRODUCT' ? 'PROD' : entityType.toUpperCase() === 'CUSTOMER' ? 'CUST' : 'LEAD') as any,
      entityType,
      entityId,
      action: 'document_added',
      description: `Document "${name}" uploaded`,
      performedById: auth.userId,
    });

    // Log access
    await p.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: auth.userId,
        action: 'upload',
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

