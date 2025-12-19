
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries } from '@/lib/countries';
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { DuplicateWarningDialog } from '@/components/hygiene/duplicate-warning-dialog';

const leadSources = ['Website', 'Referral', 'Exhibition', 'Cold Call', 'IndiaMART', 'Other'];
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted'];
const contactMethods = ['Email', 'Phone', 'WhatsApp'];

type Product = {
  id: string;
  name: string;
};

type LeadProduct = {
  productId: string;
  application?: string;
  monthlyRequirement?: string;
};

function LeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedCountry, setSelectedCountry] = useState('');
  const [assignedSalesperson, setAssignedSalesperson] = useState<string>('');
  const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [salesPeople, setSalesPeople] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leadProducts, setLeadProducts] = useState<LeadProduct[]>([{ productId: '', application: '', monthlyRequirement: '' }]);
  const [leadSource, setLeadSource] = useState('');
  const [leadStatus, setLeadStatus] = useState('New');
  const [customerType, setCustomerType] = useState<'domestic' | 'international' | ''>('');
  const [vatNumber, setVatNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);

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
          const mappedProducts = productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
          }));
          setProducts(mappedProducts);
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

  // Handle customerType changes - auto-set country and preserve data
  useEffect(() => {
    if (customerType === 'domestic') {
      setSelectedCountry('India');
    } else if (customerType === 'international' && selectedCountry === 'India') {
      // If switching from domestic to international, clear country if it was India
      setSelectedCountry('');
    }
  }, [customerType]);

  // If editing, load existing lead data
  useEffect(() => {
    async function loadLead() {
      if (!leadId) return;
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error('Failed to load lead');
        const lead = await res.json();

        // Load all available fields from the lead
        // Note: designation, industry, and contactMethod are not stored in DB
        // but are kept in the form for potential future use
        setInitialValues({
          leadSource: lead.source ?? '',
          companyName: lead.companyName ?? '',
          gstNo: lead.gstNo ?? '',
          vatNumber: lead.vatNumber ?? '',
          customerType: lead.customerType ?? (lead.country === 'India' ? 'domestic' : 'international'),
          contactName: lead.contactName ?? '',
          designation: '', // Not stored in DB
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          country: lead.country ?? '',
          state: lead.state ?? '',
          city: lead.city ?? '',
          billingAddress: lead.billingAddress ?? '',
          industry: '', // Not stored in DB
          productInterest: lead.productInterest ?? '',
          application: lead.application ?? '',
          monthlyRequirement: lead.monthlyRequirement ?? '',
          assignedSalesperson: lead.ownerId ?? '',
          leadStatus: lead.status ?? 'New',
          followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
          contactMethod: '', // Not stored in DB
          notes: lead.notes ?? '',
        });

        setSelectedCountry(lead.country ?? '');
        setLeadSource(lead.source ?? '');
        setLeadStatus(lead.status ?? 'New');
        // Set assignedSalesperson from ownerId
        if (lead.ownerId) {
          setAssignedSalesperson(lead.ownerId);
        }
        // Set customerType (default to domestic if country is India, otherwise international)
        const leadCountry = lead.country ?? '';
        const inferredCustomerType = lead.customerType || (leadCountry === 'India' ? 'domestic' : leadCountry ? 'international' : '');
        if (inferredCustomerType === 'domestic' || (leadCountry === 'India' && !lead.customerType)) {
          setCustomerType('domestic');
          setGstNumber(lead.gstNo ?? '');
        } else if (inferredCustomerType === 'international' || (leadCountry && leadCountry !== 'India')) {
          setCustomerType('international');
          setVatNumber(lead.vatNumber ?? '');
        }
        // Preserve GST/VAT numbers
        if (lead.gstNo) setGstNumber(lead.gstNo);
        if (lead.vatNumber) setVatNumber(lead.vatNumber);
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
  }, [leadId, toast]);

  // Parse productInterest when products are loaded (for editing)
  useEffect(() => {
    if (!leadId || !initialValues?.productInterest || products.length === 0) return;
    
    const productInterest = initialValues.productInterest;
    try {
      const parsedProducts = JSON.parse(productInterest);
      if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
        setLeadProducts(parsedProducts);
      } else {
        // Legacy: if it's a string, convert to single product entry
        const product = products.find(p => p.name === productInterest || p.id === productInterest);
        if (product) {
          setLeadProducts([{ 
            productId: product.id, 
            application: initialValues.application || '', 
            monthlyRequirement: initialValues.monthlyRequirement || '' 
          }]);
        }
      }
    } catch {
      // Legacy: if it's not JSON, treat as single product name
      const product = products.find(p => p.name === productInterest);
      if (product) {
        setLeadProducts([{ 
          productId: product.id, 
          application: initialValues.application || '', 
          monthlyRequirement: initialValues.monthlyRequirement || '' 
        }]);
      }
    }
  }, [leadId, initialValues, products]);

  // Handlers for managing multiple products
  const handleAddProduct = () => {
    setLeadProducts([...leadProducts, { productId: '', application: '', monthlyRequirement: '' }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (leadProducts.length > 1) {
      setLeadProducts(leadProducts.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const newProducts = [...leadProducts];
    newProducts[index].productId = productId;
    setLeadProducts(newProducts);
  };

  const handleProductApplicationChange = (index: number, application: string) => {
    const newProducts = [...leadProducts];
    newProducts[index].application = application;
    setLeadProducts(newProducts);
  };

  const handleProductMonthlyRequirementChange = (index: number, monthlyRequirement: string) => {
    const newProducts = [...leadProducts];
    newProducts[index].monthlyRequirement = monthlyRequirement;
    setLeadProducts(newProducts);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate customerType for new leads
    if (!leadId && !customerType) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer type.',
      });
      return;
    }
    
    // Validate that at least one product is selected
    const validProducts = leadProducts.filter(p => p.productId);
    if (validProducts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one product.',
      });
      return;
    }
    
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const isEdit = !!leadId;
    
    try {
      const url = isEdit ? `/api/leads/${leadId}` : '/api/leads';
      const method = isEdit ? 'PATCH' : 'POST';

      let requestBody: any;
      
      if (isEdit) {
        // When editing, send all fields with allowFullUpdate for admins
        // For non-admins, still send all fields but backend will handle permissions
        requestBody = {
          allowFullUpdate: isAdmin,
          source: formData.get('leadSource') as string,
          companyName: formData.get('companyName') as string,
          gstNo: customerType === 'domestic' ? gstNumber : '',
          vatNumber: customerType === 'international' ? vatNumber : '',
          customerType: customerType || (selectedCountry === 'India' ? 'domestic' : 'international'),
          contactName: formData.get('contactName') as string,
          designation: formData.get('designation') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          country: customerType === 'domestic' ? 'India' : (formData.get('country') as string || selectedCountry),
          state: formData.get('state') as string,
          city: formData.get('city') as string,
          billingAddress: formData.get('billingAddress') as string,
          industry: formData.get('industry') as string,
          productInterest: JSON.stringify(validProducts),
          // For backward compatibility, also send first product's application and monthlyRequirement
          application: validProducts[0]?.application || '',
          monthlyRequirement: validProducts[0]?.monthlyRequirement || '',
          status: formData.get('leadStatus') as string,
          followUpDate: (formData.get('followUpDate') as string) || null,
          contactMethod: formData.get('contactMethod') as string,
          notes: formData.get('notes') as string,
          ownerId: assignedSalesperson || null,
        };
      } else {
        // When creating, send all fields
        requestBody = {
          leadSource: formData.get('leadSource') as string,
          companyName: formData.get('companyName') as string,
          gstNo: customerType === 'domestic' ? gstNumber : '',
          vatNumber: customerType === 'international' ? vatNumber : '',
          customerType: customerType || (selectedCountry === 'India' ? 'domestic' : 'international'),
          contactName: formData.get('contactName') as string,
          designation: formData.get('designation') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          country: customerType === 'domestic' ? 'India' : (formData.get('country') as string || selectedCountry),
          state: formData.get('state') as string,
          city: formData.get('city') as string,
          billingAddress: formData.get('billingAddress') as string,
          productInterest: JSON.stringify(validProducts),
          // For backward compatibility, also send first product's application and monthlyRequirement
          application: validProducts[0]?.application || '',
          monthlyRequirement: validProducts[0]?.monthlyRequirement || '',
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

  const handleProceedWithDuplicates = () => {
    setDuplicateWarningOpen(false);
    if (pendingSubmit) {
      pendingSubmit();
      setPendingSubmit(null);
    }
  };

  const handleCancelDuplicates = () => {
    setDuplicateWarningOpen(false);
    setDuplicateMatches([]);
    setPendingSubmit(null);
  };

  return (
    <div>
      <DuplicateWarningDialog
        open={duplicateWarningOpen}
        onOpenChange={setDuplicateWarningOpen}
        duplicates={duplicateMatches}
        onProceed={handleProceedWithDuplicates}
        onCancel={handleCancelDuplicates}
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {leadId ? 'Edit Lead' : 'Add New Lead'}
        </h1>
        <p className="text-muted-foreground">
          {leadId ? 'Update the details for this sales lead.' : 'Enter the details for the new sales lead.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>Fill in the form below to add a new lead to the pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSubmit}>
            
            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Details</h3>
              {!leadId && (
                <div className="mb-4">
                  <Label htmlFor="customerType">Customer Type *</Label>
                  <Select
                    name="customerType"
                    required
                    value={customerType}
                    onValueChange={(value: 'domestic' | 'international') => setCustomerType(value)}
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">Domestic</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select whether the customer is based in India (Domestic) or outside India (International)
                  </p>
                </div>
              )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <Label htmlFor="billingAddress">Company Address</Label>
                        <Input
                          id="billingAddress"
                          name="billingAddress"
                          placeholder="e.g. 123 Main Street, Industrial Area"
                          defaultValue={initialValues?.billingAddress}
                        />
                    </div>
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="e.g. Ahmedabad"
                          defaultValue={initialValues?.city}
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
                        />
                    </div>
                    <div>
                        <Label htmlFor="country">Country</Label>
                        <Select
                          name="country"
                          required
                          onValueChange={setSelectedCountry}
                          value={selectedCountry || initialValues?.country || undefined}
                          disabled={customerType === 'domestic'}
                        >
                            <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {customerType === 'domestic' && (
                          <p className="text-xs text-muted-foreground mt-1">Automatically set to India for domestic customers</p>
                        )}
                    </div>
                    {customerType === 'domestic' && (
                        <div>
                            <Label htmlFor="gstNo">GST Number (Optional)</Label>
                            <Input
                              id="gstNo"
                              name="gstNo"
                              placeholder="e.g. 24AAABC1234D1Z2"
                              value={gstNumber}
                              onChange={(e) => setGstNumber(e.target.value)}
                            />
                        </div>
                    )}
                    {customerType === 'international' && (
                        <div>
                            <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                            <Input
                              id="vatNumber"
                              name="vatNumber"
                              placeholder="e.g. GB123456789"
                              value={vatNumber}
                              onChange={(e) => setVatNumber(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <Separator />

            {/* Business Context */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Context</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    placeholder="e.g. Pharmaceuticals"
                    defaultValue={initialValues?.industry}
                  />
                </div>
              </div>
              
              {/* Multiple Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Products & Requirements</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </div>
                <div className="space-y-4">
                  {leadProducts.map((product, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Product {index + 1}</h4>
                        {leadProducts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProduct(index)}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Product *</Label>
                          <ProductCombobox
                            products={products}
                            onSelectProduct={(productId) => handleProductChange(index, productId)}
                            value={product.productId}
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <Label>Application / End Use</Label>
                          <Input
                            placeholder="e.g. Resin Manufacturing"
                            value={product.application || ''}
                            onChange={(e) => handleProductApplicationChange(index, e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Monthly Requirement (MTS)</Label>
                          <Input
                            type="number"
                            placeholder="e.g. 100"
                            value={product.monthlyRequirement || ''}
                            onChange={(e) => handleProductMonthlyRequirementChange(index, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
                              value={assignedSalesperson || initialValues?.assignedSalesperson || ''}
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

        {leadId && (
          <div className="lg:col-span-1">
            <ActivityTimeline entityType="lead" entityId={leadId} />
          </div>
        )}
      </div>
    </div>
  );
}

// ProductCombobox component for searchable product selection
function ProductCombobox({
  products,
  onSelectProduct,
  value,
  disabled,
}: {
  products: Product[];
  onSelectProduct: (productId: string) => void;
  value: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedProductName = useMemo(() => {
    return products.find((product) => product.id === value)?.name;
  }, [products, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          type="button"
        >
          {value ? selectedProductName : 'Select product...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandEmpty>No product found.</CommandEmpty>
          <CommandList className="max-h-[300px]">
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelectProduct(product.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === product.id ? 'opacity-100' : 'opacity-0')}
                  />
                  {product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
