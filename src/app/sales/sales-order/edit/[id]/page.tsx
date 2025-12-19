
'use client';

import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function EditSalesOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSalesOrder = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sales-orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDocumentData(data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load sales order',
            description: 'Could not load the sales order. Please try again.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch sales order:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load sales order',
          description: 'Could not load the sales order. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchSalesOrder();
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Sales Order #{id}</h1>
          <p className="text-muted-foreground">Update the details for this sales order.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {documentData && <SalesDocumentForm documentType="Sales Order" existingDocument={documentData} />}
        </div>
        <div className="lg:col-span-1">
          <ActivityTimeline entityType="sales_order" entityId={id} />
        </div>
      </div>
    </div>
  );
}
