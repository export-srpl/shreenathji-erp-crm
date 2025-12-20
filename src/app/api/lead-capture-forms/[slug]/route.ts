import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

type Params = {
  params: { slug: string };
};

// GET /api/lead-capture-forms/[slug] - Get form by slug (public access)
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();

  try {
    const form = await prisma.leadCaptureForm.findUnique({
      where: {
        slug: params.slug,
        isActive: true,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Return form data (without sensitive info)
    return NextResponse.json({
      id: form.id,
      name: form.name,
      description: form.description,
      slug: form.slug,
      fields: form.fields,
      createdBy: {
        id: form.createdBy?.id,
        name: form.createdBy?.name,
      },
    });
  } catch (error) {
    console.error('Failed to fetch form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-capture-forms/[slug] - Delete a form (by ID, not slug)
export async function DELETE(req: Request, { params }: Params) {
  const { getAuthContext } = await import('@/lib/auth');
  const { requireAuth } = await import('@/lib/auth-utils');
  
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find form by ID (params.slug is actually the form ID in this case)
    const form = await prisma.leadCaptureForm.findUnique({
      where: { id: params.slug },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Only allow deletion by form creator
    if (form.createdById !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete form (cascade will delete fields and submissions)
    await prisma.leadCaptureForm.delete({
      where: { id: params.slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}

