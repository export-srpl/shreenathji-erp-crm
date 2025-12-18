'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'lead' | 'customer' | 'deal' | 'quote' | 'invoice' | 'product';
  id: string;
  title: string;
  subtitle: string;
  metadata: Record<string, any>;
  url: string;
}

export function UniversalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    const labels: Record<SearchResult['type'], string> = {
      lead: 'Lead',
      customer: 'Customer',
      deal: 'Deal',
      quote: 'Quote',
      invoice: 'Invoice',
      product: 'Product',
    };
    return labels[type];
  };

  const getTypeColor = (type: SearchResult['type']) => {
    const colors: Record<SearchResult['type'], string> = {
      lead: 'bg-blue-100 text-blue-700 border-blue-200',
      customer: 'bg-green-100 text-green-700 border-green-200',
      deal: 'bg-purple-100 text-purple-700 border-purple-200',
      quote: 'bg-orange-100 text-orange-700 border-orange-200',
      invoice: 'bg-teal-100 text-teal-700 border-teal-200',
      product: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[type];
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search across platform...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search leads, customers, deals, quotes, invoices, products..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
          )}
          {!isLoading && results.length > 0 && (
            <>
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-start gap-3 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn('text-xs', getTypeColor(result.type))}>
                          {getTypeLabel(result.type)}
                        </Badge>
                        <span className="font-medium truncate">{result.title}</span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                      {Object.keys(result.metadata).length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {Object.entries(result.metadata).map(([key, value]) => (
                            <span key={key} className="text-xs text-muted-foreground">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

