import type { PrismaClient } from '@prisma/client';

export interface ScoringRule {
  field: string;
  weight: number;
  rules: Array<{
    condition: string;
    operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
    value: any;
    points: number;
  }>;
}

export interface ScoringConfig {
  criteria: ScoringRule[];
  temperatureThresholds?: {
    hot: number;
    warm: number;
    cold: number;
  };
}

const DEFAULT_TEMPERATURE_THRESHOLDS = {
  hot: 70,
  warm: 40,
  cold: 0,
};

/**
 * Calculate lead score based on configurable rules
 */
export async function calculateLeadScore(
  prisma: PrismaClient,
  leadId: string,
  config?: ScoringConfig | null
): Promise<{ score: number; temperature: string; reason?: string }> {
  // Get the lead with related data
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: true,
      quotes: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      stageAging: {
        orderBy: { enteredAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Get active scoring config if not provided
  if (!config) {
    const defaultConfig = await prisma.leadScoringConfig.findFirst({
      where: { isActive: true, isDefault: true },
    });
    if (defaultConfig) {
      config = JSON.parse(defaultConfig.rules) as ScoringConfig;
    } else {
      // Fallback to default scoring logic
      config = getDefaultScoringConfig();
    }
  }

  const thresholds = config.temperatureThresholds || DEFAULT_TEMPERATURE_THRESHOLDS;
  let totalScore = 0;
  const reasons: string[] = [];

  // Calculate days since creation
  const daysSinceCreation = Math.floor(
    (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate days since last activity
  const lastActivity = lead.lastActivityDate || lead.updatedAt;
  const daysSinceLastActivity = Math.floor(
    (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Evaluate each scoring criterion
  for (const criterion of config.criteria) {
    let criterionScore = 0;
    const fieldValue = getFieldValue(lead, criterion.field);

    for (const rule of criterion.rules) {
      if (evaluateRule(fieldValue, rule, lead, daysSinceCreation, daysSinceLastActivity)) {
        criterionScore = Math.max(criterionScore, rule.points);
      }
    }

    // Apply weight
    const weightedScore = criterionScore * (criterion.weight / 100);
    totalScore += weightedScore;

    if (criterionScore > 0) {
      reasons.push(`${criterion.field}: +${criterionScore.toFixed(0)}`);
    }
  }

  // Ensure score is between 0 and 100
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  // Determine temperature
  let temperature = 'Cold';
  if (totalScore >= thresholds.hot) {
    temperature = 'Hot';
  } else if (totalScore >= thresholds.warm) {
    temperature = 'Warm';
  }

  return {
    score: totalScore,
    temperature,
    reason: reasons.length > 0 ? reasons.join(', ') : undefined,
  };
}

/**
 * Get field value from lead object
 */
function getFieldValue(lead: any, field: string): any {
  const fieldMap: Record<string, any> = {
    leadAge: Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    daysSinceLastActivity: lead.lastActivityDate
      ? Math.floor((Date.now() - lead.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    hasOwner: !!lead.ownerId,
    hasEmail: !!lead.email,
    hasPhone: !!lead.phone,
    hasQuote: (lead.quotes?.length || 0) > 0,
    quoteCount: lead.quotes?.length || 0,
    monthlyRequirement: lead.monthlyRequirement,
    productInterest: lead.productInterest,
    country: lead.country,
    status: lead.status,
    source: lead.source,
    followUpDate: lead.followUpDate,
  };

  return fieldMap[field] ?? lead[field];
}

/**
 * Evaluate a scoring rule condition
 */
function evaluateRule(
  fieldValue: any,
  rule: ScoringRule['rules'][0],
  lead: any,
  daysSinceCreation: number,
  daysSinceLastActivity: number
): boolean {
  const { condition, operator, value } = rule;

  // Handle special conditions
  if (condition === 'leadAge') {
    fieldValue = daysSinceCreation;
  } else if (condition === 'daysSinceLastActivity') {
    fieldValue = daysSinceLastActivity;
  }

  switch (operator) {
    case 'equals':
      return fieldValue === value || String(fieldValue).toLowerCase() === String(value).toLowerCase();
    case 'gt':
      return Number(fieldValue) > Number(value);
    case 'gte':
      return Number(fieldValue) >= Number(value);
    case 'lt':
      return Number(fieldValue) < Number(value);
    case 'lte':
      return Number(fieldValue) <= Number(value);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return Number(fieldValue) >= Number(value[0]) && Number(fieldValue) <= Number(value[1]);
      }
      return false;
    default:
      return false;
  }
}

/**
 * Default scoring configuration if no admin config exists
 */
function getDefaultScoringConfig(): ScoringConfig {
  return {
    criteria: [
      {
        field: 'leadAge',
        weight: 15,
        rules: [
          { condition: 'leadAge', operator: 'lt', value: 7, points: 10 },
          { condition: 'leadAge', operator: 'between', value: [7, 30], points: 5 },
          { condition: 'leadAge', operator: 'gt', value: 30, points: 0 },
        ],
      },
      {
        field: 'daysSinceLastActivity',
        weight: 20,
        rules: [
          { condition: 'daysSinceLastActivity', operator: 'lt', value: 3, points: 15 },
          { condition: 'daysSinceLastActivity', operator: 'between', value: [3, 7], points: 10 },
          { condition: 'daysSinceLastActivity', operator: 'between', value: [7, 14], points: 5 },
          { condition: 'daysSinceLastActivity', operator: 'gt', value: 14, points: 0 },
        ],
      },
      {
        field: 'hasOwner',
        weight: 10,
        rules: [{ condition: 'hasOwner', operator: 'equals', value: true, points: 10 }],
      },
      {
        field: 'hasQuote',
        weight: 25,
        rules: [{ condition: 'hasQuote', operator: 'equals', value: true, points: 25 }],
      },
      {
        field: 'monthlyRequirement',
        weight: 20,
        rules: [
          { condition: 'monthlyRequirement', operator: 'contains', value: 'high', points: 15 },
          { condition: 'monthlyRequirement', operator: 'contains', value: 'medium', points: 10 },
          { condition: 'monthlyRequirement', operator: 'contains', value: 'low', points: 5 },
        ],
      },
      {
        field: 'hasEmail',
        weight: 5,
        rules: [{ condition: 'hasEmail', operator: 'equals', value: true, points: 5 }],
      },
      {
        field: 'hasPhone',
        weight: 5,
        rules: [{ condition: 'hasPhone', operator: 'equals', value: true, points: 5 }],
      },
    ],
    temperatureThresholds: DEFAULT_TEMPERATURE_THRESHOLDS,
  };
}

/**
 * Update lead score and temperature, and log to history
 */
export async function updateLeadScore(
  prisma: PrismaClient,
  leadId: string,
  config?: ScoringConfig | null
): Promise<void> {
  try {
    const result = await calculateLeadScore(prisma, leadId, config);

    // Update lead score and temperature
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: result.score,
        temperature: result.temperature,
      },
    });

    // Log to history
    await prisma.leadScoreHistory.create({
      data: {
        leadId,
        score: result.score,
        temperature: result.temperature,
        reason: result.reason,
      },
    });
  } catch (error) {
    // Best-effort scoring - don't block workflow
    console.error('Failed to update lead score:', error);
  }
}

