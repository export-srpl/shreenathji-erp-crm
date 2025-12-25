import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/reports/win-loss-analytics
 * Returns win/loss analytics with breakdown by various dimensions
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - module: 'LEAD' | 'DEAL' (optional, default: both)
 *   - groupBy: 'reason' | 'product' | 'customerType' | 'region' | 'salesPerson' | 'source'
 */
export async function GET(req: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const module = searchParams.get('module'); // 'LEAD' | 'DEAL'
    const groupBy = searchParams.get('groupBy') || 'reason';

    const prisma = await getPrismaClient();

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.wonLostAt = { gte: startDate, lte: endDate };
    }

    const results: any = {
      summary: {
        total: 0,
        won: 0,
        lost: 0,
        disqualified: 0,
      },
      breakdown: {},
    };

    // Analyze Leads
    if (!module || module === 'LEAD') {
      const leadWhere: any = {
        ...dateFilter,
        wonLostAt: { not: null },
      };

      const leads = await prisma.lead.findMany({
        where: leadWhere,
        include: {
          winLossReason: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      leads.forEach((lead) => {
        const status = lead.status?.toLowerCase() || '';
        if (status === 'won' || status === 'converted') {
          results.summary.won++;
          results.summary.total++;
        } else if (status === 'lost') {
          results.summary.lost++;
          results.summary.total++;
        } else if (status === 'disqualified') {
          results.summary.disqualified++;
          results.summary.total++;
        }

        // Group by selected dimension
        let key = 'Unknown';
        if (groupBy === 'reason' && lead.winLossReason) {
          key = lead.winLossReason.name;
        } else if (groupBy === 'customerType') {
          key = lead.country === 'India' ? 'Domestic' : 'Export';
        } else if (groupBy === 'region') {
          key = lead.country || 'Unknown';
        } else if (groupBy === 'salesPerson' && lead.owner) {
          key = lead.owner.name || lead.owner.email || 'Unassigned';
        } else if (groupBy === 'source') {
          key = lead.source || 'Unknown';
        }

        if (!results.breakdown[key]) {
          results.breakdown[key] = { won: 0, lost: 0, disqualified: 0, total: 0 };
        }

        const breakdownKey = status === 'won' || status === 'converted' ? 'won' : status;
        if (breakdownKey && ['won', 'lost', 'disqualified'].includes(breakdownKey)) {
          results.breakdown[key][breakdownKey]++;
          results.breakdown[key].total++;
        }
      });
    }

    // Analyze Deals
    if (!module || module === 'DEAL') {
      const dealWhere: any = {
        ...dateFilter,
        wonLostAt: { not: null },
      };

      const deals = await prisma.deal.findMany({
        where: dealWhere,
        include: {
          winLossReason: true,
          customer: {
            select: {
              customerType: true,
              country: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      deals.forEach((deal) => {
        const stage = deal.stage?.toLowerCase() || '';
        if (stage === 'won') {
          results.summary.won++;
          results.summary.total++;
        } else if (stage === 'lost') {
          results.summary.lost++;
          results.summary.total++;
        }

        // Group by selected dimension
        let key = 'Unknown';
        if (groupBy === 'reason' && deal.winLossReason) {
          key = deal.winLossReason.name;
        } else if (groupBy === 'customerType') {
          key = deal.customer.customerType === 'domestic' ? 'Domestic' : 'Export';
        } else if (groupBy === 'region') {
          key = deal.customer.country || 'Unknown';
        } else if (groupBy === 'product' && deal.items.length > 0) {
          // Use first product (deals typically have one primary product)
          key = deal.items[0].product.name;
        }

        if (!results.breakdown[key]) {
          results.breakdown[key] = { won: 0, lost: 0, disqualified: 0, total: 0 };
        }

        if (stage === 'won' || stage === 'lost') {
          results.breakdown[key][stage]++;
          results.breakdown[key].total++;
        }
      });
    }

    // Convert breakdown object to array for easier frontend consumption
    const breakdownArray = Object.entries(results.breakdown).map(([key, value]: [string, any]) => ({
      key,
      ...value,
      winRate: value.total > 0 ? ((value.won / value.total) * 100).toFixed(1) : '0.0',
    }));

    // Sort by total descending
    breakdownArray.sort((a, b) => b.total - a.total);

    return NextResponse.json({
      summary: results.summary,
      breakdown: breakdownArray,
      groupBy,
      module: module || 'both',
    });
  } catch (error) {
    console.error('Failed to generate win/loss analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate win/loss analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

