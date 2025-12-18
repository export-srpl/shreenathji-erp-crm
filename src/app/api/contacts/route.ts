import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/contacts - Aggregate all contacts from customers and leads
export async function GET() {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();

  try {
    // Fetch customers and leads
    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          contactTitle: true,
          country: true,
          state: true,
          city: true,
          customerType: true,
        },
      }),
      prisma.lead.findMany({
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          country: true,
          state: true,
          city: true,
          status: true,
        },
      }),
    ]);

    // Transform to unified contact format
    const contacts: Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      designation: string | null;
      company: string;
      country: string | null;
      state: string | null;
      city: string | null;
      source: 'customer' | 'lead';
      sourceId: string;
      tags: string[];
    }> = [];

    // Add contacts from customers
    customers.forEach((customer) => {
      if (customer.contactName) {
        contacts.push({
          id: `customer-${customer.id}`,
          name: customer.contactName,
          email: customer.contactEmail || null,
          phone: customer.contactPhone || null,
          designation: customer.contactTitle || null,
          company: customer.companyName,
          country: customer.country || null,
          state: customer.state || null,
          city: customer.city || null,
          source: 'customer',
          sourceId: customer.id,
          tags: [customer.customerType === 'domestic' ? 'Customer' : 'International Customer'],
        });
      }
    });

    // Add contacts from leads
    leads.forEach((lead) => {
      if (lead.contactName) {
        contacts.push({
          id: `lead-${lead.id}`,
          name: lead.contactName,
          email: lead.email || null,
          phone: lead.phone || null,
          designation: null,
          company: lead.companyName,
          country: lead.country || null,
          state: lead.state || null,
          city: lead.city || null,
          source: 'lead',
          sourceId: lead.id,
          tags: ['Lead', lead.status || 'New'],
        });
      }
    });

    // Remove duplicates based on email (if same email exists, prefer customer over lead)
    const uniqueContacts = contacts.reduce((acc, contact) => {
      if (!contact.email) {
        acc.push(contact);
        return acc;
      }

      const existing = acc.find((c) => c.email === contact.email);
      if (!existing) {
        acc.push(contact);
      } else if (contact.source === 'customer' && existing.source === 'lead') {
        // Replace lead contact with customer contact if email matches
        const index = acc.indexOf(existing);
        acc[index] = contact;
      }

      return acc;
    }, [] as typeof contacts);

    return NextResponse.json(uniqueContacts);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

