'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import type { Deal, DealStage } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const DealCard = ({
  deal,
  onStageChange,
}: {
  deal: Deal;
  onStageChange: (dealId: string, newStage: DealStage) => void;
}) => {
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

        <p className="text-sm text-muted-foreground -mt-2">{deal.company}</p>

        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-bold text-primary">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              notation: 'compact',
            }).format(deal.value)}
          </span>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={deal.contact.avatarUrl}
                alt={deal.contact.name}
                data-ai-hint="person portrait"
              />
              <AvatarFallback>
                {deal.contact.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
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
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'deals'));
  }, [firestore, user]);

  const { data: deals, isLoading: areDealsLoading } = useCollection<Deal>(dealsQuery);

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    if (!firestore) return;
    
    // This is a placeholder for a secure backend call.
    console.log(`Calling backend to update deal ${dealId} to stage ${newStage}`);
    
    const dealRef = doc(firestore, 'deals', dealId);
    try {
        await updateDoc(dealRef, { stage: newStage });
        toast({
            title: 'Deal Updated',
            description: `Deal moved to "${newStage}".`,
        });
    } catch (error) {
        console.error("Error updating deal stage: ", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update deal stage.',
        });
    }
  };

  const isLoading = isUserLoading || areDealsLoading;

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
          deals={deals?.filter((deal) => deal.stage === stage) || []}
          onStageChange={handleStageChange}
        />
      ))}
    </div>
  );
}
