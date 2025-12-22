

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const PAGE_SIZE = 10;

type Invoice = {
  id: string;
  srplId?: string | null;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  customer: {
    companyName: string;
  };
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>;
};

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/invoices');
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load invoices',
          description: 'Could not load invoices. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [toast]);

  const paginatedInvoices = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);

  const handleNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrev = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const calculateTotal = (items: Invoice['items']) => {
    return items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
  };

  const handleRowClick = (invoiceId: string) => {
    router.push(`/sales/create-invoice/${invoiceId}`);
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const handleEdit = (invoiceId: string) => {
    router.push(`/sales/create-invoice/edit/${invoiceId}`);
  };

  const handleDownload = (e: React.MouseEvent, invoiceId: string) => {
    handleActionClick(e, () => {
      console.log(`Requesting PDF download for invoice ${invoiceId} from backend.`);
      toast({
        title: 'PDF Download Requested',
        description: 'This feature requires a backend implementation to generate the PDF.',
        variant: 'destructive'
      });
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Invoices</h1>
          <p className="text-muted-foreground">Create and manage your sales invoices.</p>
        </div>
        <Link href="/sales/create-invoice/create">
            <Button>
                Create Invoice
                <PlusCircle className="ml-2" />
            </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>Browse and manage all of your invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No invoices have been created yet.</p>
              <p className="text-sm">Click "Create Invoice" to get started.</p>
            </div>
          ) : (
            <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[140px]">SRPL ID</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedInvoices.map((invoice) => (
                        <TableRow key={invoice.id} onClick={() => handleRowClick(invoice.id)} className="cursor-pointer">
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                {(invoice as any).srplId || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{invoice.customer?.companyName || 'N/A'}</TableCell>
                            <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{calculateTotal(invoice.items).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={
                                    invoice.status === 'Paid' ? 'default' : 
                                    invoice.status === 'Overdue' ? 'destructive' : 'secondary'
                                }
                                className={
                                  invoice.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                  invoice.status === 'Overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }
                                >
                                    {invoice.status}
                                </Badge>
                            </TableCell>
                             <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => handleActionClick(e, () => handleEdit(invoice.id))}>
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleDownload(e, invoice.id)}>
                                            Download PDF
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
                    disabled={page === 0}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={page >= totalPages - 1}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
