import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { checkDuplicates } from '@/lib/data-hygiene';

/**
 * POST /api/hygiene/duplicates
 * Check for duplicate leads/customers
 * Body: { companyName?, email?, phone?, gstNo?, vatNumber?, excludeId? }
 */
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { companyName, email, phone, gstNo, vatNumber, excludeId } = body;

    if (!companyName && !email && !phone && !gstNo && !vatNumber) {
      return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const matches = await checkDuplicates(prisma, {
      companyName,
      email,
      phone,
      gstNo,
      vatNumber,
    }, excludeId);

    return NextResponse.json({
      hasDuplicates: matches.length > 0,
      matches,
    });
  } catch (error) {
    console.error('Failed to check duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

