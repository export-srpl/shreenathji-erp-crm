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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/leads');
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        
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
          productInterest: lead.productInterest || '',
          application: lead.application || '',
          monthlyRequirement: lead.monthlyRequirement || '',
          followUpDate: lead.followUpDate ? formatDateForExport(lead.followUpDate) : '',
          createdAt: formatDateForExport(lead.createdAt),
        }));
        
        setLeads(formattedLeads);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load leads',
          description: 'Could not fetch leads data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
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

