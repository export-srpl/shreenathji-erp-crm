import type { PrismaClient } from '@prisma/client';

export interface DuplicateMatch {
  type: 'company' | 'email' | 'phone' | 'gst' | 'vat';
  value: string;
  matches: Array<{
    id: string;
    srplId?: string | null;
    companyName: string;
    entityType: 'lead' | 'customer';
    createdAt: Date;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

export interface LeadHealthScore {
  leadId: string;
  score: number; // 0-100
  factors: {
    hasContactInfo: boolean;
    hasFollowUpDate: boolean;
    daysSinceLastActivity: number;
    completeness: number; // 0-100
    isStale: boolean;
    warnings: string[];
  };
}

/**
 * Check for duplicate leads/customers based on various criteria
 */
export async function checkDuplicates(
  prisma: PrismaClient,
  data: {
    companyName?: string;
    email?: string;
    phone?: string;
    gstNo?: string;
    vatNumber?: string;
  },
  excludeId?: string, // Exclude this ID from checks (for updates)
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];

  // Normalize inputs
  const normalizedCompany = data.companyName?.toLowerCase().trim();
  const normalizedEmail = data.email?.toLowerCase().trim();
  const normalizedPhone = data.phone?.replace(/\D/g, ''); // Remove non-digits
  const normalizedGst = data.gstNo?.toUpperCase().trim();
  const normalizedVat = data.vatNumber?.toUpperCase().trim();

  // Build where clause to exclude current record
  const excludeWhere = excludeId ? { id: { not: excludeId } } : {};

  // 1. Check company name (fuzzy match)
  if (normalizedCompany) {
    const companyMatches = await prisma.lead.findMany({
      where: {
        ...excludeWhere,
        companyName: {
          contains: normalizedCompany,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    const customerCompanyMatches = await prisma.customer.findMany({
      where: {
        ...excludeWhere,
        companyName: {
          contains: normalizedCompany,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    if (companyMatches.length > 0 || customerCompanyMatches.length > 0) {
      matches.push({
        type: 'company',
        value: data.companyName!,
        matches: [
          ...companyMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'lead' as const,
            createdAt: m.createdAt,
          })),
          ...customerCompanyMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'customer' as const,
            createdAt: m.createdAt,
          })),
        ],
        confidence: 'high',
      });
    }
  }

  // 2. Check email (exact match)
  if (normalizedEmail) {
    const emailMatches = await prisma.lead.findMany({
      where: {
        ...excludeWhere,
        email: normalizedEmail,
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    const customerEmailMatches = await prisma.customer.findMany({
      where: {
        ...excludeWhere,
        contactEmail: normalizedEmail,
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    if (emailMatches.length > 0 || customerEmailMatches.length > 0) {
      matches.push({
        type: 'email',
        value: data.email!,
        matches: [
          ...emailMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'lead' as const,
            createdAt: m.createdAt,
          })),
          ...customerEmailMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'customer' as const,
            createdAt: m.createdAt,
          })),
        ],
        confidence: 'high',
      });
    }
  }

  // 3. Check phone (normalized)
  if (normalizedPhone && normalizedPhone.length >= 10) {
    // Find leads/customers with similar phone numbers
    const allLeads = await prisma.lead.findMany({
      where: excludeWhere,
      select: {
        id: true,
        srplId: true,
        companyName: true,
        phone: true,
        createdAt: true,
      },
    });

    const allCustomers = await prisma.customer.findMany({
      where: excludeWhere,
      select: {
        id: true,
        srplId: true,
        companyName: true,
        contactPhone: true,
        createdAt: true,
      },
    });

    const phoneMatches = [
      ...allLeads
        .filter((l) => l.phone && l.phone.replace(/\D/g, '') === normalizedPhone)
        .map((m) => ({
          id: m.id,
          srplId: m.srplId,
          companyName: m.companyName,
          entityType: 'lead' as const,
          createdAt: m.createdAt,
        })),
      ...allCustomers
        .filter((c) => c.contactPhone && c.contactPhone.replace(/\D/g, '') === normalizedPhone)
        .map((m) => ({
          id: m.id,
          srplId: m.srplId,
          companyName: m.companyName,
          entityType: 'customer' as const,
          createdAt: m.createdAt,
        })),
    ];

    if (phoneMatches.length > 0) {
      matches.push({
        type: 'phone',
        value: data.phone!,
        matches: phoneMatches,
        confidence: 'high',
      });
    }
  }

  // 4. Check GST number (exact match, case-insensitive)
  if (normalizedGst) {
    const gstMatches = await prisma.lead.findMany({
      where: {
        ...excludeWhere,
        gstNo: {
          equals: normalizedGst,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    const customerGstMatches = await prisma.customer.findMany({
      where: {
        ...excludeWhere,
        gstNo: {
          equals: normalizedGst,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        srplId: true,
        companyName: true,
        createdAt: true,
      },
      take: 10,
    });

    if (gstMatches.length > 0 || customerGstMatches.length > 0) {
      matches.push({
        type: 'gst',
        value: data.gstNo!,
        matches: [
          ...gstMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'lead' as const,
            createdAt: m.createdAt,
          })),
          ...customerGstMatches.map((m) => ({
            id: m.id,
            srplId: m.srplId,
            companyName: m.companyName,
            entityType: 'customer' as const,
            createdAt: m.createdAt,
          })),
        ],
        confidence: 'high',
      });
    }
  }

  // 5. Check VAT number (exact match, case-insensitive)
  if (normalizedVat) {
    // Note: VAT number might be stored in a custom field or notes
    // For now, we'll check if it's in the notes or a custom field
    // This can be extended when VAT field is added to schema
    const vatMatches: any[] = [];
    // TODO: Add VAT number field to Lead/Customer schema if needed

    if (vatMatches.length > 0) {
      matches.push({
        type: 'vat',
        value: data.vatNumber!,
        matches: vatMatches,
        confidence: 'high',
      });
    }
  }

  return matches;
}

/**
 * Calculate lead health score based on various factors
 */
export async function calculateLeadHealth(
  prisma: PrismaClient,
  leadId: string,
): Promise<LeadHealthScore> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: {
        select: { id: true, name: true },
      },
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const factors = {
    hasContactInfo: !!(lead.email || lead.phone),
    hasFollowUpDate: !!lead.followUpDate,
    daysSinceLastActivity: 0,
    completeness: 0,
    isStale: false,
    warnings: [] as string[],
  };

  // Calculate completeness (percentage of required fields filled)
  const requiredFields = ['companyName', 'contactName', 'email', 'phone', 'country', 'status'];
  const optionalFields = ['state', 'city', 'gstNo', 'billingAddress', 'productInterest', 'application'];
  let filledRequired = 0;
  let filledOptional = 0;

  for (const field of requiredFields) {
    if (lead[field as keyof typeof lead] && lead[field as keyof typeof lead] !== '') {
      filledRequired++;
    }
  }

  for (const field of optionalFields) {
    if (lead[field as keyof typeof lead] && lead[field as keyof typeof lead] !== '') {
      filledOptional++;
    }
  }

  factors.completeness = Math.round(
    ((filledRequired / requiredFields.length) * 0.7 + (filledOptional / optionalFields.length) * 0.3) * 100,
  );

  // Calculate days since last activity
  const now = new Date();
  const lastActivity = lead.updatedAt || lead.createdAt;
  factors.daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  // Check if lead is stale (no activity for 30+ days)
  factors.isStale = factors.daysSinceLastActivity >= 30;

  // Generate warnings
  if (!factors.hasContactInfo) {
    factors.warnings.push('Missing contact information (email or phone)');
  }
  if (!factors.hasFollowUpDate) {
    factors.warnings.push('No follow-up date scheduled');
  }
  if (factors.isStale) {
    factors.warnings.push(`Lead is stale (${factors.daysSinceLastActivity} days since last activity)`);
  }
  if (factors.completeness < 50) {
    factors.warnings.push('Lead information is incomplete');
  }
  if (lead.status === 'New' && factors.daysSinceLastActivity > 7) {
    factors.warnings.push('New lead has not been contacted in 7+ days');
  }

  // Calculate overall health score (0-100)
  let score = 0;

  // Base score from completeness (40 points)
  score += (factors.completeness / 100) * 40;

  // Contact info (20 points)
  if (factors.hasContactInfo) score += 20;

  // Follow-up scheduled (15 points)
  if (factors.hasFollowUpDate) score += 15;

  // Recency (15 points) - more recent = higher score
  if (factors.daysSinceLastActivity <= 7) score += 15;
  else if (factors.daysSinceLastActivity <= 14) score += 10;
  else if (factors.daysSinceLastActivity <= 30) score += 5;

  // Status (10 points) - active statuses get more points
  if (['Qualified', 'Contacted'].includes(lead.status)) score += 10;
  else if (lead.status === 'New') score += 5;

  // Penalties
  if (factors.isStale) score -= 20;
  if (factors.warnings.length > 2) score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    leadId,
    score,
    factors,
  };
}

/**
 * Find stale leads (no activity for N days)
 */
export async function findStaleLeads(
  prisma: PrismaClient,
  daysThreshold: number = 30,
  status?: string[],
): Promise<Array<{ id: string; srplId: string | null; companyName: string; daysSinceActivity: number }>> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const leads = await prisma.lead.findMany({
    where: {
      ...(status ? { status: { in: status } } : {}),
      OR: [
        { updatedAt: { lt: thresholdDate } },
        { followUpDate: { lt: thresholdDate } },
      ],
    },
    select: {
      id: true,
      srplId: true,
      companyName: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const now = new Date();
  return leads.map((lead) => {
    const lastActivity = lead.updatedAt || lead.createdAt;
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: lead.id,
      srplId: lead.srplId,
      companyName: lead.companyName,
      daysSinceActivity,
    };
  });
}

