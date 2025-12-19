'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Users, Package, ShoppingCart, Receipt, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  srplId?: string | null;
  type: 'lead' | 'deal' | 'customer' | 'product' | 'quote' | 'invoice' | 'sales_order' | 'proforma_invoice';
  title: string;
  subtitle?: string;
  description?: string;
  relevanceScore: number;
}

interface QuickAction {
  label: string;
  action: string;
  icon?: string;
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ICONS: Record<string, any> = {
  lead: FileText,
  deal: ShoppingCart,
  customer: Users,
  product: Package,
  quote: FileText,
  invoice: Receipt,
  sales_order: ShoppingCart,
  proforma_invoice: Receipt,
};

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  deal: 'Deal',
  customer: 'Customer',
  product: 'Product',
  quote: 'Quote',
  invoice: 'Invoice',
  sales_order: 'Sales Order',
  proforma_invoice: 'Proforma Invoice',
};

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setQuickActions([]);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setQuickActions([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setQuickActions(data.quickActions || []);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = (result: SearchResult | QuickAction, isAction: boolean = false) => {
    if (isAction) {
      const action = result as QuickAction;
      handleAction(action.action);
    } else {
      const searchResult = result as SearchResult;
      navigateToResult(searchResult);
    }
  };

  const navigateToResult = (result: SearchResult) => {
    let path = '';
    switch (result.type) {
      case 'lead':
        path = `/sales/leads/add?leadId=${result.id}`;
        break;
      case 'deal':
        path = `/sales/deals/${result.id}`;
        break;
      case 'customer':
        path = `/customers/add?customerId=${result.id}`;
        break;
      case 'product':
        path = `/inventory/products?productId=${result.id}`;
        break;
      case 'quote':
        path = `/sales/quote/${result.id}`;
        break;
      case 'invoice':
        path = `/sales/create-invoice/${result.id}`;
        break;
      default:
        return;
    }
    router.push(path);
    onOpenChange(false);
  };

  const handleAction = (action: string) => {
    const [type, entity, ...rest] = action.split(':');
    if (type === 'create') {
      let path = '';
      switch (entity) {
        case 'lead':
          path = '/sales/leads/add';
          break;
        case 'deal':
          path = '/sales/deals/add';
          break;
        case 'customer':
          path = '/customers/add';
          break;
        case 'product':
          path = '/inventory/products/add';
          break;
        default:
          return;
      }
      router.push(path);
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const totalItems = results.length + quickActions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else {
        handleSelect(quickActions[selectedIndex - results.length], true);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const allItems = [...results, ...quickActions];
  const hasResults = results.length > 0 || quickActions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <Command onKeyDown={handleKeyDown} className="rounded-lg border-none">
          <CommandInput
            ref={inputRef}
            placeholder="Search leads, customers, products, deals, quotes, invoices..."
            value={query}
            onValueChange={setQuery}
            className="h-12"
          />
          <CommandList className="max-h-[400px]">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && query.length >= 2 && !hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {!isLoading && results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result, index) => {
                  const Icon = TYPE_ICONS[result.type] || FileText;
                  const isSelected = index === selectedIndex;
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className={cn('cursor-pointer', isSelected && 'bg-accent')}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.title}</span>
                          {result.srplId && (
                            <Badge variant="outline" className="text-xs">
                              {result.srplId}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {TYPE_LABELS[result.type]}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                        )}
                        {result.description && (
                          <div className="text-xs text-muted-foreground">{result.description}</div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!isLoading && quickActions.length > 0 && (
              <CommandGroup heading="Quick Actions">
                {quickActions.map((action, index) => {
                  const isSelected = results.length + index === selectedIndex;
                  return (
                    <CommandItem
                      key={action.action}
                      value={action.action}
                      onSelect={() => handleSelect(action, true)}
                      className={cn('cursor-pointer', isSelected && 'bg-accent')}
                    >
                      <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{action.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!isLoading && query.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search...</p>
                <p className="text-xs mt-2">Press Esc to close</p>
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

