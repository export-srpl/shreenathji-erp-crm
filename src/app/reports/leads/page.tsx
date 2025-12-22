'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertToExcelCSV, downloadCSV, formatDateForExport, ExportColumn } from '@/lib/export-utils';

interface LeadReport {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: string;
  leadSource: string;
  country: string;
  state: string;
  city: string;
  productInterest: string;
  application: string;
  monthlyRequirement: string;
  followUpDate: string | null;
  createdAt: string;
}

const exportColumns: ExportColumn[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'contactName', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'leadSource', label: 'Source' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'productInterest', label: 'Product Interest' },
  { key: 'application', label: 'Application / End Use' },
  { key: 'monthlyRequirement', label: 'Monthly Requirement (MTS)' },
  { key: 'followUpDate', label: 'Follow-up Date' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function LeadsReportPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadReport[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const formatProductInterest = (productInterest: string | null | undefined, productsList: Array<{ id: string; name: string }>): string => {
      if (!productInterest) return '';
      
      try {
        const productData = JSON.parse(productInterest);
        if (Array.isArray(productData) && productData.length > 0) {
          const productNames = productData
            .map((p: any) => {
              if (!p.productId) return null;
              const product = productsList.find(prod => prod.id === p.productId);
              return product ? product.name : null;
            })
            .filter((name): name is string => Boolean(name));
          
          return productNames.length > 0 ? productNames.join(', ') : '';
        }
      } catch {
        // If not JSON, try to find product by the string value
        const product = productsList.find(p => p.name === productInterest || p.id === productInterest);
        return product ? product.name : productInterest;
      }
      
      return '';
    };

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products and leads in parallel
        const [productsRes, leadsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/leads')
        ]);
        
        if (!leadsRes.ok) throw new Error('Failed to fetch leads');
        
        // Get products data
        let productsList: Array<{ id: string; name: string }> = [];
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          productsList = productsData.map((p: any) => ({
            id: p.id,
            name: p.name || p.productName || '',
          }));
          setProducts(productsList);
        }
        
        // Get leads data and format with products
        const data = await leadsRes.json();
        const formattedLeads: LeadReport[] = data.map((lead: any) => ({
          id: lead.id,
          companyName: lead.companyName || '',
          contactName: lead.contactName || '',
          email: lead.email || '',
          phone: lead.phone || '',
          status: lead.status || '',
          leadSource: lead.leadSource || '',
          country: lead.country || '',
          state: lead.state || '',
          city: lead.city || '',
          productInterest: formatProductInterest(lead.productInterest, productsList),
          application: lead.application || '',
          monthlyRequirement: lead.monthlyRequirement || '',
          followUpDate: lead.followUpDate ? formatDateForExport(lead.followUpDate) : '',
          createdAt: formatDateForExport(lead.createdAt),
        }));
        
        setLeads(formattedLeads);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load leads',
          description: 'Could not fetch leads data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      const csv = convertToExcelCSV(leads, exportColumns);
      const filename = `Leads_Report_${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csv, filename);
      
      toast({
        title: 'Export successful',
        description: `Leads report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not export leads report.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Leads Report</h1>
          <p className="text-muted-foreground">View and export all leads data.</p>
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
          <CardTitle>Leads Data</CardTitle>
          <CardDescription>
            Total leads: {leads.length} | Last updated: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No leads data available.</p>
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
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      {exportColumns.map((col) => (
                        <td key={col.key} className="p-2 text-sm">
                          {(lead as any)[col.key] || '-'}
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

