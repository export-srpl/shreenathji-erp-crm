'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertToExcelCSV, downloadCSV, formatDateForExport, formatCurrencyForExport, ExportColumn } from '@/lib/export-utils';

interface DealReport {
  id: string;
  title: string;
  customerName: string;
  stage: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  createdAt: string;
  expectedCloseDate: string | null;
}

const exportColumns: ExportColumn[] = [
  { key: 'title', label: 'Deal Title' },
  { key: 'customerName', label: 'Customer' },
  { key: 'stage', label: 'Stage' },
  { key: 'productName', label: 'Product' },
  { key: 'quantity', label: 'Quantity (MTS)' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'totalValue', label: 'Total Value' },
  { key: 'expectedCloseDate', label: 'Expected Close Date' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function DealsPipelineReportPage() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<DealReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/deals');
        if (!res.ok) throw new Error('Failed to fetch deals');
        const data = await res.json();
        
        const formattedDeals: DealReport[] = data.map((deal: any) => {
          // Calculate total value from items
          const totalValue = deal.items?.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.product?.unitPrice) || 0;
            return sum + (qty * price);
          }, 0) || 0;
          
          return {
            id: deal.id,
            title: deal.title || '',
            customerName: deal.customer?.companyName || '',
            stage: deal.stage || '',
            productName: deal.items?.[0]?.product?.name || '',
            quantity: Number(deal.items?.[0]?.quantity) || 0,
            unitPrice: Number(deal.items?.[0]?.product?.unitPrice) || 0,
            totalValue: totalValue,
            expectedCloseDate: '', // Field doesn't exist in schema
            createdAt: formatDateForExport(deal.createdAt),
          };
        });
        
        setDeals(formattedDeals);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load deals',
          description: 'Could not fetch deals data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeals();
  }, [toast]);

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      const exportData = deals.map(deal => ({
        ...deal,
        unitPrice: formatCurrencyForExport(deal.unitPrice),
        totalValue: formatCurrencyForExport(deal.totalValue),
      }));
      
      const csv = convertToExcelCSV(exportData, exportColumns);
      const filename = `Deals_Pipeline_Report_${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csv, filename);
      
      toast({
        title: 'Export successful',
        description: `Deals pipeline report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not export deals report.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Deals Pipeline Report</h1>
          <p className="text-muted-foreground">View and export all deals pipeline data.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Deals Pipeline Data</CardTitle>
          <CardDescription>
            Total deals: {deals.length} | Last updated: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No deals data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {exportColumns.map((col) => (
                      <th key={col.key} className="text-left p-2 font-semibold text-sm">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className="border-b hover:bg-muted/50">
                      {exportColumns.map((col) => (
                        <td key={col.key} className="p-2 text-sm">
                          {col.key === 'unitPrice' || col.key === 'totalValue' 
                            ? `₹${formatCurrencyForExport((deal as any)[col.key])}`
                            : (deal as any)[col.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

