'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DealsKanbanBoard } from '@/components/deals/kanban-board';
import { AddDealDialog } from '@/components/deals/add-deal-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Deal } from '@/types';

export default function DealsPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddDeal = (deal: Omit<Deal, 'id' | 'contact'>) => {
    // This is a placeholder for a secure backend call.
    console.log('Calling backend to create deal:', deal);
    toast({
      title: 'Deal Queued',
      description: `The deal "${deal.title}" is being created.`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Opportunity Pipeline
          </h1>
          <p className="text-muted-foreground">
            Visualize and manage your sales opportunities.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2" />
          Add New Deal
        </Button>
      </div>
      <div className="flex-grow overflow-x-auto">
        <DealsKanbanBoard />
      </div>
      <AddDealDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onDealAdded={handleAddDeal}
      />
    </div>
  );
}
