
'use client';

import { Suspense, useState, useEffect } from 'react';
import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

function CreateInvoiceContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fromProformaId = searchParams.get('fromProforma');
  const fromSalesOrderId = searchParams.get('fromSalesOrder');
  const sourceId = fromProformaId || fromSalesOrderId;
  const [sourceDocument, setSourceDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!sourceId);

  useEffect(() => {
    if (!sourceId) {
      setIsLoading(false);
      return;
    }

    const fetchSourceDocument = async () => {
      setIsLoading(true);
      try {
        const url = fromProformaId 
          ? `/api/proforma-invoices/${sourceId}`
          : `/api/sales-orders/${sourceId}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSourceDocument(data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load source document',
            description: 'Could not load the source document. Please try again.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch source document:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load source document',
          description: 'Could not load the source document. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSourceDocument();
  }, [sourceId, fromProformaId, toast]);

  const sourceDocType = fromProformaId ? 'Proforma' : 'Sales Order';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Create Invoice</h1>
          <p className="text-muted-foreground">
             {sourceId 
              ? `Converting from ${sourceDocType} #${sourceId}. Review and confirm details.`
              : "Fill in the details to create a new invoice."
            }
          </p>
        </div>
      </div>
      {sourceId && isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4">Loading data from {sourceDocType} #{sourceId}...</p>
        </div>
      )}
      {(!sourceId || (sourceId && sourceDocument)) && (
        <SalesDocumentForm documentType="Invoice" existingDocument={sourceDocument} />
      )}
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  )
}
