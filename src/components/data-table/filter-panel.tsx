'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
}

interface FilterPanelProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
  className?: string;
}

export function FilterPanel({ filters, values, onFilterChange, onClear, className = '' }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFiltersCount = Object.values(values).filter(v => v !== '' && v !== null && v !== undefined).length;

  const handleClearFilter = (key: string) => {
    onFilterChange(key, '');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filter Options</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
                Clear All
              </Button>
            )}
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filters.map((filter) => {
              const value = values[filter.key] || '';
              return (
                <div key={filter.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={filter.key} className="text-sm">
                      {filter.label}
                    </Label>
                    {value && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleClearFilter(filter.key)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {filter.type === 'text' && (
                    <Input
                      id={filter.key}
                      value={value}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      placeholder={`Filter by ${filter.label.toLowerCase()}`}
                      className="input-enhanced"
                    />
                  )}
                  {filter.type === 'select' && filter.options && (
                    <Select value={value} onValueChange={(val) => onFilterChange(filter.key, val)}>
                      <SelectTrigger id={filter.key}>
                        <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {filter.type === 'date' && (
                    <Input
                      id={filter.key}
                      type="date"
                      value={value}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      className="input-enhanced"
                    />
                  )}
                  {filter.type === 'number' && (
                    <Input
                      id={filter.key}
                      type="number"
                      value={value}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      placeholder={`Filter by ${filter.label.toLowerCase()}`}
                      className="input-enhanced"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

