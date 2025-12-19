'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadHealthBadgeProps {
  score: number;
  warnings?: string[];
  className?: string;
  showIcon?: boolean;
}

export function LeadHealthBadge({ score, warnings = [], className, showIcon = true }: LeadHealthBadgeProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-3 w-3" />;
    if (score >= 60) return <AlertCircle className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 font-medium',
        getHealthColor(score),
        className,
      )}
      title={warnings.length > 0 ? warnings.join('; ') : undefined}
    >
      {showIcon && getHealthIcon(score)}
      <span>{getHealthLabel(score)}</span>
      <span className="text-xs opacity-75">({score})</span>
    </Badge>
  );
}

