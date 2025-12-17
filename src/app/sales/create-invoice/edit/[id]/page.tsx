
'use client';

import { SalesDocumentForm } from "@/components/sales/sales-document-form";
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
        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDocumentData(data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load invoice',
            description: 'Could not load the invoice. Please try again.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch invoice:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load invoice',
          description: 'Could not load the invoice. Please try again.',
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Invoice #{id}</h1>
          <p className="text-muted-foreground">Update the details for this invoice.</p>
        </div>
      </div>
      {documentData && <SalesDocumentForm documentType="Invoice" existingDocument={documentData} />}
    </div>
  );
}
