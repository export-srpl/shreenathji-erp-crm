import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';

type Params = {
  params: { slug: string };
};

// Helper function to find form by slug or ID
async function findFormByIdentifier(identifier: string, includeInactive = false) {
  const prisma = await getPrismaClient();
  
  // Try to find by slug first (for public access)
  let form = await prisma.leadCaptureForm.findUnique({
    where: { slug: identifier },
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

  // If not found by slug and includeInactive is true, try by ID (for authenticated access)
  if (!form && includeInactive) {
    form = await prisma.leadCaptureForm.findUnique({
      where: { id: identifier },
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
  }

  return form;
}

// GET /api/lead-capture-forms/[slug] - Get form by slug (public) or ID (authenticated)
export async function GET(req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);
  
  // If authenticated, allow access to inactive forms by ID
  const includeInactive = !!auth.userId;

  try {
    const form = await findFormByIdentifier(params.slug, includeInactive);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // For public access (no auth), only return active forms
    if (!auth.userId && !form.isActive) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Return form data
    if (auth.userId) {
      // Authenticated: return full form data
      return NextResponse.json(form);
    } else {
      // Public: return limited data
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
    }
  } catch (error) {
    console.error('Failed to fetch form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// PATCH /api/lead-capture-forms/[slug] - Update a form (by ID)
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, fields, isActive } = body;

    const prisma = await getPrismaClient();

    // Find form by ID (params.slug may be ID in this case)
    const existing = await findFormByIdentifier(params.slug, true);
    
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Update form
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update fields if provided
    if (fields && Array.isArray(fields)) {
      // Delete existing fields
      await prisma.formField.deleteMany({
        where: { formId: existing.id },
      });

      // Create new fields
      await prisma.formField.createMany({
        data: fields.map((field: any, index: number) => ({
          formId: existing.id,
          label: field.label,
          fieldType: field.fieldType || 'text',
          placeholder: field.placeholder || null,
          required: field.required || false,
          options: field.options ? JSON.stringify(field.options) : null,
          order: field.order ?? index,
          validation: field.validation ? JSON.stringify(field.validation) : null,
        })),
      });
    }

    const updated = await prisma.leadCaptureForm.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update form' },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-capture-forms/[slug] - Delete a form (by ID)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isRoleAllowed(auth.role, ['admin'])) {
    // Non-admin: check if user is the creator
    const prisma = await getPrismaClient();
    const form = await findFormByIdentifier(params.slug, true);
    
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (form.createdById !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const prisma = await getPrismaClient();
    const form = await findFormByIdentifier(params.slug, true);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Delete form (cascade will delete fields and submissions)
    await prisma.leadCaptureForm.delete({
      where: { id: form.id },
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

