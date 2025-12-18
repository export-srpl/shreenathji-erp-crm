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
}: {
  deal: Deal;
  onStageChange: (dealId: string, newStage: DealStage) => void;
}) => {
  const totalQuantity = deal.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Card className="mb-4 bg-card hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <p className="font-semibold text-card-foreground leading-tight pr-2">
            {deal.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
}: {
  stage: DealStage;
  deals: Deal[];
  onStageChange: (dealId: string, newStage: DealStage) => void;
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
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} />
        ))}
      </div>
    </div>
  );
};

export function DealsKanbanBoard() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals');
        if (!res.ok) throw new Error('Failed to fetch deals');
        const data = await res.json();
        setDeals(data);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load deals',
          description: 'Could not fetch deals from the server.',
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          deals={deals.filter((deal) => deal.stage === stage)}
          onStageChange={handleStageChange}
        />
      ))}
    </div>
  );
}
