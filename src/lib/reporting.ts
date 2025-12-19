import type { PrismaClient } from '@prisma/client';

export interface WeightedPipelineData {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  byStage: Array<{
    stageId: string;
    stageName: string;
    stageType: string;
    probability: number;
    dealCount: number;
    totalValue: number;
    weightedValue: number;
  }>;
}

export interface RevenueProjection {
  period: string; // 'YYYY-MM' or 'YYYY-QX'
  projectedRevenue: number;
  confidence: 'high' | 'medium' | 'low';
  basedOn: {
    weightedPipeline: number;
    historicalAverage: number;
    trendFactor: number;
  };
}

export interface WinLossAnalysis {
  totalWon: number;
  totalLost: number;
  winRate: number;
  totalWonValue: number;
  totalLostValue: number;
  avgWonDealSize: number;
  avgLostDealSize: number;
  byStage: Array<{
    stageName: string;
    won: number;
    lost: number;
    winRate: number;
  }>;
  byReason?: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface SalesCycleMetrics {
  avgCycleDuration: number; // days
  medianCycleDuration: number;
  byStage: Array<{
    stageName: string;
    avgDuration: number;
  }>;
  byDealSize: Array<{
    range: string;
    avgDuration: number;
  }>;
}

export interface SalespersonPerformance {
  salespersonId: string;
  salespersonName: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  totalRevenue: number;
  avgDealSize: number;
  avgCycleDuration: number;
  weightedPipelineValue: number;
  quotaAttainment?: number;
}

/**
 * Calculate weighted pipeline value based on stage probabilities
 */
export async function calculateWeightedPipeline(
  prisma: PrismaClient,
  filters: {
    pipelineId?: string;
    salesRepId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<WeightedPipelineData> {
  const { pipelineId, salesRepId, startDate, endDate } = filters;

  // Get all deals with their stages
  const deals = await prisma.deal.findMany({
    where: {
      ...(pipelineId ? { pipelineId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      items: {
        include: {
          product: {
            select: { unitPrice: true },
          },
        },
      },
      pipeline: {
        include: {
          stages: true,
        },
      },
    },
  });

  // Get stage probabilities from pipeline stages
  const stageProbabilities = new Map<string, number>();
  const stageNames = new Map<string, { name: string; type: string }>();

  for (const deal of deals) {
    if (deal.pipeline && deal.stageId) {
      const stage = deal.pipeline.stages.find((s) => s.id === deal.stageId);
      if (stage) {
        // Default probabilities based on stage type
        let probability = 0;
        if (stage.stageType === 'won') probability = 100;
        else if (stage.stageType === 'lost') probability = 0;
        else {
          // Estimate probability based on stage position (earlier = lower)
          const stageIndex = deal.pipeline.stages.findIndex((s) => s.id === stage.id);
          const totalStages = deal.pipeline.stages.length;
          probability = Math.round(((stageIndex + 1) / totalStages) * 100);
        }

        // Use stage probability if available, otherwise use default
        probability = stage.probability || probability;
        stageProbabilities.set(deal.stageId, probability);
        stageNames.set(deal.stageId, { name: stage.name, type: stage.stageType });
      }
    }
  }

  // Calculate deal values
  const dealValues = deals.map((deal) => {
    const totalValue = deal.items.reduce((sum, item) => {
      const price = Number(item.product.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);

    const stageId = deal.stageId || '';
    const probability = stageProbabilities.get(stageId) || 0;
    const weightedValue = totalValue * (probability / 100);

    return {
      dealId: deal.id,
      stageId,
      totalValue,
      weightedValue,
      probability,
    };
  });

  // Group by stage
  const byStageMap = new Map<string, { deals: number; totalValue: number; weightedValue: number }>();

  for (const dealValue of dealValues) {
    const existing = byStageMap.get(dealValue.stageId) || { deals: 0, totalValue: 0, weightedValue: 0 };
    byStageMap.set(dealValue.stageId, {
      deals: existing.deals + 1,
      totalValue: existing.totalValue + dealValue.totalValue,
      weightedValue: existing.weightedValue + dealValue.weightedValue,
    });
  }

  const byStage = Array.from(byStageMap.entries()).map(([stageId, data]) => {
    const stageInfo = stageNames.get(stageId) || { name: 'Unknown', type: 'open' };
    const probability = stageProbabilities.get(stageId) || 0;
    return {
      stageId,
      stageName: stageInfo.name,
      stageType: stageInfo.type,
      probability,
      dealCount: data.deals,
      totalValue: data.totalValue,
      weightedValue: data.weightedValue,
    };
  });

  const totalValue = dealValues.reduce((sum, d) => sum + d.totalValue, 0);
  const weightedValue = dealValues.reduce((sum, d) => sum + d.weightedValue, 0);

  return {
    totalDeals: deals.length,
    totalValue,
    weightedValue,
    byStage,
  };
}

/**
 * Calculate revenue projections based on weighted pipeline and historical data
 */
export async function calculateRevenueProjection(
  prisma: PrismaClient,
  filters: {
    months?: number;
    pipelineId?: string;
  } = {},
): Promise<RevenueProjection[]> {
  const { months = 3, pipelineId } = filters;

  // Get weighted pipeline
  const weightedPipeline = await calculateWeightedPipeline(prisma, { pipelineId });

  // Get historical revenue (last 6 months)
  const now = new Date();
  const historicalStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const historicalInvoices = await prisma.invoice.findMany({
    where: {
      issueDate: { gte: historicalStart },
    },
    include: {
      items: true,
    },
  });

  // Calculate monthly averages
  const monthlyRevenue: Record<string, number> = {};
  for (const invoice of historicalInvoices) {
    const month = `${invoice.issueDate.getFullYear()}-${String(invoice.issueDate.getMonth() + 1).padStart(2, '0')}`;
    const total = invoice.items.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = item.quantity;
      const discount = (item.discountPct || 0) / 100;
      return sum + price * qty * (1 - discount);
    }, 0);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + total;
  }

  const monthlyValues = Object.values(monthlyRevenue);
  const historicalAverage = monthlyValues.length > 0 ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length : 0;

  // Calculate trend (simple linear regression on last 3 months)
  const recentMonths = Object.entries(monthlyRevenue)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-3);
  let trendFactor = 1.0;
  if (recentMonths.length >= 2) {
    const first = recentMonths[0][1];
    const last = recentMonths[recentMonths.length - 1][1];
    if (first > 0) {
      trendFactor = last / first;
    }
  }

  // Generate projections for next N months
  const projections: RevenueProjection[] = [];
  for (let i = 0; i < months; i++) {
    const projectionDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const period = `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`;

    // Projected revenue = weighted pipeline value + historical average * trend
    const projectedRevenue = weightedPipeline.weightedValue * 0.3 + historicalAverage * trendFactor * 0.7;

    // Confidence based on data quality
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (historicalInvoices.length > 20 && weightedPipeline.totalDeals > 10) confidence = 'high';
    else if (historicalInvoices.length < 5 || weightedPipeline.totalDeals < 3) confidence = 'low';

    projections.push({
      period,
      projectedRevenue: Math.max(0, projectedRevenue),
      confidence,
      basedOn: {
        weightedPipeline: weightedPipeline.weightedValue,
        historicalAverage,
        trendFactor,
      },
    });
  }

  return projections;
}

/**
 * Analyze win-loss data
 */
export async function analyzeWinLoss(
  prisma: PrismaClient,
  filters: {
    startDate?: Date;
    endDate?: Date;
    salesRepId?: string;
    pipelineId?: string;
  } = {},
): Promise<WinLossAnalysis> {
  const { startDate, endDate, salesRepId, pipelineId } = filters;

  // Get all deals with their stages
  const deals = await prisma.deal.findMany({
    where: {
      ...(pipelineId ? { pipelineId } : {}),
      ...(startDate || endDate
        ? {
            updatedAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      items: {
        include: {
          product: {
            select: { unitPrice: true },
          },
        },
      },
      pipeline: {
        include: {
          stages: true,
        },
      },
    },
  });

  // Calculate deal values
  const dealData = deals.map((deal) => {
    const value = deal.items.reduce((sum, item) => {
      const price = Number(item.product.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);

    const stage = deal.pipeline?.stages.find((s) => s.id === deal.stageId);
    const stageType = stage?.stageType || 'open';

    return {
      dealId: deal.id,
      stageName: stage?.name || deal.stage,
      stageType,
      value,
    };
  });

  const won = dealData.filter((d) => d.stageType === 'won');
  const lost = dealData.filter((d) => d.stageType === 'lost');

  const totalWon = won.length;
  const totalLost = lost.length;
  const total = totalWon + totalLost;
  const winRate = total > 0 ? (totalWon / total) * 100 : 0;

  const totalWonValue = won.reduce((sum, d) => sum + d.value, 0);
  const totalLostValue = lost.reduce((sum, d) => sum + d.value, 0);
  const avgWonDealSize = totalWon > 0 ? totalWonValue / totalWon : 0;
  const avgLostDealSize = totalLost > 0 ? totalLostValue / totalLost : 0;

  // Group by stage
  const byStageMap = new Map<string, { won: number; lost: number }>();
  for (const deal of dealData) {
    if (deal.stageType === 'won' || deal.stageType === 'lost') {
      const existing = byStageMap.get(deal.stageName) || { won: 0, lost: 0 };
      if (deal.stageType === 'won') existing.won++;
      else existing.lost++;
      byStageMap.set(deal.stageName, existing);
    }
  }

  const byStage = Array.from(byStageMap.entries()).map(([stageName, data]) => {
    const total = data.won + data.lost;
    return {
      stageName,
      won: data.won,
      lost: data.lost,
      winRate: total > 0 ? (data.won / total) * 100 : 0,
    };
  });

  return {
    totalWon,
    totalLost,
    winRate,
    totalWonValue,
    totalLostValue,
    avgWonDealSize,
    avgLostDealSize,
    byStage,
  };
}

/**
 * Calculate sales cycle duration metrics
 */
export async function calculateSalesCycleMetrics(
  prisma: PrismaClient,
  filters: {
    startDate?: Date;
    endDate?: Date;
    salesRepId?: string;
  } = {},
): Promise<SalesCycleMetrics> {
  const { startDate, endDate, salesRepId } = filters;

  // Get won deals with creation and close dates
  const wonDeals = await prisma.deal.findMany({
    where: {
      ...(startDate || endDate
        ? {
            updatedAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      pipeline: {
        include: {
          stages: true,
        },
      },
    },
  });

  // Filter to won deals only
  const deals = wonDeals.filter((deal) => {
    const stage = deal.pipeline?.stages.find((s) => s.id === deal.stageId);
    return stage?.stageType === 'won';
  });

  if (deals.length === 0) {
    return {
      avgCycleDuration: 0,
      medianCycleDuration: 0,
      byStage: [],
      byDealSize: [],
    };
  }

  // Calculate cycle duration (created to closed)
  const durations = deals.map((deal) => {
    const created = deal.createdAt;
    const closed = deal.updatedAt; // Approximate close date
    return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  });

  durations.sort((a, b) => a - b);

  const avgCycleDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const medianCycleDuration = durations[Math.floor(durations.length / 2)] || 0;

  // TODO: Calculate by stage and by deal size if needed
  const byStage: Array<{ stageName: string; avgDuration: number }> = [];
  const byDealSize: Array<{ range: string; avgDuration: number }> = [];

  return {
    avgCycleDuration: Math.round(avgCycleDuration),
    medianCycleDuration,
    byStage,
    byDealSize,
  };
}

/**
 * Calculate salesperson performance metrics
 */
export async function calculateSalespersonPerformance(
  prisma: PrismaClient,
  filters: {
    startDate?: Date;
    endDate?: Date;
    salesRepIds?: string[];
  } = {},
): Promise<SalespersonPerformance[]> {
  const { startDate, endDate, salesRepIds } = filters;

  // Get all users who are sales reps
  const salesReps = await prisma.user.findMany({
    where: {
      role: { in: ['sales', 'admin'] },
      ...(salesRepIds ? { id: { in: salesRepIds } } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  const performance: SalespersonPerformance[] = [];

  for (const rep of salesReps) {
    // Get deals for this sales rep
    // Note: Deal doesn't have ownerId, so we'll use quotes/sales orders as proxy
    const quotes = await prisma.quote.findMany({
      where: {
        ...(rep.id ? { salesRepId: rep.id } : {}),
        ...(startDate || endDate
          ? {
              issueDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: { unitPrice: true },
            },
          },
        },
      },
    });

    // Calculate metrics
    const totalDeals = quotes.length;
    // For now, we'll use quotes as proxy for deals
    // In a real system, you'd track deal ownership separately

    const totalRevenue = quotes.reduce((sum, quote) => {
      return (
        sum +
        quote.items.reduce((itemSum, item) => {
          const price = Number(item.product.unitPrice) || 0;
          const qty = item.quantity;
          const discount = (item.discountPct || 0) / 100;
          return itemSum + price * qty * (1 - discount);
        }, 0)
      );
    }, 0);

    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    // Get weighted pipeline (simplified)
    const weightedPipeline = await calculateWeightedPipeline(prisma, {
      salesRepId: rep.id,
      startDate,
      endDate,
    });

    performance.push({
      salespersonId: rep.id,
      salespersonName: rep.name || rep.email || 'Unknown',
      totalDeals,
      wonDeals: 0, // TODO: Track won deals
      lostDeals: 0, // TODO: Track lost deals
      winRate: 0,
      totalRevenue,
      avgDealSize,
      avgCycleDuration: 0, // TODO: Calculate from actual deals
      weightedPipelineValue: weightedPipeline.weightedValue,
    });
  }

  return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

