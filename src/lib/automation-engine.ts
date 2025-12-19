import type { PrismaClient } from '@prisma/client';

type TriggerType = 'on_create' | 'on_update' | 'on_stage_change';

interface RunAutomationContext {
  prisma: PrismaClient;
  module: 'LEAD' | 'DEAL';
  triggerType: TriggerType;
  entityType: 'lead' | 'deal';
  entityId: string;
  current: Record<string, any>;
  previous?: Record<string, any> | null;
  performedById?: string | null;
}

type SimpleCondition =
  | {
      type: 'field_compare';
      field: string;
      op: 'equals' | 'not_equals' | 'in' | 'not_in';
      value: any;
    }
  | {
      type: 'always';
    };

type AutomationActionConfig =
  | {
      type: 'update_field';
      field: string;
      value: any;
    }
  | {
    type: 'create_follow_up';
    // For now we just log; can be extended later.
    dueInDays?: number;
    note?: string;
  }
  | {
      type: 'assign_owner';
      userId: string;
    }
  | {
      type: 'send_notification';
      channel: 'email' | 'in_app';
      template: string;
    };

interface ParsedRule {
  id: string;
  name: string;
  condition: SimpleCondition | null;
  actions: AutomationActionConfig[];
}

/**
 * Core automation runner. Fetches matching rules and applies side effects.
 * Best-effort: failures are logged but do not block the main flow.
 */
export async function runAutomationRules({
  prisma,
  module,
  triggerType,
  entityType,
  entityId,
  current,
  previous,
  performedById,
}: RunAutomationContext): Promise<void> {
  try {
    const p: any = prisma;

    const rawRules = await p.automationRule.findMany({
      where: {
        module,
        triggerType,
        isActive: true,
      },
    });

    if (!rawRules.length) return;

    const rules: ParsedRule[] = rawRules.map((r: any) => ({
      id: r.id,
      name: r.name,
      condition: r.condition ? safeParseJson<SimpleCondition>(r.condition) : null,
      actions: safeParseJson<AutomationActionConfig[]>(r.actions) ?? [],
    }));

    for (const rule of rules) {
      const shouldFire = evaluateCondition(rule.condition, current, previous);
      if (!shouldFire) continue;

      await executeActions({
        prisma,
        rule,
        module,
        entityType,
        entityId,
        current,
        previous,
        performedById,
      });
    }
  } catch (error) {
    console.error('Automation engine failed', { error, module, triggerType, entityType, entityId });
  }
}

function evaluateCondition(
  condition: SimpleCondition | null,
  current: Record<string, any>,
  _previous?: Record<string, any> | null,
): boolean {
  if (!condition) return true;
  if (condition.type === 'always') return true;

  if (condition.type === 'field_compare') {
    const fieldValue = getNested(current, condition.field);
    switch (condition.op) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  return false;
}

async function executeActions(opts: {
  prisma: PrismaClient;
  rule: ParsedRule;
  module: 'LEAD' | 'DEAL';
  entityType: 'lead' | 'deal';
  entityId: string;
  current: Record<string, any>;
  previous?: Record<string, any> | null;
  performedById?: string | null;
}): Promise<void> {
  const { prisma, rule, module, entityType, entityId } = opts;
  const p: any = prisma;

  for (const action of rule.actions) {
    try {
      switch (action.type) {
        case 'update_field': {
          const data: any = { [action.field]: action.value };
          if (entityType === 'lead') {
            await p.lead.update({ where: { id: entityId }, data });
          } else if (entityType === 'deal') {
            await p.deal.update({ where: { id: entityId }, data });
          }
          break;
        }
        case 'assign_owner': {
          if (entityType === 'lead') {
            await p.lead.update({ where: { id: entityId }, data: { ownerId: action.userId } });
          } else if (entityType === 'deal') {
            await p.deal.update({ where: { id: entityId }, data: { customerId: action.userId } });
          }
          break;
        }
        case 'create_follow_up': {
          // For now we just log; can be wired into a Task/Activity system later.
          console.info('Automation follow-up placeholder', {
            ruleId: rule.id,
            module,
            entityType,
            entityId,
            action,
          });
          break;
        }
        case 'send_notification': {
          console.info('Automation notification placeholder', {
            ruleId: rule.id,
            module,
            entityType,
            entityId,
            action,
          });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to execute automation action', {
        error,
        ruleId: rule.id,
        module,
        entityType,
        entityId,
        action,
      });
    }
  }
}

function getNested(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


