'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityTimelineProps = {
  entityType: 'lead' | 'deal' | 'customer' | 'product' | 'quote' | 'invoice' | 'sales_order' | 'proforma_invoice';
  entityId: string;
  className?: string;
};

type ActivityItem = {
  id: string;
  entityType: string;
  entityId: string;
  srplId?: string | null;
  module: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string | null;
  metadata?: string | null;
  performedById?: string | null;
  performedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
};

export function ActivityTimeline({ entityType, entityId, className }: ActivityTimelineProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(
          `/api/activity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&limit=50`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load activity timeline');
        }
        const data = await res.json();
        setItems(data.items || []);
      } catch (err: any) {
        console.error('Failed to load activity timeline', err);
        setError(err.message || 'Failed to load activity timeline');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [entityType, entityId]);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
        <Badge variant="outline" className="text-xs">
          {items.length} event{items.length === 1 ? '' : 's'}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading activity…</span>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No activity recorded yet.</p>
        ) : (
          <ScrollArea className="max-h-80 pr-2">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                      {index < items.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1 mb-1" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {formatAction(item.action)}
                        </span>
                        {item.srplId && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.srplId}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-foreground">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {item.performedBy && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {item.performedBy.name || item.performedBy.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function formatAction(action: string): string {
  switch (action) {
    case 'create':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'stage_change':
      return 'Stage Changed';
    case 'delete':
      return 'Deleted';
    default:
      return action.replace(/_/g, ' ');
  }
}


