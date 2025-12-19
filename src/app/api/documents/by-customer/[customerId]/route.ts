import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { customerId: string };
};

/**
 * GET /api/documents/by-customer/[customerId]
 * Get all documents (contracts) linked to a specific customer
 */
export async function GET(_req: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const prisma = await getPrismaClient();
    const p: any = prisma;

    const documents = await p.document.findMany({
      where: {
        customerId: params.customerId,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        customer: {
          select: { id: true, companyName: true, srplId: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch customer documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

