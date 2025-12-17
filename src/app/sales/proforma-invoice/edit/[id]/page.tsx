
'use client';

import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function EditProformaInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProforma = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/proforma-invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDocumentData(data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load proforma invoice',
            description: 'Could not load the proforma invoice. Please try again.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch proforma invoice:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load proforma invoice',
          description: 'Could not load the proforma invoice. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProforma();
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Proforma Invoice #{id}</h1>
          <p className="text-muted-foreground">Update the details for this proforma invoice.</p>
        </div>
      </div>
      {documentData && <SalesDocumentForm documentType="Proforma Invoice" existingDocument={documentData} />}
    </div>
  );
}
