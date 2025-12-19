'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { CommandBar } from './command-bar';
import { cn } from '@/lib/utils';

interface CommandBarTriggerProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function CommandBarTrigger({ className, variant = 'outline' }: CommandBarTriggerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant={variant}
        className={cn('relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-96', className)}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandBar open={open} onOpenChange={setOpen} />
    </>
  );
}

