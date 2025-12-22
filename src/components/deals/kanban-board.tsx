'use client';

import { useState, useEffect } from 'react';
import type { DealStage } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { AddDealDialog } from './add-deal-dialog';

const stages: DealStage[] = [
  'Prospecting',
  'Technical Discussion',
  'Quotation',
  'Negotiation',
  'Won',
  'Lost',
];

type Deal = {
  id: string;
  srplId?: string | null;
  title: string;
  stage: string;
  customer: {
    id: string;
    companyName: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
    };
  }>;
};

const DealCard = ({
  deal,
  onStageChange,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  onStageChange: (dealId: string, newStage: DealStage) => void;
  onEdit: (dealId: string) => void;
  onDelete: (dealId: string) => void;
}) => {
  const totalQuantity = deal.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Card className="mb-4 bg-card hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="pr-2">
            <p className="font-semibold text-card-foreground leading-tight">
              {deal.title}
            </p>
            {deal.srplId && (
              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                {deal.srplId}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(deal.id)}>
                Edit Deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-red-600">
                Delete Deal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stages
                .filter((s) => s !== deal.stage)
                .map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => onStageChange(deal.id, stage)}
                  >
                    Move to {stage}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground -mt-2">{deal.customer.companyName}</p>

        <div className="space-y-1">
          {deal.items.map((item, idx) => (
            <div key={idx} className="text-xs text-muted-foreground">
              {item.product.name}: {Number(item.quantity).toFixed(2)} MTS
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-sm font-semibold text-primary">
            Total: {totalQuantity.toFixed(2)} MTS
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({
  stage,
  deals,
  onStageChange,
  onEdit,
  onDelete,
}: {
  stage: DealStage;
  deals: Deal[];
  onStageChange: (dealId: string, newStage: DealStage) => void;
  onEdit: (dealId: string) => void;
  onDelete: (dealId: string) => void;
}) => {
  const stageConfig: Record<DealStage, { color: string }> = {
    Prospecting: { color: 'bg-gray-500' },
    'Technical Discussion': { color: 'bg-blue-500' },
    Quotation: { color: 'bg-purple-500' },
    Negotiation: { color: 'bg-orange-500' },
    Won: { color: 'bg-green-600' },
    Lost: { color: 'bg-red-600' },
  };

  return (
    <div className="w-full md:w-[320px] flex-shrink-0">
      <div className="p-4 rounded-t-lg bg-muted/60 border-b">
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${stageConfig[stage].color}`}
          ></span>
          <h2 className="text-lg font-semibold font-headline">{stage}</h2>
          <Badge variant="secondary" className="ml-auto">
            {deals.length}
          </Badge>
        </div>
      </div>
      <div className="p-2 h-full bg-muted/60 rounded-b-lg">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export function DealsKanbanBoard() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch deals`);
        }
        const data = await res.json();
        setDeals(data);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load deals',
          description: error instanceof Error ? error.message : 'Could not fetch deals from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeals();
  }, [toast]);

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) throw new Error('Failed to update deal');

      // Update local state
      setDeals((prev) =>
        prev.map((deal) => (deal.id === dealId ? { ...deal, stage: newStage } : deal))
      );

      toast({
        title: 'Deal Updated',
        description: `Deal moved to "${newStage}".`,
      });
    } catch (error) {
      console.error('Error updating deal stage:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update deal stage.',
      });
    }
  };

  const handleEdit = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      setDealToEdit({
        id: deal.id,
        title: deal.title,
        stage: deal.stage,
        customerId: deal.customer.id,
        items: deal.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          product: item.product,
        })),
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete deal');

      // Remove from local state
      setDeals((prev) => prev.filter((deal) => deal.id !== dealId));

      toast({
        title: 'Deal Deleted',
        description: 'The deal has been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete deal.',
      });
    }
  };

  const handleDealSaved = () => {
    setIsEditDialogOpen(false);
    setDealToEdit(null);
    // Refresh deals
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals');
        if (!res.ok) throw new Error('Failed to fetch deals');
        const data = await res.json();
        setDeals(data);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      }
    };
    fetchDeals();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-6">
        {stages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          deals={deals.filter((deal) => deal.stage === stage)}
          onStageChange={handleStageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        ))}
      </div>
      <AddDealDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onDealAdded={handleDealSaved}
        dealToEdit={dealToEdit || undefined}
      />
    </>
  );
}
