'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertToExcelCSV, downloadCSV, formatDateForExport, ExportColumn } from '@/lib/export-utils';

interface CustomerReport {
  id: string;
  companyName: string;
  customerType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;
  billingAddress: string;
  shippingAddress: string;
  country: string;
  state: string;
  city: string;
  gstNo: string;
  createdAt: string;
}

const exportColumns: ExportColumn[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'customerType', label: 'Customer Type' },
  { key: 'contactName', label: 'Contact Person' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'contactPhone', label: 'Phone' },
  { key: 'contactTitle', label: 'Designation' },
  { key: 'billingAddress', label: 'Billing Address' },
  { key: 'shippingAddress', label: 'Shipping Address' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'gstNo', label: 'GST No' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function CustomersReportPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/customers');
        if (!res.ok) throw new Error('Failed to fetch customers');
        const data = await res.json();
        
        const formattedCustomers: CustomerReport[] = data.map((customer: any) => ({
          id: customer.id,
          companyName: customer.companyName || '',
          customerType: customer.customerType || '',
          contactName: customer.contactName || '',
          contactEmail: customer.contactEmail || '',
          contactPhone: customer.contactPhone || '',
          contactTitle: customer.contactTitle || '',
          billingAddress: customer.billingAddress || '',
          shippingAddress: customer.shippingAddress || '',
          country: customer.country || '',
          state: customer.state || '',
          city: customer.city || '',
          gstNo: customer.gstNo || '',
          createdAt: formatDateForExport(customer.createdAt),
        }));
        
        setCustomers(formattedCustomers);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load customers',
          description: 'Could not fetch customers data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      const csv = convertToExcelCSV(customers, exportColumns);
      const filename = `Customers_Report_${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csv, filename);
      
      toast({
        title: 'Export successful',
        description: `Customers report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not export customers report.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Customers Report</h1>
          <p className="text-muted-foreground">View and export all customers data.</p>
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
          <CardTitle>Customers Data</CardTitle>
          <CardDescription>
            Total customers: {customers.length} | Last updated: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No customers data available.</p>
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
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/50">
                      {exportColumns.map((col) => (
                        <td key={col.key} className="p-2 text-sm">
                          {(customer as any)[col.key] || '-'}
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

