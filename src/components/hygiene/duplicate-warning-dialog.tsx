'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

interface DuplicateMatch {
  type: 'company' | 'email' | 'phone' | 'gst' | 'vat';
  value: string;
  matches: Array<{
    id: string;
    srplId?: string | null;
    companyName: string;
    entityType: 'lead' | 'customer';
    createdAt: Date;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateMatch[];
  onProceed: () => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onProceed,
  onCancel,
}: DuplicateWarningDialogProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company':
        return 'Company Name';
      case 'email':
        return 'Email';
      case 'phone':
        return 'Phone';
      case 'gst':
        return 'GST Number';
      case 'vat':
        return 'VAT Number';
      default:
        return type;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Potential Duplicate Records Found
          </DialogTitle>
          <DialogDescription>
            We found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} based on the information
            you entered. Please review before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {duplicates.map((dup, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getTypeLabel(dup.type)}:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{dup.value}</code>
                </div>
                <Badge variant={getConfidenceColor(dup.confidence)}>{dup.confidence} confidence</Badge>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Matching Records:</div>
                {dup.matches.map((match) => (
                  <Alert key={match.id} className="py-2">
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{match.companyName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {match.srplId && (
                            <span className="mr-2">
                              {match.entityType === 'lead' ? 'Lead' : 'Customer'}: {match.srplId}
                            </span>
                          )}
                          Created {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <Badge variant="outline">{match.entityType}</Badge>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          ))}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You can proceed to create this record anyway, or cancel to review the existing records first.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={onProceed}>
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

