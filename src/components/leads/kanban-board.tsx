'use client';

import type { Lead } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Phone, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Disqualified' | 'Converted';

const stages: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Converted', 'Disqualified'];

const LeadCard = ({ lead, onStatusChange }: { lead: Lead, onStatusChange: (leadId: string, newStatus: LeadStage) => void }) => {
  return (
    <Card className="mb-4 bg-card hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
            <p className="font-semibold text-card-foreground leading-tight pr-2">{lead.companyName}</p>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {stages.filter(s => s !== lead.status).map(stage => (
                         <DropdownMenuItem key={stage} onClick={() => onStatusChange(lead.id, stage)}>
                            Move to {stage}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground -mt-2">{lead.contactName}</p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Mail className="h-3 w-3" />
            <span>{lead.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
            <Badge variant="secondary" className="text-xs">{lead.leadSource}</Badge>
            <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                <AvatarFallback>{lead.assignedSalesperson.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({ stage, leads, onStatusChange }: { stage: LeadStage; leads: Lead[], onStatusChange: (leadId: string, newStatus: LeadStage) => void }) => {
  const stageConfig: Record<LeadStage, { color: string }> = {
    'New': { color: 'bg-blue-500' },
    'Contacted': { color: 'bg-yellow-500' },
    'Qualified': { color: 'bg-purple-500' },
    'Converted': { color: 'bg-green-600' },
    'Disqualified': { color: 'bg-red-600' }
  };
  
  return (
    <div className="w-full md:w-[320px] flex-shrink-0">
      <div className="p-4 rounded-t-lg bg-muted/60 border-b">
        <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${stageConfig[stage].color}`}></span>
            <h2 className="text-lg font-semibold font-headline">{stage}</h2>
            <Badge variant="secondary" className="ml-auto">{leads.length}</Badge>
        </div>
      </div>
      <div className="p-2 h-full bg-muted/60 rounded-b-lg">
          {leads.map(lead => <LeadCard key={lead.id} lead={lead} onStatusChange={onStatusChange} />)}
      </div>
    </div>
  );
};

export function LeadsKanbanBoard() {
  const { toast } = useToast();
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/leads');
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        setLeads(data);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Failed to load leads',
          description: 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [toast]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStage) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update lead status');
      }

      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead,
        ),
      );

      toast({
        title: 'Lead Status Updated',
        description: `Lead moved to "${newStatus}".`,
      });
    } catch (error) {
      console.error("Error updating lead status: ", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update lead status.',
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
        {stages.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={leads?.filter(lead => lead.status === stage) || []}
            onStatusChange={handleStatusChange}
          />
        ))}
    </div>
  );
}
