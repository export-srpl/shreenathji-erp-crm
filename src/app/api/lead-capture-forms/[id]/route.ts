import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';

type Params = {
  params: { id: string };
};

// GET /api/lead-capture-forms/[id] - get a single form
export async function GET(_req: Request, { params }: Params) {
  const prisma = await getPrismaClient();
  
  const form = await prisma.leadCaptureForm.findUnique({
    where: { id: params.id },
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

// PATCH /api/lead-capture-forms/[id] - update a form
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, fields, isActive } = body;

    const prisma = await getPrismaClient();

    // Get existing form
    const existing = await prisma.leadCaptureForm.findUnique({
      where: { id: params.id },
      include: { fields: true },
    });

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
        where: { formId: params.id },
      });

      // Create new fields
      await prisma.formField.createMany({
        data: fields.map((field: any, index: number) => ({
          formId: params.id,
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
      where: { id: params.id },
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

// DELETE /api/lead-capture-forms/[id] - delete a form
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = await getPrismaClient();
    await prisma.leadCaptureForm.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete form' },
      { status: 500 }
    );
  }
}

