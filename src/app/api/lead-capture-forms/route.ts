import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/lead-capture-forms - list all forms
export async function GET(_req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const forms = await prisma.leadCaptureForm.findMany({
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(forms);
}

// POST /api/lead-capture-forms - create a new form
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, fields, isActive = true } = body;

    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one field are required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClient();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug exists
    const existing = await prisma.leadCaptureForm.findUnique({
      where: { slug },
    });

    let finalSlug = slug;
    if (existing) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const form = await prisma.leadCaptureForm.create({
      data: {
        name,
        description: description || null,
        slug: finalSlug,
        isActive,
        createdById: auth.userId,
        fields: {
          create: fields.map((field: any, index: number) => ({
            label: field.label,
            fieldType: field.fieldType || 'text',
            placeholder: field.placeholder || null,
            required: field.required || false,
            options: field.options ? JSON.stringify(field.options) : null,
            order: field.order ?? index,
            validation: field.validation ? JSON.stringify(field.validation) : null,
          })),
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create form' },
      { status: 500 }
    );
  }
}

