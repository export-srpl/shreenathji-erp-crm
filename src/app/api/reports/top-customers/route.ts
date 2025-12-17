import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

/**
 * GET /api/reports/top-customers
 * Returns top N customers by total invoice amount
 * Query params: limit (default: 10)
 */
export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    // Get all invoices with customer and items
    const prisma = await getPrismaClient();
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        items: true,
      },
    });

    // Calculate total per customer
    const customerTotals: Record<string, {
      customerId: string;
      customerName: string;
      invoiceCount: number;
      totalAmount: number;
    }> = {};

    invoices.forEach(invoice => {
      const customerId = invoice.customerId;
      if (!customerTotals[customerId]) {
        customerTotals[customerId] = {
          customerId,
          customerName: invoice.customer.companyName,
          invoiceCount: 0,
          totalAmount: 0,
        };
      }

      customerTotals[customerId].invoiceCount++;
      const invoiceTotal = invoice.items.reduce((sum, item) => {
        const price = Number(item.unitPrice) || 0;
        const qty = item.quantity || 0;
        const discount = (item.discountPct || 0) / 100;
        return sum + (price * qty * (1 - discount));
      }, 0);
      customerTotals[customerId].totalAmount += invoiceTotal;
    });

    // Convert to array, sort by total amount, and limit
    const result = Object.values(customerTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate top customers report:', error);
    return NextResponse.json({ error: 'Failed to generate top customers report' }, { status: 500 });
  }
}

