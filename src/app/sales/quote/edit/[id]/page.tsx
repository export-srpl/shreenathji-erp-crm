
'use client';

import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function EditQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/quotes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDocumentData(data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load quote',
            description: 'Could not load the quote. Please try again.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load quote',
          description: 'Could not load the quote. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchQuote();
    }
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Quote #{id}</h1>
          <p className="text-muted-foreground">Update the details for this sales quotation.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {documentData && <SalesDocumentForm documentType="Quote" existingDocument={documentData} />}
        </div>
        <div className="lg:col-span-1">
          <ActivityTimeline entityType="quote" entityId={id} />
        </div>
      </div>
    </div>
  );
}
