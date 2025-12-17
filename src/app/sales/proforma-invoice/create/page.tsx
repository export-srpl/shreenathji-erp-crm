
'use client';

import { Suspense, useState, useEffect } from 'react';
import { SalesDocumentForm } from "@/components/sales/sales-document-form";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

function CreateProformaInvoiceContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fromQuoteId = searchParams.get('fromQuote');
  const [sourceDocument, setSourceDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!fromQuoteId);

  useEffect(() => {
    if (!fromQuoteId) {
      setIsLoading(false);
      return;
    }

    const fetchSourceDocument = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/quotes/${fromQuoteId}`);
        if (res.ok) {
          const data = await res.json();
          setSourceDocument(data);
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

    fetchSourceDocument();
  }, [fromQuoteId, toast]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Create Proforma Invoice</h1>
          <p className="text-muted-foreground">
            {fromQuoteId 
              ? `Converting from Quote #${fromQuoteId}. Review and confirm details.`
              : "Fill in the details to create a new proforma invoice."
            }
          </p>
        </div>
      </div>
      {fromQuoteId && isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4">Loading data from Quote #{fromQuoteId}...</p>
        </div>
      )}
      {(!fromQuoteId || (fromQuoteId && sourceDocument)) && (
        <SalesDocumentForm documentType="Proforma Invoice" existingDocument={sourceDocument} />
      )}
    </div>
  );
}


export default function CreateProformaInvoicePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateProformaInvoiceContent />
    </Suspense>
  )
}
