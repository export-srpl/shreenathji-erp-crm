import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

type Params = {
  params: { slug: string };
};

// POST /api/public/lead-capture-forms/[slug]/submit - submit a form (public endpoint)
export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const formData = body.data || {};

    const prisma = await getPrismaClient();

    // Get the form
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

    // Validate required fields
    const requiredFields = form.fields.filter((f: any) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.id] || formData[field.id].toString().trim() === '') {
        return NextResponse.json(
          { error: `Field "${field.label}" is required` },
          { status: 400 }
        );
      }
    }

    // Extract lead data from form submission
    // Map common field labels to lead fields
    const leadData: any = {
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      country: '',
      state: '',
      city: '',
      billingAddress: '',
      source: 'Cold Call', // Default lead source
      status: 'New',
      notes: '',
    };

    // Try to map form fields to lead fields based on common patterns
    for (const field of form.fields) {
      const value = formData[field.id];
      if (!value) continue;

      const labelLower = field.label.toLowerCase();
      const valueStr = value.toString();

      if (labelLower.includes('company') || labelLower.includes('business') || labelLower.includes('organization')) {
        leadData.companyName = valueStr;
      } else if (labelLower.includes('name') && !labelLower.includes('company')) {
        if (!leadData.contactName) leadData.contactName = valueStr;
      } else if (labelLower.includes('email')) {
        leadData.email = valueStr;
      } else if (labelLower.includes('phone') || labelLower.includes('mobile') || labelLower.includes('contact')) {
        leadData.phone = valueStr;
      } else if (labelLower.includes('country')) {
        leadData.country = valueStr;
      } else if (labelLower.includes('state') || labelLower.includes('province')) {
        leadData.state = valueStr;
      } else if (labelLower.includes('city')) {
        leadData.city = valueStr;
      } else if (labelLower.includes('address')) {
        leadData.billingAddress = valueStr;
      } else {
        // Add to notes
        leadData.notes += `${field.label}: ${valueStr}\n`;
      }
    }

    // Ensure companyName is set (required field)
    if (!leadData.companyName) {
      leadData.companyName = leadData.contactName || 'Unknown Company';
    }

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create lead and form submission in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the lead
      const lead = await tx.lead.create({
        data: leadData,
      });

      // Create form submission
      const submission = await tx.formSubmission.create({
        data: {
          formId: form.id,
          leadId: lead.id,
          data: JSON.stringify(formData),
          ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
          userAgent,
        },
      });

      return { lead, submission };
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Form submitted successfully',
        leadId: result.lead.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to submit form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit form' },
      { status: 500 }
    );
  }
}

