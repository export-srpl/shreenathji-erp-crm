'use client';

import { useState, useMemo, useEffect } from 'react';
import { SalesDocumentForm } from '@/components/sales/sales-document-form';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';

type Lead = {
  id: string;
  companyName: string;
  country: string;
  state?: string;
  gstNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  contactName: string;
  email: string;
  phone: string;
  status?: string;
  contactPerson?: {
    designation?: string;
  };
};

export default function CreateQuotePage() {
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/leads');
        if (res.ok) {
          const data = await res.json();
          // Filter for Qualified or Converted leads
          const qualifiedLeads = data.filter((lead: Lead) => 
            lead.status === 'Qualified' || lead.status === 'Converted'
          );
          setLeads(qualifiedLeads);
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load leads',
          description: 'Could not load leads. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [toast]);

  const selectedLead = useMemo(() => {
    return leads?.find(lead => lead.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);
  
  const customerFromLead = useMemo(() => {
    if (!selectedLead) return null;
    return {
      id: '', // This will be the new customer ID
      leadId: selectedLead.id,
      companyName: selectedLead.companyName,
      customerType: selectedLead.country === 'India' ? 'domestic' : 'international',
      country: selectedLead.country,
      state: selectedLead.state,
      gstNo: selectedLead.gstNo,
      billingAddress: selectedLead.billingAddress || '',
      shippingAddress: selectedLead.shippingAddress || '',
      contactPerson: {
        name: selectedLead.contactName,
        email: selectedLead.email,
        phone: selectedLead.phone,
        designation: selectedLead.contactPerson?.designation || '',
      }
    };
  }, [selectedLead]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Create Quote</h1>
          <p className="text-muted-foreground">Select a qualified lead to generate a sales quotation.</p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Lead</CardTitle>
          <CardDescription>You can only generate quotes for leads that are 'Qualified' or 'Converted'.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <div className="max-w-md">
              <Label htmlFor="lead-select">Qualified Lead</Label>
              <Select onValueChange={setSelectedLeadId} value={selectedLeadId || ''}>
                <SelectTrigger id="lead-select">
                  <SelectValue placeholder="Select a lead to begin..." />
                </SelectTrigger>
                <SelectContent>
                  {leads && leads.length > 0 ? (
                    leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.companyName}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">No qualified leads found.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedLeadId && customerFromLead && (
         <SalesDocumentForm 
            documentType="Quote" 
            existingCustomer={customerFromLead} 
          />
      )}
    </div>
  );
}
