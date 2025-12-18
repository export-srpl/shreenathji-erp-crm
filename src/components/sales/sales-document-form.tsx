
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Customer, Product, LineItem, SalesDocument } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { useRouter } from 'next/navigation';
import { Checkbox } from '../ui/checkbox';
import { useUser } from '@/firebase';
import { countries } from '@/lib/countries';

type Address = {
    companyName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

type SalesDocumentFormProps = {
  documentType: 'Quote' | 'Proforma Invoice' | 'Invoice' | 'Sales Order';
  existingDocument?: SalesDocument | null;
  existingCustomer?: Partial<Customer> | null;
  isReadOnly?: boolean;
};

const salesPeople = ['Ashok Lakhani', 'Jay Lakhani', 'Sachin Vadhvana', 'Prakash Gajjar', 'Other'];

const domesticPaymentTerms = ['Advance', 'Immediate', '30 Days', '45 Days', '60 Days', '90 Days'];
const internationalPaymentTerms = ['Advance', '100% Against BL', '100% LC', 'Other'];

const domesticIncoTerms = ['Ex-Factory', 'Delivered'];
const internationalIncoTerms = ['Ex-Factory', 'FOB', 'CFR', 'CIF'];

const indianStates = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

function amountToWords(amount: number): string {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (amount === 0) return 'zero';

    function convertLessThanOneThousand(n: number): string {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result;
    }

    let result = '';
    const crores = Math.floor(amount / 10000000);
    if (crores > 0) {
        result += convertLessThanOneThousand(crores) + 'crore ';
        amount %= 10000000;
    }
    const lakhs = Math.floor(amount / 100000);
    if (lakhs > 0) {
        result += convertLessThanOneThousand(lakhs) + 'lakh ';
        amount %= 100000;
    }
    const thousands = Math.floor(amount / 1000);
    if (thousands > 0) {
        result += convertLessThanOneThousand(thousands) + 'thousand ';
        amount %= 1000;
    }
    result += convertLessThanOneThousand(amount);

    return result.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' only';
}


export function SalesDocumentForm({ documentType, existingDocument, existingCustomer, isReadOnly = false }: SalesDocumentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch customers and products from APIs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [customersRes, productsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
        ]);
        
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData);
        }
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          // Map Prisma product (name) to frontend Product type (productName)
          const mappedProducts = productsData.map((p: any) => ({
            id: p.id,
            productName: p.name,
            category: '',
            hsnCode: '', // TODO: add hsnCode to Prisma schema if needed
          }));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not load customers or products.',
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | Partial<Customer> | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [otherPaymentTerms, setOtherPaymentTerms] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [otherSalesPerson, setOtherSalesPerson] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  
  const [incoTerm, setIncoTerm] = useState('');
  const [portName, setPortName] = useState('');
  const [destPortName, setDestPortName] = useState('');
  const [destCountry, setDestCountry] = useState('');

  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');

  const initialAddress: Address = { companyName: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '' };
  const [billTo, setBillTo] = useState<Address>(initialAddress);
  const [shipTo, setShipTo] = useState<Address>(initialAddress);
  const [sameAsBillTo, setSameAsBillTo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditMode = !!existingDocument;

  const isCustomerSelectionDisabled = isReadOnly || documentType === 'Quote';

  const isDomestic = billTo.country === 'India';

 useEffect(() => {
    if (isLoadingData) return;

    let customerToLoad: Customer | Partial<Customer> | null | undefined = null;
    if (existingCustomer) {
      customerToLoad = existingCustomer;
    } else if (isEditMode && existingDocument) {
      // Handle API response format (with nested customer) or old format
      if ((existingDocument as any).customer) {
        const apiCustomer = (existingDocument as any).customer;
        customerToLoad = {
          id: apiCustomer.id,
          companyName: apiCustomer.companyName,
          customerType: apiCustomer.customerType as 'domestic' | 'international',
          country: apiCustomer.country,
          state: apiCustomer.state,
          gstNo: apiCustomer.gstNo,
          billingAddress: apiCustomer.billingAddress || '',
          shippingAddress: apiCustomer.shippingAddress || '',
          contactPerson: {
            name: apiCustomer.contactName || '',
            email: apiCustomer.contactEmail || '',
            phone: apiCustomer.contactPhone || '',
            designation: apiCustomer.contactTitle || '',
          },
        };
      } else if (existingDocument.customerId && customers.length > 0) {
        customerToLoad = customers.find(c => c.id === existingDocument.customerId);
      }
    }
    
    if (customerToLoad) {
      setSelectedCustomer(customerToLoad);
      
      // Use city from customer if available, otherwise parse from address
      const customerCity = (customerToLoad as any).city || '';
      const [line1, parsedCity, stateZip, country] = (customerToLoad.billingAddress || '').split('\\n');
      const [state, postalCode] = (stateZip || '').split(' ');
      const newBillTo = {
        companyName: customerToLoad.companyName || '',
        addressLine1: line1 || customerToLoad.billingAddress || '',
        addressLine2: '',
        city: customerCity || parsedCity || '',
        state: state || customerToLoad.state || '',
        postalCode: postalCode || '',
        country: customerToLoad.country || '',
      };
      setBillTo(newBillTo);

      if (sameAsBillTo) {
        setShipTo(newBillTo);
      } else {
        const [s_line1, s_parsedCity, s_stateZip, s_country] = (customerToLoad.shippingAddress || '').split('\\n');
        const [s_state, s_postalCode] = (s_stateZip || '').split(' ');
        const newShipTo = {
            companyName: customerToLoad.companyName || '',
            addressLine1: s_line1 || customerToLoad.shippingAddress || '',
            addressLine2: '',
            city: customerCity || s_parsedCity || '',
            state: s_state || customerToLoad.state || '',
            postalCode: s_postalCode || '',
            country: customerToLoad.country || '',
        };
        setShipTo(newShipTo);
      }
      
      // Set sales person if available
      if ((customerToLoad as any).salesPerson) {
        setSalesPerson((customerToLoad as any).salesPerson);
      }
    }
    
    if (isEditMode && existingDocument) {
      // Handle API response format (with nested items.product) or old format
      if ((existingDocument as any).items && Array.isArray((existingDocument as any).items)) {
        const apiItems = (existingDocument as any).items;
        const mappedItems: LineItem[] = apiItems.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || item.productName || '',
          hsnCode: item.product?.hsnCode || item.hsnCode || '',
          qty: item.quantity || item.qty || 0,
          rate: Number(item.unitPrice) || item.rate || 0,
          amount: (item.quantity || item.qty || 0) * (Number(item.unitPrice) || item.rate || 0),
        }));
        setLineItems(mappedItems);
      } else if (existingDocument.lineItems) {
        setLineItems(existingDocument.lineItems);
      }
      
      setCurrency((existingDocument as any).currency || existingDocument.currency || 'INR');
      if ((existingDocument as any).poNumber) setPoNumber((existingDocument as any).poNumber);
      if ((existingDocument as any).poDate) setPoDate((existingDocument as any).poDate);
    }
  }, [isEditMode, existingDocument, existingCustomer, customers, sameAsBillTo, isLoadingData]);

  useEffect(() => {
    if (sameAsBillTo) {
      setShipTo(billTo);
    }
  }, [billTo, sameAsBillTo]);

  useEffect(() => {
    if (isDomestic) {
        setCurrency('INR');
    } else {
        setCurrency('USD');
    }
    setIncoTerm('');
    setPaymentTerms('');
  }, [isDomestic]);

  const handleSelectCustomer = (customerId: string) => {
    if (!customers) return;
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    
    if (customer) {
        // Use city from customer if available, otherwise parse from address
        const customerCity = (customer as any).city || '';
        const [line1, parsedCity, stateZip, country] = (customer.billingAddress || '').split('\\n');
        const [state, postalCode] = (stateZip || '').split(' ');
        
        const newBillTo = {
            companyName: customer.companyName,
            addressLine1: line1 || customer.billingAddress || '',
            addressLine2: '',
            city: customerCity || parsedCity || '',
            state: state || customer.state || '',
            postalCode: postalCode || '',
            country: customer.country,
        }
        setBillTo(newBillTo);
        if (sameAsBillTo) {
            setShipTo(newBillTo);
        } else {
             const [s_line1, s_parsedCity, s_stateZip, s_country] = (customer.shippingAddress || '').split('\\n');
             const [s_state, s_postalCode] = (s_stateZip || '').split(' ');
             const newShipTo = {
                companyName: customer.companyName,
                addressLine1: s_line1 || customer.shippingAddress || '',
                addressLine2: '',
                city: customerCity || s_parsedCity || '',
                state: s_state || customer.state || '',
                postalCode: s_postalCode || '',
                country: customer.country,
            }
            setShipTo(newShipTo);
        }
    }
  };

  const handleAddressChange = (addressType: 'billTo' | 'shipTo', field: keyof Address, value: string) => {
    const setter = addressType === 'billTo' ? setBillTo : setShipTo;
    setter(prev => ({...prev, [field]: value}));
  };

  const handleAddLineItem = () => {
    if (isReadOnly) return;
    const newItem: LineItem = {
      productId: '',
      productName: '',
      hsnCode: '',
      qty: 0,
      rate: 0,
      amount: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (isReadOnly) return;
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    if (isReadOnly || !products) return;
    const updatedItems = [...lineItems];
    const item = updatedItems[index];

    if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
            item.productId = product.id;
            item.productName = product.productName;
            item.hsnCode = product.hsnCode;
        }
    } else {
        if (field === 'qty' || field === 'rate') {
            const numValue = field === 'qty' ? parseInt(value, 10) : parseFloat(value);
            (item[field] as any) = isNaN(numValue) ? 0 : numValue;
        } else {
            (item[field] as any) = value;
        }
    }
    
    item.amount = (item.qty || 0) * (item.rate || 0);
    setLineItems(updatedItems);
};


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(value);
  }

  const subTotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.amount, 0);
  }, [lineItems]);
  
  const taxInfo = useMemo(() => {
    if (!isDomestic || documentType === 'Proforma Invoice') {
        return { showGst: false, sgst: 0, cgst: 0, igst: 0, totalTax: 0 };
    }
    if (billTo.state === 'Gujarat') {
        return { showGst: true, sgst: subTotal * 0.09, cgst: subTotal * 0.09, igst: 0, totalTax: subTotal * 0.18 };
    }
    return { showGst: true, sgst: 0, cgst: 0, igst: subTotal * 0.18, totalTax: subTotal * 0.18 };
  }, [isDomestic, subTotal, billTo.state, documentType]);

  const totalAmount = subTotal + taxInfo.totalTax;

  const handleSubmit = async () => {
    if (!selectedCustomer || lineItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing data',
        description: 'Please select a customer and add at least one line item.',
      });
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      customerId: selectedCustomer.id,
      items: lineItems.map(item => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.rate,
        discountPct: 0,
      })),
      notes: additionalTerms || undefined,
    };

    // Add document-specific fields
    if (documentType === 'Quote') {
      payload.issueDate = new Date().toISOString();
      if (!isEditMode) {
        payload.quoteNumber = `Q-${Date.now()}`;
      }
    } else if (documentType === 'Proforma Invoice') {
      payload.issueDate = new Date().toISOString();
      if (!isEditMode) {
        payload.proformaNumber = `PI-${Date.now()}`;
      }
      // If creating from quote, add quoteId
      if ((existingDocument as any)?.quoteId) {
        payload.quoteId = (existingDocument as any).quoteId;
      }
    } else if (documentType === 'Sales Order') {
      payload.orderDate = new Date().toISOString();
      if (!isEditMode) {
        payload.orderNumber = `SO-${Date.now()}`;
      }
      // If creating from quote/proforma, add source ID
      if ((existingDocument as any)?.id) {
        if ((existingDocument as any).quoteNumber) {
          payload.quoteId = (existingDocument as any).id;
        }
      }
    } else if (documentType === 'Invoice') {
      payload.issueDate = new Date().toISOString();
      if (!isEditMode) {
        payload.invoiceNumber = `INV-${Date.now()}`;
      }
      // If creating from proforma/sales order, add source ID
      if ((existingDocument as any)?.id) {
        if ((existingDocument as any).proformaNumber) {
          payload.proformaId = (existingDocument as any).id;
        } else if ((existingDocument as any).orderNumber) {
          payload.salesOrderId = (existingDocument as any).id;
        }
      }
    }

    const isEdit = isEditMode && existingDocument?.id;
    let url = '';
    let method: 'POST' | 'PATCH' = isEdit ? 'PATCH' : 'POST';

    if (documentType === 'Quote') {
      url = isEdit ? `/api/quotes/${existingDocument!.id}` : '/api/quotes';
    } else if (documentType === 'Proforma Invoice') {
      url = isEdit ? `/api/proforma-invoices/${existingDocument!.id}` : '/api/proforma-invoices';
    } else if (documentType === 'Sales Order') {
      url = isEdit ? `/api/sales-orders/${existingDocument!.id}` : '/api/sales-orders';
    } else if (documentType === 'Invoice') {
      url = isEdit ? `/api/invoices/${existingDocument!.id}` : '/api/invoices';
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      toast({
        title: `${documentType} saved`,
        description: `${documentType} has been saved successfully.`,
      });

      let redirectPath = '/';
      if (documentType === 'Quote') redirectPath = '/sales/quote';
      if (documentType === 'Proforma Invoice') redirectPath = '/sales/proforma-invoice';
      if (documentType === 'Sales Order') redirectPath = '/sales/sales-order';
      if (documentType === 'Invoice') redirectPath = '/sales/create-invoice';

      router.push(redirectPath);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        variant: 'destructive',
        title: `Failed to save ${documentType.toLowerCase()}`,
        description: error.message || 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">

        <fieldset disabled={isReadOnly || isSubmitting} className="space-y-6 group">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              {documentType !== 'Quote' && <CardDescription>Select a customer to auto-fill their details.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label>Customer Name</Label>
                        <CustomerCombobox
                            customers={customers || []}
                            onSelectCustomer={handleSelectCustomer}
                            defaultValue={selectedCustomer?.id}
                            disabled={isCustomerSelectionDisabled || isSubmitting}
                        />
                    </div>
                    {(documentType === 'Invoice' || documentType === 'Sales Order') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="poNumber">PO Number</Label>
                                <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="poDate">PO Date</Label>
                                <Input id="poDate" type="date" value={poDate} onChange={e => setPoDate(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
              
                <div className="pt-6 grid md:grid-cols-2 gap-8">
                    {/* Billing Address */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-lg">Bill To</h3>
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input value={billTo.companyName} onChange={e => handleAddressChange('billTo', 'companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Address Line 1</Label>
                            <Input value={billTo.addressLine1} onChange={e => handleAddressChange('billTo', 'addressLine1', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Address Line 2</Label>
                            <Input value={billTo.addressLine2} onChange={e => handleAddressChange('billTo', 'addressLine2', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Input value={billTo.city} onChange={e => handleAddressChange('billTo', 'city', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>State</Label>
                                 <Select value={billTo.state} onValueChange={value => handleAddressChange('billTo', 'state', value)} disabled={!isDomestic}>
                                    <SelectTrigger><SelectValue placeholder="Select State..." /></SelectTrigger>
                                    <SelectContent>
                                        {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Postal Code</Label>
                                <Input value={billTo.postalCode} onChange={e => handleAddressChange('billTo', 'postalCode', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Select value={billTo.country} onValueChange={value => handleAddressChange('billTo', 'country', value)}>
                                    <SelectTrigger><SelectValue placeholder="Select Country..." /></SelectTrigger>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    {/* Shipping Address */}
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-lg">Ship To</h3>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="sameAsBillTo" checked={sameAsBillTo} onCheckedChange={checked => setSameAsBillTo(!!checked)} />
                                <Label htmlFor="sameAsBillTo">Same as Bill To</Label>
                            </div>
                        </div>
                         <fieldset disabled={sameAsBillTo} className="space-y-4 group">
                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input value={shipTo.companyName} onChange={e => handleAddressChange('shipTo', 'companyName', e.target.value)} className="group-disabled:opacity-70" />
                            </div>
                            <div className="space-y-2">
                                <Label>Address Line 1</Label>
                                <Input value={shipTo.addressLine1} onChange={e => handleAddressChange('shipTo', 'addressLine1', e.target.value)} className="group-disabled:opacity-70"/>
                            </div>
                             <div className="space-y-2">
                                <Label>Address Line 2</Label>
                                <Input value={shipTo.addressLine2} onChange={e => handleAddressChange('shipTo', 'addressLine2', e.target.value)} className="group-disabled:opacity-70"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input value={shipTo.city} onChange={e => handleAddressChange('shipTo', 'city', e.target.value)} className="group-disabled:opacity-70"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Input value={shipTo.state} onChange={e => handleAddressChange('shipTo', 'state', e.target.value)} className="group-disabled:opacity-70"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Postal Code</Label>
                                    <Input value={shipTo.postalCode} onChange={e => handleAddressChange('shipTo', 'postalCode', e.target.value)} className="group-disabled:opacity-70"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Country</Label>
                                    <Select value={shipTo.country} onValueChange={value => handleAddressChange('shipTo', 'country', value)}>
                                        <SelectTrigger className="group-disabled:opacity-70"><SelectValue placeholder="Select Country..." /></SelectTrigger>
                                        <SelectContent>
                                            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                </div>

                {selectedCustomer && (
                    <div className="pt-6 grid md:grid-cols-2 gap-6">
                        <div>
                            <Label>Concern Person</Label>
                            <Input readOnly value={selectedCustomer.contactPerson?.name} className="mt-1 bg-muted group-disabled:opacity-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salesPerson">Sales Person</Label>
                            <Select onValueChange={setSalesPerson} value={salesPerson}>
                            <SelectTrigger id="salesPerson">
                                <SelectValue placeholder="Select Sales Person" />
                            </SelectTrigger>
                            <SelectContent>
                                {salesPeople.map(person => (
                                    <SelectItem key={person} value={person}>{person}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            {salesPerson === 'Other' && (
                                <Input placeholder="Enter Sales Person Name" value={otherSalesPerson} onChange={(e) => setOtherSalesPerson(e.target.value)} />
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>Commercial Terms</CardTitle>
                <CardDescription>Specify payment and delivery terms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="paymentTerms">Terms of Payment</Label>
                        <Select onValueChange={setPaymentTerms} value={paymentTerms} disabled={!selectedCustomer || isReadOnly}>
                            <SelectTrigger id="paymentTerms">
                                <SelectValue placeholder="Select Payment Terms" />
                            </SelectTrigger>
                            <SelectContent>
                                {(isDomestic ? domesticPaymentTerms : internationalPaymentTerms).map(term => (
                                    <SelectItem key={term} value={term}>{term}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         {paymentTerms === 'Other' && !isDomestic && (
                            <div className="mt-2">
                                <Input id="otherPaymentTerms" placeholder="Specify other terms" value={otherPaymentTerms} onChange={e => setOtherPaymentTerms(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="incoTerms">INCO Terms</Label>
                        <Select value={incoTerm} onValueChange={setIncoTerm} disabled={!selectedCustomer || isReadOnly}>
                            <SelectTrigger id="incoTerms">
                                <SelectValue placeholder="Select INCO Terms" />
                            </SelectTrigger>
                            <SelectContent>
                                {(isDomestic ? domesticIncoTerms : internationalIncoTerms).map(term => (
                                    <SelectItem key={term} value={term}>{term}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 {!isDomestic && incoTerm === 'FOB' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor="portName">Port Name</Label>
                            <Input id="portName" placeholder="e.g. Mundra Port" value={portName} onChange={e => setPortName(e.target.value)} />
                        </div>
                    </div>
                )}
                {!isDomestic && (incoTerm === 'CFR' || incoTerm === 'CIF') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor="destPortName">Destination Port Name</Label>
                            <Input id="destPortName" placeholder="e.g. Jebel Ali" value={destPortName} onChange={e => setDestPortName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="destCountry">Destination Country</Label>
                            <Input id="destCountry" placeholder="e.g. UAE" value={destCountry} onChange={e => setDestCountry(e.target.value)} />
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Add products to the {documentType.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Product Name</TableHead>
                            <TableHead>HSN Code</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lineItems.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <ProductCombobox 
                                        products={products || []}
                                        onSelectProduct={(productId) => handleLineItemChange(index, 'productId', productId)}
                                        defaultValue={item.productId}
                                        disabled={isReadOnly}
                                    />
                                </TableCell>
                                <TableCell>{item.hsnCode}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={item.qty || ''}
                                        onChange={(e) => handleLineItemChange(index, 'qty', e.target.value)}
                                        className="text-right"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number"
                                        value={item.rate || ''}
                                        onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                                        className="text-right"
                                    />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(item.amount)}
                                </TableCell>
                                <TableCell>
                                  {!isReadOnly && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLineItem(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!isReadOnly && (
                  <Button variant="outline" className="mt-4" onClick={handleAddLineItem}>
                      <PlusCircle className="mr-2" />
                      Add Line Item
                  </Button>
                )}
                <div className="flex justify-end mt-4">
                    <div className="w-full md:w-1/3 space-y-2 text-right">
                        <div className="flex justify-between">
                            <span className="font-medium">Subtotal</span>
                            <span>{formatCurrency(subTotal)}</span>
                        </div>
                        {taxInfo.showGst && (
                            <>
                                {billTo.state === 'Gujarat' ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="font-medium">SGST @ 9%</span>
                                            <span>{formatCurrency(taxInfo.sgst)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">CGST @ 9%</span>
                                            <span>{formatCurrency(taxInfo.cgst)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="font-medium">IGST @ 18%</span>
                                        <span>{formatCurrency(taxInfo.igst)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
      
          <Card>
              <CardContent className="p-6 space-y-4">
                  <div>
                      <Label>Amount in Words</Label>
                      <p className="text-muted-foreground text-sm font-medium p-2 rounded-md bg-muted min-h-[40px] group-disabled:opacity-100 group-disabled:bg-muted/50">
                          {totalAmount > 0 ? amountToWords(totalAmount) : '...'}
                      </p>
                  </div>
                  <div>
                      <Label>Declaration</Label>
                      <p className="text-muted-foreground text-xs p-2">
                          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                      </p>
                  </div>
              </CardContent>
          </Card>
      </fieldset>

      {!isReadOnly && (
        <div className="flex justify-end mt-6">
            <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : `${isEditMode ? 'Update' : 'Create'} ${documentType}`}
            </Button>
        </div>
      )}
    </div>
  );
}


// Combobox for selecting a customer
function CustomerCombobox({ customers, onSelectCustomer, defaultValue, disabled }: { customers: Customer[], onSelectCustomer: (customerId: string) => void, defaultValue?: string, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue || "")

  useEffect(() => {
    if(defaultValue) setValue(defaultValue)
  }, [defaultValue])

  const selectedCustomerName = useMemo(() => {
    return customers.find((customer) => customer.id === value)?.companyName
  }, [customers, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? selectedCustomerName
            : "Select customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search customer..." />
          <CommandEmpty>No customer found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
                {customers.map((customer) => (
                    <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={(currentValue) => {
                        setValue(currentValue)
                        onSelectCustomer(currentValue)
                        setOpen(false)
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {customer.companyName}
                    </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Combobox for selecting a product in a line item
function ProductCombobox({ products, onSelectProduct, defaultValue, disabled }: { products: Product[], onSelectProduct: (productId: string) => void, defaultValue?: string, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue || "")

   useEffect(() => {
    if(defaultValue) setValue(defaultValue)
  }, [defaultValue])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? products.find((product) => product.id === value)?.productName
            : "Select product..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandEmpty>No product found.</CommandEmpty>
           <CommandList>
                <CommandGroup>
                    {products.map((product) => (
                    <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={(currentValue) => {
                            setValue(currentValue)
                            onSelectProduct(currentValue)
                            setOpen(false)
                        }}
                    >
                        <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            value === product.id ? "opacity-100" : "opacity-0"
                        )}
                        />
                        {product.productName}
                    </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
