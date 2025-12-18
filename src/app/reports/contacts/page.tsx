'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertToExcelCSV, downloadCSV, formatDateForExport, ExportColumn } from '@/lib/export-utils';

interface ContactReport {
  id: string;
  type: 'customer' | 'lead';
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  designation: string;
  country: string;
  state: string;
  city: string;
  createdAt: string;
}

const exportColumns: ExportColumn[] = [
  { key: 'type', label: 'Type' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'contactName', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'designation', label: 'Designation' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function ContactsReportPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/contacts');
        if (!res.ok) throw new Error('Failed to fetch contacts');
        const data = await res.json();
        
        const formattedContacts: ContactReport[] = data.map((contact: any) => ({
          id: contact.id,
          type: contact.source || '',
          companyName: contact.company || '',
          contactName: contact.name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          designation: contact.designation || '',
          country: contact.country || '',
          state: contact.state || '',
          city: contact.city || '',
          createdAt: formatDateForExport(new Date()), // Contacts API doesn't return createdAt
        }));
        
        setContacts(formattedContacts);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load contacts',
          description: 'Could not fetch contacts data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [toast]);

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      const csv = convertToExcelCSV(contacts, exportColumns);
      const filename = `Contacts_Report_${new Date().toISOString().split('T')[0]}`;
      downloadCSV(csv, filename);
      
      toast({
        title: 'Export successful',
        description: `Contacts report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not export contacts report.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Contacts Report</h1>
          <p className="text-muted-foreground">View and export all contacts data (customers and leads).</p>
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
          <CardTitle>Contacts Data</CardTitle>
          <CardDescription>
            Total contacts: {contacts.length} | Last updated: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No contacts data available.</p>
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
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-muted/50">
                      {exportColumns.map((col) => (
                        <td key={col.key} className="p-2 text-sm">
                          {(contact as any)[col.key] || '-'}
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

