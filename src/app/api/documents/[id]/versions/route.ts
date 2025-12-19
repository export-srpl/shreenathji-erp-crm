import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { saveDocument } from '@/lib/document-storage';

type Params = {
  params: { id: string };
};

/**
 * POST /api/documents/[id]/versions
 * Upload a new version of a document
 */
export async function POST(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    // Get document
    const document = await p.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get latest version
    const latestVersion = await p.documentVersion.findFirst({
      where: { documentId: params.id },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const changeNotes = formData.get('changeNotes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file
    const { filePath, fileUrl } = await saveDocument(buffer, file.name, document.entityType, document.entityId);

    // Create version
    const version = await p.documentVersion.create({
      data: {
        documentId: params.id,
        version: nextVersion,
        name: file.name,
        filePath,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        changeNotes,
        uploadedById: auth.userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update document with latest version info
    await p.document.update({
      where: { id: params.id },
      data: {
        filePath,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        updatedAt: new Date(),
      },
    });

    // Log access
    await p.documentAccessLog.create({
      data: {
        documentId: params.id,
        userId: auth.userId,
        action: 'upload',
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Failed to upload document version:', error);
    return NextResponse.json({ error: 'Failed to upload document version' }, { status: 500 });
  }
}

