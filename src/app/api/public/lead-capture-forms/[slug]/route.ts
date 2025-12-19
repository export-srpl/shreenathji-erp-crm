import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

type Params = {
  params: { slug: string };
};

// GET /api/public/lead-capture-forms/[slug] - get public form by slug
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  
  const form = await prisma.leadCaptureForm.findUnique({
    where: { 
      slug: params.slug,
      isActive: true,
    },
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  return NextResponse.json(form);
}

