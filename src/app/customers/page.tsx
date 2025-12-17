
'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Mail, Loader2, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/types';
import { ImportCustomersDialog } from "@/components/customers/import-customers-dialog";

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" color="green" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.52 3.48A11.94 11.94 0 0012.01 0C5.39 0 .04 5.35.04 11.97c0 2.11.55 4.16 1.6 5.97L0 24l6.23-1.63A11.9 11.9 0 0012 24c6.62 0 11.97-5.35 11.97-11.97 0-3.2-1.25-6.21-3.45-8.55zM12 21.6c-1.87 0-3.7-.5-5.29-1.45l-.38-.23-3.7.97.99-3.6-.25-.41A9.57 9.57 0 012.4 12C2.4 6.89 6.89 2.4 12 2.4c2.55 0 4.95.99 6.75 2.79A9.5 9.5 0 0121.6 12c0 5.11-4.49 9.6-9.6 9.6zm5.01-6.96c-.27-.14-1.6-.79-1.84-.88-.24-.09-.41-.14-.59.14-.17.27-.68.88-.83 1.06-.15.18-.31.2-.58.07-.27-.14-1.16-.43-2.2-1.37-.81-.71-1.36-1.59-1.52-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45l-.5-.01c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.34.98 2.63 1.12 2.81.14.18 1.93 2.94 4.67 4.01.65.28 1.15.45 1.54.57.65.21 1.23.18 1.7.11.52-.08 1.6-.66 1.83-1.29.23-.63.23-1.15.16-1.27-.07-.12-.25-.2-.52-.34z"></path></svg>
);

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<{ page: number }>({ page: 0 });
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/customers');
        if (!res.ok) {
          throw new Error('Failed to fetch customers');
        }
        const data = await res.json();

        // Normalise API shape (flat fields) into the Customer type used by the UI.
        const normalised: Customer[] = (data as any[]).map((c) => ({
          id: c.id,
          leadId: c.leadId ?? undefined,
          customerType: (c.customerType as Customer['customerType']) ?? 'domestic',
          companyName: c.companyName ?? '',
          billingAddress: c.billingAddress ?? '',
          shippingAddress: c.shippingAddress ?? '',
          country: c.country ?? '',
          state: c.state ?? undefined,
          cityState: c.cityState ?? undefined,
          gstNo: c.gstNo ?? undefined,
          contactPerson: {
            name: c.contactName ?? '',
            email: c.contactEmail ?? '',
            designation: c.contactTitle ?? '',
            phone: c.contactPhone ?? '',
          },
        }));

        setCustomers(normalised);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Failed to load customers',
          description: 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  const pagedCustomers = useMemo(() => {
    const start = pagination.page * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, pagination.page]);

  const handleNext = () => {
    const maxPage = Math.floor((customers.length - 1) / PAGE_SIZE);
    setPagination(prev => ({
      page: Math.min(prev.page + 1, maxPage),
    }));
  };

  const handlePrev = () => {
    if (pagination.page === 0) return;
    setPagination(prev => ({
      page: prev.page - 1,
    }));
  };


  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete customer');

      setCustomers(prev => prev.filter(c => c.id !== customerId));
      toast({
        title: 'Customer deleted',
        description: 'The customer has been removed successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete customer',
        description: 'Please try again later.',
      });
    }
  };

  const handleImportCustomers = async (importedCustomers: Omit<Customer, 'id'>[]) => {
    try {
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: importedCustomers }),
      });

      if (!res.ok) {
        throw new Error('Failed to import customers');
      }

      const created = await res.json();
      setCustomers(prev => [...created, ...prev]);

      toast({
        title: 'Import complete',
        description: `${created.length} customers were imported successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'There was a problem importing customers. Please try again.',
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2" />
              Import Bulk Customers
            </Button>
            <Link href="/customers/add">
              <Button>
                <PlusCircle className="mr-2" />
                Add New Customer
              </Button>
            </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Browse, search, and manage your customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : customers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No customers have been added yet.</p>
              <p className="text-sm">Click "Add New Customer" to get started.</p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.companyName}</TableCell>
                  <TableCell>
                    {customer.customerType === 'domestic'
                      ? customer.state || customer.country
                      : customer.cityState || customer.country}
                  </TableCell>
                  <TableCell>{customer.contactPerson?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {customer.contactPerson?.email && (
                          <a
                            href={`mailto:${customer.contactPerson.email}`}
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.contactPerson.email}</span>
                          </a>
                        )}
                        {customer.contactPerson?.phone && (
                          <a
                            href={`https://wa.me/${customer.contactPerson.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <WhatsAppIcon />
                            <span>{customer.contactPerson.phone}</span>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={pagination.page === 0}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={customers.length === 0 || (pagination.page + 1) * PAGE_SIZE >= customers.length}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            </>
          )}
        </CardContent>
      </Card>
      <ImportCustomersDialog
        open={isImportDialogOpen}
        onOpenChange={setImportDialogOpen}
        onCustomersImported={handleImportCustomers}
      />
    </div>
  );
}
