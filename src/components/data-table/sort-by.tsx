'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowUpDown } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
}

interface SortByProps {
  options: SortOption[];
  value: string;
  onSortChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function SortBy({ options, value, onSortChange, label = 'Sort By', className = '' }: SortByProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label htmlFor="sort-by" className="text-sm font-medium whitespace-nowrap">
        {label}
      </Label>
      <Select value={value} onValueChange={onSortChange}>
        <SelectTrigger id="sort-by" className="w-[180px]">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Select sort option" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

