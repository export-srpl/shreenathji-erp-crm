import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/srpl/config - get all sequence configurations
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const auth = await getAuthContext(_req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const configs = await prisma.sequenceConfig.findMany({
    orderBy: { moduleCode: 'asc' },
  });

  return NextResponse.json(configs);
}

// PATCH /api/srpl/config - update sequence configuration
export async function PATCH(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { moduleCode, useYearPrefix, useFinancialYear, financialYearStart, padding } = body;

    if (!moduleCode) {
      return NextResponse.json({ error: 'moduleCode is required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    
    const config = await prisma.sequenceConfig.upsert({
      where: { moduleCode },
      create: {
        moduleCode,
        useYearPrefix: useYearPrefix || false,
        useFinancialYear: useFinancialYear || false,
        financialYearStart: financialYearStart || 4,
        padding: padding || 6,
      },
      update: {
        ...(useYearPrefix !== undefined && { useYearPrefix }),
        ...(useFinancialYear !== undefined && { useFinancialYear }),
        ...(financialYearStart !== undefined && { financialYearStart }),
        ...(padding !== undefined && { padding }),
      },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Failed to update sequence config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

