import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';
import { generateSRPLId } from '@/lib/srpl-id-generator';
import { checkDuplicates } from '@/lib/data-hygiene';
import { leadSchema, validateInput } from '@/lib/validation';

type Params = {
  params: { slug: string };
};

// POST /api/lead-capture-forms/[slug]/submit - Submit form and create lead
export async function POST(req: Request, { params }: Params) {
  const prisma = await getPrismaClient();

  try {
    // Get form by slug
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
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    if (!form.createdBy) {
      return NextResponse.json({ error: 'Form owner not found' }, { status: 404 });
    }

    const body = await req.json();
    const formData = body.data || {};

    // Extract IP address and user agent for security tracking
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Determine customer type based on country
    const country = formData['Country'] || formData.country || '';
    const isIndia = country.trim().toLowerCase() === 'india';
    const customerType = formData.customerType || (isIndia ? 'domestic' : 'international');

    // Map form fields to lead data
    const leadData: any = {
      companyName: formData['Company Name'] || formData.companyName || '',
      contactName: formData['Contact Name'] || formData.contactName || '',
      email: formData['Email'] || formData.email || '',
      phone: formData['Phone'] || formData.phone || '',
      country: country || null,
      state: formData['State'] || formData.state || null,
      city: formData['City'] || formData.city || null,
      billingAddress: formData['Billing Address'] || formData.billingAddress || null,
      shippingAddress: formData['Shipping Address'] || formData.shippingAddress || null,
      // Only include GST if country is India
      gstNo: isIndia ? (formData['GST Number'] || formData.gstNo || null) : null,
      productInterest: formData['Product Interest'] || formData.productInterest || null,
      application: formData['Application'] || formData.application || null,
      monthlyRequirement: formData['Monthly Requirement'] || formData.monthlyRequirement || null,
      notes: formData['Notes'] || formData.notes || null,
      status: 'New',
      source: `Lead Form: ${form.name}`,
      ownerId: form.createdBy.id, // Auto-assign to form creator
      customerType, // Store customer type for reference
    };

    // Validate lead data
    const validation = validateInput(leadSchema, leadData);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Check for duplicates
    const duplicates = await checkDuplicates(prisma, {
      companyName: validatedData.companyName,
      email: validatedData.email,
      phone: validatedData.phone,
      gstNo: validatedData.gstNo,
    });

    // Generate SRPL ID
    const srplId = await generateSRPLId({
      moduleCode: 'LEAD',
      prisma,
    });

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        srplId,
        companyName: validatedData.companyName,
        contactName: validatedData.contactName,
        email: validatedData.email,
        phone: validatedData.phone,
        country: validatedData.country,
        state: validatedData.state,
        city: validatedData.city,
        billingAddress: validatedData.billingAddress,
        shippingAddress: validatedData.shippingAddress,
        gstNo: validatedData.gstNo,
        status: validatedData.status,
        source: validatedData.source,
        productInterest: validatedData.productInterest,
        application: validatedData.application,
        monthlyRequirement: validatedData.monthlyRequirement,
        notes: validatedData.notes,
        ownerId: form.createdBy.id, // Auto-assigned to form creator
      },
    });

    // Create form submission record
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        leadId: lead.id,
        data: JSON.stringify(formData),
        ipAddress,
        userAgent,
      },
    });

    // Log activity
    await logActivity({
      prisma,
      module: 'LEAD',
      entityType: 'lead',
      entityId: lead.id,
      srplId: lead.srplId || null,
      action: 'create',
      description: `Lead created via form "${form.name}"`,
      metadata: {
        formId: form.id,
        formSlug: form.slug,
        submissionId: submission.id,
        hasDuplicates: duplicates.length > 0,
        ipAddress,
      },
      performedById: null, // Public submission
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      srplId: lead.srplId,
      message: 'Lead submitted successfully',
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

