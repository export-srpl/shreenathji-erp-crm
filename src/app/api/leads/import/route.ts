import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const leads = body.leads as Array<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    status: string;
    leadSource: string;
    country: string;
  }>;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const created = await prisma.$transaction(
    leads.map(l =>
      prisma.lead.create({
        data: {
          companyName: l.companyName,
          contactName: l.contactName,
          email: l.email,
          phone: l.phone,
          country: l.country,
          status: l.status,
          source: l.leadSource,
        },
      }),
    ),
  );

  return NextResponse.json(created, { status: 201 });
}


