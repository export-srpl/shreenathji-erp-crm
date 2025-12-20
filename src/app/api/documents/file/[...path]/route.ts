import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getDocument } from '@/lib/document-storage';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'documents');

type Params = {
  params: { path: string[] };
};

/**
 * GET /api/documents/file/[...path]
 * Serve document file (backward compatibility for old file system storage)
 * For new uploads using Vercel Blob, files are accessed directly via fileUrl
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;
    const { getAuthContext } = await import('@/lib/auth');
    const auth = await getAuthContext(req);

    // Reconstruct file path for old file system storage
    const filePath = join(UPLOAD_DIR, ...params.path);

    // Check if document exists in database with this filePath
    const document = await p.document.findFirst({
      where: { filePath },
    });

    // If document has fileUrl (Vercel Blob), redirect to it
    if (document?.fileUrl) {
      // Log access
      if (auth.userId) {
        await p.documentAccessLog.create({
          data: {
            documentId: document.id,
            userId: auth.userId,
            action: 'download',
          },
        });
      }
      // Redirect to blob URL
      return NextResponse.redirect(document.fileUrl);
    }

    // Fallback: Try to serve from file system (for backward compatibility)
    if (existsSync(filePath)) {
      const fileBuffer = await readFile(filePath);

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

      // Log access if document found
      if (document && auth.userId) {
        await p.documentAccessLog.create({
          data: {
            documentId: document.id,
            userId: auth.userId,
            action: 'download',
          },
        });
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${params.path[params.path.length - 1]}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to serve document:', error);
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

