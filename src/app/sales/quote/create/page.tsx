'use client';

import { useState, useMemo, useEffect } from 'react';
import { SalesDocumentForm } from '@/components/sales/sales-document-form';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Lead = {
  id: string;
  companyName: string;
  country: string;
  state?: string;
  city?: string;
  gstNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  contactName: string;
  email: string;
  phone: string;
  status?: string;
  assignedSalesperson?: string;
  contactPerson?: {
    designation?: string;
  };
};

export default function CreateQuotePage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'standalone' | 'fromLead'>('standalone');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch leads if user chooses "From Qualified Lead" mode
    if (mode !== 'fromLead') {
      return;
    }

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
  }, [mode, toast]);

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
      city: selectedLead.city,
      gstNo: selectedLead.gstNo,
      billingAddress: selectedLead.billingAddress || '',
      shippingAddress: selectedLead.shippingAddress || '',
      contactPerson: {
        name: selectedLead.contactName,
        email: selectedLead.email,
        phone: selectedLead.phone,
        designation: selectedLead.contactPerson?.designation || '',
      },
      salesPerson: selectedLead.assignedSalesperson || '',
    };
  }, [selectedLead]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Create Quote</h1>
          <p className="text-muted-foreground">
            Create a quote standalone, or optionally start from a qualified / converted lead.
          </p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quote Source</CardTitle>
          <CardDescription>Choose whether to create a new quote directly or from an existing lead.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'standalone' ? 'default' : 'outline'}
              onClick={() => {
                setMode('standalone');
                setSelectedLeadId(null);
              }}
            >
              Standalone Quote
            </Button>
            <Button
              type="button"
              variant={mode === 'fromLead' ? 'default' : 'outline'}
              onClick={() => setMode('fromLead')}
            >
              From Qualified Lead
            </Button>
          </div>

          {mode === 'fromLead' && (
            <div className="max-w-md mt-4">
              <Label htmlFor="lead-select">Qualified or Converted Lead</Label>
              {isLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading leads...</span>
                </div>
              ) : (
                <Select onValueChange={setSelectedLeadId} value={selectedLeadId || ''}>
                  <SelectTrigger id="lead-select">
                    <SelectValue placeholder="Select a lead (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads && leads.length > 0 ? (
                      leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.companyName}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No qualified or converted leads found.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Standalone quote flow */}
      {mode === 'standalone' && (
        <SalesDocumentForm documentType="Quote" />
      )}

      {/* Lead-based quote flow (optional) */}
      {mode === 'fromLead' && selectedLeadId && customerFromLead && (
        <SalesDocumentForm 
          documentType="Quote" 
          existingCustomer={customerFromLead} 
        />
      )}
    </div>
  );
}
