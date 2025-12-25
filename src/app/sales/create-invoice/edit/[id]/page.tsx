
'use client';

import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function EditInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        if (!id) {
          toast({
            variant: 'destructive',
            title: 'Invalid invoice ID',
            description: 'No invoice ID provided in the URL.',
          });
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (!data || !data.id) {
            console.error('Invalid invoice data received:', data);
            toast({
              variant: 'destructive',
              title: 'Invalid invoice data',
              description: 'The invoice data received is invalid. Please try again.',
            });
            return;
          }
          setDocumentData(data);
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch invoice:', { id, status: res.status, error: errorData });
          toast({
            variant: 'destructive',
            title: 'Failed to load invoice',
            description: errorData.error || `Could not load invoice with ID: ${id}. Please check if the invoice exists.`,
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch invoice:', { id, error: error.message, stack: error.stack });
        toast({
          variant: 'destructive',
          title: 'Failed to load invoice',
          description: `Could not load the invoice: ${error.message || 'Unknown error'}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {documentData?.invoiceNumber ? `Edit Invoice ${documentData.invoiceNumber}` : `Edit Invoice #${id}`}
          </h1>
          <p className="text-muted-foreground">
            {(documentData?.proformaId || documentData?.salesOrderId)
              ? 'Review and update the details for this converted invoice. All data from the source document has been pre-filled.'
              : 'Update the details for this invoice.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {documentData && <SalesDocumentForm documentType="Invoice" existingDocument={documentData} />}
        </div>
        <div className="lg:col-span-1">
          <ActivityTimeline entityType="invoice" entityId={id} />
        </div>
      </div>
    </div>
  );
}
