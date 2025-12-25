'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flame, Droplet, Snowflake } from 'lucide-react';

type Temperature = 'Hot' | 'Warm' | 'Cold' | null | undefined;

interface TemperatureBadgeProps {
  temperature: Temperature;
  score?: number | null;
  showScore?: boolean;
  className?: string;
}

const temperatureConfig: Record<'Hot' | 'Warm' | 'Cold', { 
  color: string; 
  bgColor: string; 
  icon: React.ReactNode;
  label: string;
}> = {
  Hot: {
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    icon: <Flame className="h-3 w-3" />,
    label: 'Hot',
  },
  Warm: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
    icon: <Droplet className="h-3 w-3" />,
    label: 'Warm',
  },
  Cold: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
    icon: <Snowflake className="h-3 w-3" />,
    label: 'Cold',
  },
};

export function TemperatureBadge({ temperature, score, showScore = false, className }: TemperatureBadgeProps) {
  if (!temperature) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        {score !== null && score !== undefined ? `${score}` : '—'}
      </div>
    );
  }

  const config = temperatureConfig[temperature];
  if (!config) return null;

  return (
    <Badge
      className={cn(
        'font-medium border flex items-center gap-1.5',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
      {showScore && score !== null && score !== undefined && (
        <span className="ml-1 font-semibold">{score}</span>
      )}
    </Badge>
  );
}

