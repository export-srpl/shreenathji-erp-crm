'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentManager } from '@/components/documents/document-manager';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to load customer',
          description: 'Could not load the customer. Please try again.',
        });
        router.push('/customers');
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load customer',
        description: 'Could not load the customer. Please try again.',
      });
      router.push('/customers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => router.push('/customers')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">{customer.companyName}</h1>
            {customer.srplId && (
              <p className="text-muted-foreground">SRPL ID: {customer.srplId}</p>
            )}
          </div>
        </div>
        <Button onClick={() => router.push(`/customers/add?customerId=${customerId}`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
              <p className="text-sm font-medium">{customer.companyName}</p>
            </div>
            {customer.customerType && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer Type</label>
                <p className="text-sm font-medium capitalize">{customer.customerType}</p>
              </div>
            )}
            {customer.gstNo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">GST Number</label>
                <p className="text-sm font-medium">{customer.gstNo}</p>
              </div>
            )}
            {customer.country && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Country</label>
                <p className="text-sm font-medium">{customer.country}</p>
              </div>
            )}
            {customer.state && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">State</label>
                <p className="text-sm font-medium">{customer.state}</p>
              </div>
            )}
            {customer.city && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">City</label>
                <p className="text-sm font-medium">{customer.city}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Primary contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.contactName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <p className="text-sm font-medium">{customer.contactName}</p>
              </div>
            )}
            {customer.contactEmail && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm font-medium">{customer.contactEmail}</p>
              </div>
            )}
            {customer.contactPhone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm font-medium">{customer.contactPhone}</p>
              </div>
            )}
            {customer.contactTitle && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-sm font-medium">{customer.contactTitle}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {customer.billingAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{customer.billingAddress}</p>
            </CardContent>
          </Card>
        )}

        {customer.shippingAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{customer.shippingAddress}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documents Section - Shows all documents linked to this customer (especially contracts) */}
      <DocumentManager
        entityType="customer"
        entityId={customerId}
        customerId={customerId}
      />
    </div>
  );
}

