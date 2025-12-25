

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

type Quote = {
  id: string;
  srplId?: string | null;
  quoteNumber: string;
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

export default function QuotePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);

    useEffect(() => {
      const fetchQuotes = async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/quotes');
          if (res.ok) {
            const data = await res.json();
            setQuotes(data);
          }
        } catch (error) {
          console.error('Failed to fetch quotes:', error);
          toast({
            variant: 'destructive',
            title: 'Failed to load quotes',
            description: 'Could not load quotes. Please try again.',
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchQuotes();
    }, [toast]);

    const paginatedQuotes = quotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(quotes.length / PAGE_SIZE);

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

    const calculateTotal = (items: Quote['items'] | undefined | null) => {
      const safeItems = items ?? [];
      return safeItems.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
    };

    const handleRowClick = (quoteId: string) => {
        router.push(`/sales/quote/${quoteId}`);
    };

    const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
        e.stopPropagation();
        callback();
    };
    
    const handleEdit = (quoteId: string) => {
        router.push(`/sales/quote/edit/${quoteId}`);
    };

    const handleDownload = async (e: React.MouseEvent, quoteId: string) => {
        handleActionClick(e, async () => {
            try {
                const res = await fetch(`/api/quotes/${quoteId}/pdf`);
                if (!res.ok) {
                    throw new Error('Failed to generate PDF');
                }
                
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quote-${quoteId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                toast({
                    title: 'PDF Downloaded',
                    description: 'Quote PDF has been downloaded successfully.',
                });
            } catch (error) {
                console.error('PDF generation error:', error);
                toast({
                    variant: 'destructive',
                    title: 'PDF Generation Failed',
                    description: 'Could not generate PDF. Please try again.',
                });
            }
        });
    };
    
    const handleConvertToProforma = (e: React.MouseEvent, quoteId: string) => {
        handleActionClick(e, () => {
            router.push(`/sales/proforma-invoice/create?fromQuote=${quoteId}`);
        });
    };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Quotes</h1>
          <p className="text-muted-foreground">Create and manage sales quotations.</p>
        </div>
        <Link href="/sales/quote/create">
            <Button data-testid="create-quote-button">
                <PlusCircle className="mr-2" />
                Create Quote
            </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Quotes</CardTitle>
            <CardDescription>Browse and manage all of your quotes.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : !quotes || quotes.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    <p>No quotes have been created yet.</p>
                    <p className="text-sm">Click "Create Quote" to get started.</p>
                </div>
            ) : (
                <>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">SRPL ID</TableHead>
                            <TableHead>Quote #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedQuotes.map((quote) => (
                            <TableRow key={quote.id} onClick={() => handleRowClick(quote.id)} className="cursor-pointer">
                                <TableCell>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {(quote as any).srplId || '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                                <TableCell>{quote.customer?.companyName || 'N/A'}</TableCell>
                                <TableCell>{new Date(quote.issueDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">{calculateTotal(quote.items).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={
                                        quote.status === 'Approved' ? 'default' : 
                                        quote.status === 'Sent' ? 'secondary' : 'outline'
                                    }
                                    className={quote.status === 'Approved' ? 'bg-green-600' : ''}
                                    >
                                        {quote.status}
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
                                            <DropdownMenuItem onClick={(e) => handleActionClick(e, () => handleEdit(quote.id))}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => handleConvertToProforma(e, quote.id)}>
                                                Convert to Proforma
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => handleDownload(e, quote.id)}>
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
