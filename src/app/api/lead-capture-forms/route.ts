import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';

// Default lead form fields based on Lead model
const defaultLeadFields = [
  { label: 'Company Name', fieldType: 'text', required: true, order: 1, placeholder: 'Enter company name' },
  { label: 'Contact Name', fieldType: 'text', required: true, order: 2, placeholder: 'Enter contact person name' },
  { label: 'Email', fieldType: 'email', required: true, order: 3, placeholder: 'Enter email address' },
  { label: 'Phone', fieldType: 'phone', required: true, order: 4, placeholder: 'Enter phone number' },
  { label: 'Country', fieldType: 'text', required: false, order: 5, placeholder: 'Enter country' },
  { label: 'State', fieldType: 'text', required: false, order: 6, placeholder: 'Enter state/province' },
  { label: 'City', fieldType: 'text', required: false, order: 7, placeholder: 'Enter city' },
  { label: 'Billing Address', fieldType: 'textarea', required: false, order: 8, placeholder: 'Enter billing address' },
  { label: 'Shipping Address', fieldType: 'textarea', required: false, order: 9, placeholder: 'Enter shipping address' },
  { label: 'GST Number', fieldType: 'text', required: false, order: 10, placeholder: 'Enter GST number (if applicable)' },
  { label: 'Product Interest', fieldType: 'textarea', required: false, order: 11, placeholder: 'Describe product interest' },
  { label: 'Application', fieldType: 'textarea', required: false, order: 12, placeholder: 'Describe application/use case' },
  { label: 'Monthly Requirement', fieldType: 'text', required: false, order: 13, placeholder: 'Enter monthly requirement' },
  { label: 'Notes', fieldType: 'textarea', required: false, order: 14, placeholder: 'Additional notes or comments' },
];

const formSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  fields: z.array(z.object({
    label: z.string().min(1),
    fieldType: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional().nullable(),
    order: z.number().optional(),
  })).optional(),
});

// GET /api/lead-capture-forms - List all forms for current user
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const forms = await prisma.leadCaptureForm.findMany({
      where: {
        createdById: auth.userId,
      },
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

    return NextResponse.json(forms.map(form => ({
      ...form,
      submissionCount: form._count.submissions,
    })));
  } catch (error) {
    console.error('Failed to fetch lead capture forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// POST /api/lead-capture-forms - Create a new lead capture form
export async function POST(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();
  const auth = await getAuthContext(req);

  if (!auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    const validation = formSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate unique slug: {userId}-{timestamp}-{random}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const slug = `${auth.userId}-${timestamp}-${random}`;

    // Use provided fields or default fields
    const fieldsToCreate = data.fields && data.fields.length > 0
      ? data.fields
      : defaultLeadFields;

    const form = await prisma.leadCaptureForm.create({
      data: {
        name: data.name,
        description: data.description || null,
        slug,
        isActive: true,
        createdById: auth.userId,
        fields: {
          create: fieldsToCreate.map((field, index) => ({
            label: field.label,
            fieldType: field.fieldType,
            required: field.required ?? false,
            placeholder: field.placeholder || null,
            order: field.order ?? index + 1,
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
  } catch (error) {
    console.error('Failed to create lead capture form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
