import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { deleteDocument } from '@/lib/document-storage';
import { logActivity } from '@/lib/activity-logger';
import { checkAndRequestApproval, isPendingApproval } from '@/lib/approval-integration';
import { logAudit } from '@/lib/audit-logger';

type Params = {
  params: { id: string };
};

/**
 * GET /api/documents/[id]
 * Get a single document with versions
 */
export async function GET(req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    const document = await p.document.findUnique({
      where: { id: params.id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, srplId: true },
        },
        customer: {
          select: { id: true, companyName: true, srplId: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Log access
    const auth = await getAuthContext(req);
    if (auth.userId) {
      await p.documentAccessLog.create({
        data: {
          documentId: document.id,
          userId: auth.userId,
          action: 'view',
        },
      });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document
 */
export async function DELETE(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = await getPrismaClient();
    const p: any = prisma;

    const document = await p.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const pending = await isPendingApproval(
      prisma,
      'document',
      params.id,
      'delete'
    );

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This document deletion has pending approval requests. Please wait for approval before deleting.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check if approval is required for document deletion
    const ipAddress = _req.headers.get('x-forwarded-for') || 
                      _req.headers.get('x-real-ip') || 
                      null;
    const userAgent = _req.headers.get('user-agent') || null;

    const approvalCheck = await checkAndRequestApproval(prisma, {
      resource: 'document',
      resourceId: params.id,
      action: 'delete',
      data: {
        documentName: document.name,
        documentType: document.type,
        entityType: document.entityType,
      },
      userId: auth.userId,
      ipAddress,
      userAgent,
    });

    if (approvalCheck.requiresApproval) {
      if (approvalCheck.error) {
        return NextResponse.json(
          {
            error: approvalCheck.error,
            approvalRequestId: approvalCheck.approvalRequestId,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Approval required',
          message: 'Document deletion requires approval before it can be performed.',
          approvalRequestId: approvalCheck.approvalRequestId,
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    // Phase 4: Log audit entry for document deletion
    await logAudit(prisma, {
      userId: auth.userId,
      action: 'document_deleted',
      resource: 'document',
      resourceId: params.id,
      details: {
        documentName: document.name,
        documentType: document.type,
        entityType: document.entityType,
        entityId: document.entityId,
      },
      ipAddress,
      userAgent,
    });

    // Delete file from blob storage (use fileUrl if available, otherwise filePath)
    if (document.fileUrl) {
      await deleteDocument(document.fileUrl);
    } else if (document.filePath) {
      // Fallback for old filePath-based storage
      await deleteDocument(document.filePath);
    }

    // Delete all versions
    for (const version of await p.documentVersion.findMany({
      where: { documentId: document.id },
    })) {
      if (version.fileUrl) {
        await deleteDocument(version.fileUrl);
      } else if (version.filePath) {
        // Fallback for old filePath-based storage
        await deleteDocument(version.filePath);
      }
    }

    // Delete document record (cascades to versions and access logs)
    await p.document.delete({
      where: { id: params.id },
    });

    // Log activity
    const moduleMap: Record<string, string> = {
      product: 'PROD',
      customer: 'CUST',
      lead: 'LEAD',
      deal: 'DEAL',
    };
    await logActivity({
      prisma,
      module: (moduleMap[document.entityType] || 'LEAD') as any,
      entityType: document.entityType,
      entityId: document.entityId,
      action: 'document_deleted',
      description: `Document "${document.name}" deleted`,
      performedById: auth.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

