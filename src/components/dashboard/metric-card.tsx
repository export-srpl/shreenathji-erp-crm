'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, description, className }: MetricCardProps) {
  const isPositive = change ? change.value >= 0 : null;
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR',
        maximumFractionDigits: 0 
      }).format(value)
    : value;

  return (
    <Card className={cn('card-metric', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="metric-value text-3xl font-bold tracking-tight mb-2">
              {formattedValue}
            </p>
            {change && (
              <div className={cn('metric-change', isPositive ? 'positive' : 'negative')}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {Math.abs(change.value).toFixed(1)}%
                </span>
                {change.label && (
                  <span className="text-muted-foreground ml-1">{change.label}</span>
                )}
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="ml-4 p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

