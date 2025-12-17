'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AddCustomerPage() {
  const [customerType, setCustomerType] = useState('domestic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [country, setCountry] = useState('India');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (customerType === 'domestic') {
      setCountry('India');
    } else {
      setCountry('');
    }
  }, [customerType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const customerData = {
      customerType,
      companyName: formData.get('companyName') as string,
      gstNo: formData.get('gstNo') as string,
      billingAddress: formData.get('billingAddress') as string,
      shippingAddress: formData.get('shippingAddress') as string,
      state: formData.get('state') as string,
      cityState: formData.get('cityState') as string,
      country: country,
      contactPerson: {
        name: formData.get('contactName') as string,
        email: formData.get('contactEmail') as string,
        designation: formData.get('contactDesignation') as string,
        phone: formData.get('contactPhone') as string,
      }
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!res.ok) {
        throw new Error('Failed to create customer');
      }

      toast({
        title: 'Customer Added',
        description: `Customer "${customerData.companyName}" has been successfully added.`,
      });

      router.push('/customers');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to add customer',
        description: 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Add New Customer</h1>
        <p className="text-muted-foreground">Enter the details for the new customer.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Select customer type and fill in the details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <Label className="font-medium">Customer Type</Label>
              <RadioGroup
                value={customerType}
                onValueChange={setCustomerType}
                className="flex items-center gap-4 mt-2"
                name="customerType"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="domestic" id="r1" />
                  <Label htmlFor="r1">Domestic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="international" id="r2" />
                  <Label htmlFor="r2">International</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" name="companyName" placeholder="e.g. Global Innovations Inc." />
                </div>
                {customerType === 'domestic' && (
                    <div>
                        <Label htmlFor="gstNo">GST No.</Label>
                        <Input id="gstNo" name="gstNo" placeholder="e.g. 24AAABC1234D1Z2" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea id="billingAddress" name="billingAddress" placeholder="123 Main St, Anytown..." rows={4} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea id="shippingAddress" name="shippingAddress" placeholder="456 Industrial Park, Sometown..." rows={4} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customerType === 'domestic' ? (
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" placeholder="e.g. Gujarat" />
                </div>
              ) : (
                <div>
                  <Label htmlFor="cityState">City/State</Label>
                  <Input id="cityState" name="cityState" placeholder="e.g. California" />
                </div>
              )}
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} readOnly={customerType === 'domestic'} placeholder="e.g. United States"/>
              </div>
            </div>
            
            <Separator />
            
            <div>
                <h3 className="text-lg font-medium">Contact Person</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                    <div>
                        <Label htmlFor="contactName">Concern Person Name</Label>
                        <Input id="contactName" name="contactName" placeholder="e.g. John Doe" />
                    </div>
                    <div>
                        <Label htmlFor="contactEmail">Email</Label>
                        <Input id="contactEmail" name="contactEmail" type="email" placeholder="e.g. john.doe@example.com" />
                    </div>
                     <div>
                        <Label htmlFor="contactDesignation">Designation</Label>
                        <Input id="contactDesignation" name="contactDesignation" placeholder="e.g. Purchase Manager" />
                    </div>
                    <div>
                        <Label htmlFor="contactPhone">Phone</Label>
                        <Input id="contactPhone" name="contactPhone" type="tel" placeholder="e.g. +911234567890" />
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Customer'}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
