
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
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted'];
const contactMethods = ['Email', 'Phone', 'WhatsApp'];

function LeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedCountry, setSelectedCountry] = useState('');
  const [assignedSalesperson, setAssignedSalesperson] = useState<string>('');
  const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [salesPeople, setSalesPeople] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [leadSource, setLeadSource] = useState('');
  const [leadStatus, setLeadStatus] = useState('New');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'admin';
  const isSalesPerson = currentUserRole === 'sales';
  const leadId = searchParams.get('leadId');

  // Fetch current auth context (role, user id)
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUserRole((data.role || '').toLowerCase());
          setCurrentUserId(data.id || null);
        }
      } catch (error) {
        console.error('Failed to fetch auth context:', error);
      }
    };
    fetchAuth();
  }, []);

  // Fetch sales people and products from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users with Sales role
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const users = await usersRes.json();
          const salesUsers = users
            .filter((u: any) => (u.role || '').toLowerCase() === 'sales')
            .map((u: any) => ({ id: u.id, name: u.name || u.email || 'Unknown' }));
          setSalesPeople(salesUsers);
        }

        // Fetch products (from Inventory → Products)
        const productsRes = await fetch('/api/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const productNames = productsData.map((p: any) => p.name).filter((name: string) => name);
          setProducts(productNames);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  // Default assigned salesperson for sales users
  useEffect(() => {
    if (isSalesPerson && currentUserId && !assignedSalesperson) {
      setAssignedSalesperson(currentUserId);
    }
  }, [isSalesPerson, currentUserId, assignedSalesperson]);

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
          city: lead.city ?? '',
          billingAddress: lead.billingAddress ?? '',
          industry: '',
          productInterest: lead.productInterest ?? '',
          application: lead.application ?? '',
          monthlyRequirement: lead.monthlyRequirement ?? '',
          assignedSalesperson: lead.assignedSalesperson ?? '',
          leadStatus: lead.status ?? 'New',
          followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
          contactMethod: '',
          notes: lead.notes ?? '',
        });

        setSelectedCountry(lead.country ?? '');
        setLeadSource(lead.source ?? '');
        setLeadStatus(lead.status ?? 'New');
        if (lead.ownerId) {
          setAssignedSalesperson(lead.ownerId);
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
  }, [leadId, toast, isSalesPerson]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const isEdit = !!leadId;
    
    try {
      const url = isEdit ? `/api/leads/${leadId}` : '/api/leads';
      const method = isEdit ? 'PATCH' : 'POST';

      let requestBody: any;
      
      if (isEdit) {
        // When editing, update status and follow-up + business fields.
        // For admins, also allow updating lead source and owner (reassignment).
        requestBody = {
          status: formData.get('leadStatus') as string,
          followUpDate: (formData.get('followUpDate') as string) || null,
          productInterest: formData.get('productInterest') as string,
          application: formData.get('application') as string,
          monthlyRequirement: formData.get('monthlyRequirement') as string,
        };

        if (isAdmin) {
          requestBody = {
            ...requestBody,
            allowFullUpdate: true,
            source: formData.get('leadSource') as string,
            ownerId: assignedSalesperson || null,
          };
        }
      } else {
        // When creating, send all fields
        requestBody = {
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
          city: formData.get('city') as string,
          billingAddress: formData.get('billingAddress') as string,
          productInterest: formData.get('productInterest') as string,
          application: formData.get('application') as string,
          monthlyRequirement: formData.get('monthlyRequirement') as string,
          ownerId: assignedSalesperson || null,
          status: formData.get('leadStatus') as string,
          followUpDate: formData.get('followUpDate') as string || null,
          notes: formData.get('notes') as string,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || (isEdit ? 'Failed to update lead' : 'Failed to create lead');
        throw new Error(message);
      }

      const leadData = await res.json();
      toast({
        title: isEdit ? 'Lead Updated' : 'Lead Added',
        description: `"${leadData.companyName || 'Lead'}" has been ${isEdit ? 'updated' : 'created'} successfully.`,
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
                  <Select
                    name="leadSource"
                    required
                    value={leadSource || initialValues?.leadSource || ''}
                    onValueChange={setLeadSource}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
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
                    disabled={!!leadId}
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
                    disabled={!!leadId}
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
                    disabled={!!leadId}
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Job Title / Designation</Label>
                  <Input
                    id="designation"
                    name="designation"
                    placeholder="e.g. Purchase Manager"
                    defaultValue={initialValues?.designation}
                    disabled={!!leadId}
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
                    disabled={!!leadId}
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
                    disabled={!!leadId}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <Label htmlFor="billingAddress">Company Address</Label>
                        <Input
                          id="billingAddress"
                          name="billingAddress"
                          placeholder="e.g. 123 Main Street, Industrial Area"
                          defaultValue={initialValues?.billingAddress}
                          disabled={!!leadId}
                        />
                    </div>
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="e.g. Ahmedabad"
                          defaultValue={initialValues?.city}
                          disabled={!!leadId}
                        />
                    </div>
                    <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          name="state"
                          placeholder="e.g. Gujarat"
                          required
                          defaultValue={initialValues?.state}
                          disabled={!!leadId}
                        />
                    </div>
                    <div>
                        <Label htmlFor="country">Country</Label>
                        <Select
                          name="country"
                          required
                          onValueChange={setSelectedCountry}
                          value={selectedCountry || initialValues?.country || undefined}
                          disabled={!!leadId}
                        >
                            <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedCountry === 'India' && (
                        <div>
                            <Label htmlFor="gstNo">GST Number (Optional)</Label>
                            <Input
                              id="gstNo"
                              name="gstNo"
                              placeholder="e.g. 24AAABC1234D1Z2"
                              defaultValue={initialValues?.gstNo}
                              disabled={!!leadId}
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
                    disabled={!!leadId}
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
                  <Label htmlFor="monthlyRequirement">Approx. Monthly Requirement (MTS)</Label>
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
                              value={assignedSalesperson || ''}
                              disabled={!isAdmin}
                            >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a salesperson" />
                                </SelectTrigger>
                                <SelectContent>
                                  {salesPeople.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="leadStatus">Lead Status</Label>
                            <Select
                              name="leadStatus"
                              value={leadStatus}
                              onValueChange={setLeadStatus}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {leadStatuses.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
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
            
            <div className="flex justify-between items-center gap-4">
              {leadId && isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
                    try {
                      setIsSaving(true);
                      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
                      if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Failed to delete lead');
                      }
                      toast({
                        title: 'Lead deleted',
                        description: 'The lead has been removed successfully.',
                      });
                      router.push('/sales/leads');
                    } catch (error) {
                      console.error(error);
                      toast({
                        variant: 'destructive',
                        title: 'Failed to delete lead',
                        description: 'Please try again later.',
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  Delete Lead
                </Button>
              )}
              <div className="flex justify-end gap-2 flex-1">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : leadId ? 'Update Lead' : 'Save Lead'}
                </Button>
              </div>
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
