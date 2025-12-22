

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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

type ProformaInvoice = {
  id: string;
  srplId?: string | null;
  proformaNumber: string;
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

export default function ProformaInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchProformas = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/proforma-invoices');
        if (res.ok) {
          const data = await res.json();
          setProformas(data);
        }
      } catch (error) {
        console.error('Failed to fetch proforma invoices:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load proforma invoices',
          description: 'Could not load proforma invoices. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProformas();
  }, [toast]);

  const paginatedProformas = proformas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(proformas.length / PAGE_SIZE);

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

  const calculateTotal = (items: ProformaInvoice['items']) => {
    return items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
  };

  const handleRowClick = (proformaId: string) => {
    router.push(`/sales/proforma-invoice/${proformaId}`);
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const handleEdit = (proformaId: string) => {
    router.push(`/sales/proforma-invoice/edit/${proformaId}`);
  };
  
  const handleDownload = (e: React.MouseEvent, proformaId: string) => {
      handleActionClick(e, () => {
          console.log(`Requesting PDF download for proforma ${proformaId} from backend.`);
          toast({
              title: 'PDF Download Requested',
              description: `This feature requires a backend implementation to generate the PDF.`,
              variant: 'destructive'
          });
      });
  };

  const handleConvertToInvoice = (e: React.MouseEvent, proformaId: string) => {
      handleActionClick(e, () => {
          router.push(`/sales/create-invoice/create?fromProforma=${proformaId}`);
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Proforma Invoices</h1>
          <p className="text-muted-foreground">Create and manage proforma invoices.</p>
        </div>
        <Link href="/sales/proforma-invoice/create">
            <Button>
                <PlusCircle className="mr-2" />
                Create Proforma Invoice
            </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Proforma Invoices</CardTitle>
            <CardDescription>Browse and manage all of your proforma invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !proformas || proformas.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No proforma invoices have been created yet.</p>
              <p className="text-sm">Click "Create Proforma Invoice" to get started.</p>
            </div>
          ) : (
            <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[140px]">SRPL ID</TableHead>
                        <TableHead>Proforma #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedProformas.map((proforma) => (
                        <TableRow key={proforma.id} onClick={() => handleRowClick(proforma.id)} className="cursor-pointer">
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                {(proforma as any).srplId || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{proforma.proformaNumber}</TableCell>
                            <TableCell>{proforma.customer?.companyName || 'N/A'}</TableCell>
                            <TableCell>{new Date(proforma.issueDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{calculateTotal(proforma.items).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={proforma.status === 'Paid' ? 'default' : 'secondary'}
                                 className={proforma.status === 'Paid' ? 'bg-green-600' : ''}
                                >
                                    {proforma.status}
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
                                        <DropdownMenuItem onClick={(e) => handleActionClick(e, () => handleEdit(proforma.id))}>
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleConvertToInvoice(e, proforma.id)}>
                                            Convert to Invoice
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleDownload(e, proforma.id)}>
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
