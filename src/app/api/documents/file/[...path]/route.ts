import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getDocument } from '@/lib/document-storage';
import { join } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'documents');

type Params = {
  params: { path: string[] };
};

/**
 * GET /api/documents/file/[...path]
 * Serve document file
 */
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    // Reconstruct file path
    const filePath = join(UPLOAD_DIR, ...params.path);

    // Get file
    const fileBuffer = await getDocument(filePath);

    // Determine content type from file extension
    const extension = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };

    const contentType = contentTypeMap[extension || ''] || 'application/octet-stream';

    // Log access
    const prisma = await getPrismaClient();
    const p: any = prisma;
    const auth = await import('@/lib/auth').then((m) => m.getAuthContext(req));
    if (auth.userId) {
      // Try to find document by file path
      const document = await p.document.findFirst({
        where: { filePath },
      });
      if (document) {
        await p.documentAccessLog.create({
          data: {
            documentId: document.id,
            userId: auth.userId,
            action: 'download',
          },
        });
      }
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${params.path[params.path.length - 1]}"`,
      },
    });
  } catch (error) {
    console.error('Failed to serve document:', error);
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

