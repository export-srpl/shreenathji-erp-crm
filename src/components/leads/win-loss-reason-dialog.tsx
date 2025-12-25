'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface WinLossReason {
  id: string;
  name: string;
  type: 'win' | 'loss' | 'disqualify';
  description?: string | null;
}

interface WinLossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'Won' | 'Lost' | 'Converted' | 'Disqualified';
  onConfirm: (reasonId: string) => Promise<void>;
  module?: 'LEAD' | 'DEAL';
}

export function WinLossReasonDialog({
  open,
  onOpenChange,
  status,
  onConfirm,
  module = 'LEAD',
}: WinLossReasonDialogProps) {
  const { toast } = useToast();
  const [reasons, setReasons] = useState<WinLossReason[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine reason type based on status
  const reasonType = status === 'Won' || status === 'Converted' ? 'win' : 
                     status === 'Lost' ? 'loss' : 'disqualify';

  useEffect(() => {
    if (open) {
      fetchReasons();
      setSelectedReasonId('');
    }
  }, [open, reasonType]);

  const fetchReasons = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/win-loss-reasons?type=${reasonType}&module=${module}`
      );
      if (!res.ok) throw new Error('Failed to fetch reasons');
      const data = await res.json();
      setReasons(data);
    } catch (error) {
      console.error('Failed to fetch win/loss reasons:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load reasons. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedReasonId) {
      toast({
        variant: 'destructive',
        title: 'Required',
        description: 'Please select a reason',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(selectedReasonId);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select {reasonType === 'win' ? 'Win' : reasonType === 'loss' ? 'Loss' : 'Disqualification'} Reason</DialogTitle>
          <DialogDescription>
            Please select a reason for marking this {module.toLowerCase()} as {status}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason-select">Reason *</Label>
          {isLoading ? (
            <div className="text-sm text-muted-foreground mt-2">Loading reasons...</div>
          ) : reasons.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-2">
              No reasons available. Please contact an administrator to configure reasons.
            </div>
          ) : (
            <Select
              value={selectedReasonId}
              onValueChange={setSelectedReasonId}
            >
              <SelectTrigger id="reason-select" className="mt-2">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                    {reason.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        - {reason.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReasonId || isSubmitting || isLoading}
          >
            {isSubmitting ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

