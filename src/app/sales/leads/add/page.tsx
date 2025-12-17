
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { countries } from '@/lib/countries';

const leadSources = ['Website', 'Referral', 'Exhibition', 'Cold Call', 'IndiaMART', 'Other'];
const salesPeople = ['Ashok Lakhani', 'Jay Lakhani', 'Sachin Vadhvana', 'Prakash Gajjar'];
const products = ['Formaldehyde', 'Hexamine', 'Paraformaldehyde', 'Urea-Formaldehyde Resin'];
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted'];
const contactMethods = ['Email', 'Phone', 'WhatsApp'];

function LeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const user = null;

  const [selectedCountry, setSelectedCountry] = useState('');
  const [assignedSalesperson, setAssignedSalesperson] = useState('');
  const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = false;
  const isSalesPerson = false;
  const leadId = searchParams.get('leadId');

  useEffect(() => {
    if (isSalesPerson && user?.displayName && salesPeople.includes(user.displayName)) {
      setAssignedSalesperson(user.displayName);
    }
  }, [isSalesPerson, user]);

  // If editing, load existing lead data
  useEffect(() => {
    async function loadLead() {
      if (!leadId) return;
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error('Failed to load lead');
        const lead = await res.json();

        setInitialValues({
          leadSource: lead.source ?? '',
          companyName: lead.companyName ?? '',
          website: '',
          gstNo: lead.gstNo ?? '',
          contactName: lead.contactName ?? '',
          designation: '',
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          country: lead.country ?? '',
          state: lead.state ?? '',
          industry: '',
          productInterest: lead.productInterest ?? '',
          application: '',
          monthlyRequirement: '',
          assignedSalesperson: lead.assignedSalesperson ?? '',
          leadStatus: lead.status ?? 'New',
          followUpDate: '',
          contactMethod: '',
          notes: lead.notes ?? '',
        });

        setSelectedCountry(lead.country ?? '');
        if (lead.assignedSalesperson) {
          setAssignedSalesperson(lead.assignedSalesperson);
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Failed to load lead',
          description: 'Could not load the lead for editing.',
        });
      }
    }

    loadLead();
  }, [leadId, toast, isSalesPerson, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const leadData = {
      leadSource: formData.get('leadSource') as string,
      companyName: formData.get('companyName') as string,
      website: formData.get('website') as string,
      gstNo: formData.get('gstNo') as string,
      contactName: formData.get('contactName') as string,
      designation: formData.get('designation') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      country: formData.get('country') as string,
      state: formData.get('state') as string,
      industry: formData.get('industry') as string,
      productInterest: formData.get('productInterest') as string,
      application: formData.get('application') as string,
      monthlyRequirement: formData.get('monthlyRequirement') as string,
      assignedSalesperson: assignedSalesperson,
      leadStatus: formData.get('leadStatus') as string,
      followUpDate: formData.get('followUpDate') as string,
      contactMethod: formData.get('contactMethod') as string,
      notes: formData.get('notes') as string,
      createdAt: new Date().toISOString(),
    };

    try {
      const isEdit = !!leadId;
      const url = isEdit ? `/api/leads/${leadId}` : '/api/leads';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadSource: leadData.leadSource,
          companyName: leadData.companyName,
          gstNo: leadData.gstNo,
          contactName: leadData.contactName,
          email: leadData.email,
          phone: leadData.phone,
          country: leadData.country,
          state: leadData.state,
          productInterest: leadData.productInterest,
          assignedSalesperson: leadData.assignedSalesperson,
          status: leadData.leadStatus,
          notes: leadData.notes,
        }),
      });

      if (!res.ok) {
        throw new Error(isEdit ? 'Failed to update lead' : 'Failed to create lead');
      }

      toast({
        title: isEdit ? 'Lead Updated' : 'Lead Added',
        description: `"${leadData.companyName}" has been ${isEdit ? 'updated' : 'created'} successfully.`,
      });

      router.push('/sales/leads');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to save lead',
        description: 'Please try again later.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {leadId ? 'Edit Lead' : 'Add New Lead'}
        </h1>
        <p className="text-muted-foreground">
          {leadId ? 'Update the details for this sales lead.' : 'Enter the details for the new sales lead.'}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
          <CardDescription>Fill in the form below to add a new lead to the pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={handleSubmit}>
            
            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select name="leadSource" required defaultValue={initialValues?.leadSource}>
                    <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                    <SelectContent>
                      {leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="e.g. Acme Corporation"
                    required
                    defaultValue={initialValues?.companyName}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="e.g. https://acme.com"
                    defaultValue={initialValues?.website}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Person */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Person</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="e.g. Jane Doe"
                    required
                    defaultValue={initialValues?.contactName}
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Job Title / Designation</Label>
                  <Input
                    id="designation"
                    name="designation"
                    placeholder="e.g. Purchase Manager"
                    defaultValue={initialValues?.designation}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g. jane.doe@acme.com"
                    required
                    defaultValue={initialValues?.email}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone / WhatsApp</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +91 123 456 7890"
                    required
                    defaultValue={initialValues?.phone}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="country">Country</Label>
                        <Select
                          name="country"
                          required
                          onValueChange={setSelectedCountry}
                          value={selectedCountry || initialValues?.country || undefined}
                        >
                            <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          name="state"
                          placeholder="e.g. Gujarat"
                          required
                          defaultValue={initialValues?.state}
                        />
                    </div>
                    {selectedCountry === 'India' && (
                        <div>
                            <Label htmlFor="gstNo">GST Number (Optional)</Label>
                            <Input
                              id="gstNo"
                              name="gstNo"
                              placeholder="e.g. 24AAABC1234D1Z2"
                              defaultValue={initialValues?.gstNo}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <Separator />

            {/* Business Context */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Context</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    placeholder="e.g. Pharmaceuticals"
                    defaultValue={initialValues?.industry}
                  />
                </div>
                <div>
                  <Label htmlFor="productInterest">Product Interest</Label>
                  <Select
                    name="productInterest"
                    required
                    defaultValue={initialValues?.productInterest}
                  >
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="application">Application / End Use</Label>
                  <Input
                    id="application"
                    name="application"
                    placeholder="e.g. Resin Manufacturing"
                    defaultValue={initialValues?.application}
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyRequirement">Approx. Monthly Requirement (MT)</Label>
                  <Input
                    id="monthlyRequirement"
                    name="monthlyRequirement"
                    type="number"
                    placeholder="e.g. 100"
                    defaultValue={initialValues?.monthlyRequirement}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Sales Ownership & Follow-up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sales Ownership</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="assignedSalesperson">Assigned Salesperson</Label>
                            <Select
                              name="assignedSalesperson"
                              required
                              onValueChange={setAssignedSalesperson}
                              value={assignedSalesperson || initialValues?.assignedSalesperson || undefined}
                              disabled={!isAdmin}
                            >
                                <SelectTrigger><SelectValue placeholder="Select a salesperson" /></SelectTrigger>
                                <SelectContent>
                                    {salesPeople.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="leadStatus">Lead Status</Label>
                            <Select
                              name="leadStatus"
                              defaultValue={initialValues?.leadStatus || 'New'}
                              required
                            >
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent>
                                    {leadStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                     <h3 className="text-lg font-medium">Follow-up</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div>
                            <Label htmlFor="followUpDate">Next Follow-up Date</Label>
                            <Input
                              id="followUpDate"
                              name="followUpDate"
                              type="date"
                              defaultValue={initialValues?.followUpDate}
                            />
                        </div>
                        <div>
                            <Label htmlFor="contactMethod">Preferred Contact Method</Label>
                            <Select
                              name="contactMethod"
                              defaultValue={initialValues?.contactMethod}
                            >
                                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                                <SelectContent>
                                    {contactMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     </div>
                </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Remarks / Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional information about the lead..."
                rows={4}
                defaultValue={initialValues?.notes}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : leadId ? 'Update Lead' : 'Save Lead'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddLeadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <span>Loading…</span>
        </div>
      }
    >
      <LeadForm />
    </Suspense>
  );
}
