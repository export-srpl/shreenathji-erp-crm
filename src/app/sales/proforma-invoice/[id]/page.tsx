
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SalesDocumentForm } from '@/components/sales/sales-document-form';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, FileDown, Pencil, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ViewProformaInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
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
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConversion = async (proformaId: string, targetType: 'Invoice' | 'Sales Order') => {
    setIsProcessing(true);
    
    try {
      const targetTypeMap: Record<string, 'INVOICE' | 'SALES_ORDER'> = {
        'Invoice': 'INVOICE',
        'Sales Order': 'SALES_ORDER',
      };

      const res = await fetch(`/api/documents/${proformaId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: targetTypeMap[targetType] }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Conversion failed' }));
        throw new Error(error.message || error.errorCode || 'Conversion failed');
      }

      const result = await res.json();
      
      toast({
        title: 'Conversion Successful',
        description: `${targetType} ${result.documentNumber} has been created. Review and save to finalize.`,
      });

      // Navigate to the edit page of the newly created document for review
      if (targetType === 'Invoice') {
        router.push(`/sales/create-invoice/edit/${result.documentId}`);
      } else {
        router.push(`/sales/sales-order/edit/${result.documentId}`);
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast({
        variant: 'destructive',
        title: 'Conversion Failed',
        description: error.message || 'Could not convert document. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (proformaId: string) => {
    router.push(`/sales/proforma-invoice/edit/${proformaId}`);
  };

  const handlePdfAction = async (proformaId: string, action: 'download' | 'view') => {
    if (!documentData) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(`/api/proforma-invoices/${proformaId}/pdf`);
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (action === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `proforma-${documentData.proformaNumber || proformaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({
          title: 'PDF Downloaded',
          description: 'Proforma invoice PDF has been downloaded successfully.',
        });
      } else {
        window.open(url, '_blank');
        toast({
          title: 'PDF Opened',
          description: 'Proforma invoice PDF has been opened in a new tab.',
        });
      }
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: 'Could not generate PDF. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
  }

  if (!documentData) {
    return <div>Proforma Invoice not found</div>
  }

  const documentType = "Proforma Invoice";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">{documentType} #{id}</h1>
            <p className="text-muted-foreground">View details, edit, or download the {documentType.toLowerCase()}.</p>
        </div>
         <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleConversion(id, 'Sales Order')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />} Convert to Sales Order
            </Button>
            <Button variant="outline" onClick={() => handleConversion(id, 'Invoice')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />} Convert to Invoice
            </Button>
            <Button variant="outline" onClick={() => handlePdfAction(id, 'view')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Eye className="mr-2" />} View PDF
            </Button>
            <Button variant="outline" onClick={() => handlePdfAction(id, 'download')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <FileDown className="mr-2" />} Download PDF
            </Button>
            <Button onClick={() => handleEdit(id)}>
                <Pencil className="mr-2" /> Edit
            </Button>
        </div>
      </div>
      <Card className="flex flex-col">
        <CardContent className="flex-grow p-6">
            <SalesDocumentForm documentType="Proforma Invoice" existingDocument={documentData} isReadOnly={true} />
        </CardContent>
      </Card>
    </div>
  );
}
