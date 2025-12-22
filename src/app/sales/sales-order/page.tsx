

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

type SalesOrder = {
  id: string;
  srplId?: string | null;
  orderNumber: string;
  status: string;
  orderDate: string;
  customer: {
    companyName: string;
  };
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>;
};

export default function SalesOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchSalesOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/sales-orders');
        if (res.ok) {
          const data = await res.json();
          setSalesOrders(data);
        }
      } catch (error) {
        console.error('Failed to fetch sales orders:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load sales orders',
          description: 'Could not load sales orders. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesOrders();
  }, [toast]);

  const paginatedSalesOrders = salesOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(salesOrders.length / PAGE_SIZE);

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

  const calculateTotal = (items: SalesOrder['items'] | undefined | null) => {
    const safeItems = items ?? [];
    return safeItems.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
  };

  const handleRowClick = (soId: string) => {
    router.push(`/sales/sales-order/${soId}`);
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const handleEdit = (soId: string) => {
    router.push(`/sales/sales-order/edit/${soId}`);
  };

  const handleCreateInvoice = (e: React.MouseEvent, soId: string) => {
      handleActionClick(e, () => {
          router.push(`/sales/create-invoice/create?fromSalesOrder=${soId}`);
      });
  };

  const getStatusVariant = (status: SalesOrder['status']) => {
    switch(status) {
      case 'Confirmed':
        return 'default';
      case 'Partially Executed':
        return 'secondary';
      case 'Completed':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      case 'Draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: SalesOrder['status']) => {
     switch(status) {
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Partially Executed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return '';
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Sales Orders</h1>
          <p className="text-muted-foreground">Create and manage client sales orders.</p>
        </div>
        <Link href="/sales/sales-order/create">
            <Button>
                <PlusCircle className="mr-2" />
                Create Sales Order
            </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Sales Orders</CardTitle>
            <CardDescription>Browse and manage all of your sales orders.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : !salesOrders || salesOrders.length === 0 ? (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No sales orders have been created yet.</p>
                    <p className="text-sm">Click "Create Sales Order" to get started.</p>
                </div>
            ) : (
                <>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">SRPL ID</TableHead>
                            <TableHead>Sales Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedSalesOrders.map((so) => (
                            <TableRow key={so.id} onClick={() => handleRowClick(so.id)} className="cursor-pointer">
                                <TableCell>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {(so as any).srplId || '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">{so.orderNumber}</TableCell>
                                <TableCell>{so.customer?.companyName || 'N/A'}</TableCell>
                                <TableCell>{(so as any).poNumber || 'N/A'}</TableCell>
                                <TableCell>{new Date(so.orderDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">{calculateTotal(so.items).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                <TableCell className="text-center">
                                    <Badge 
                                        variant={getStatusVariant(so.status as any)}
                                        className={getStatusColor(so.status as any)}
                                    >
                                        {so.status}
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
                                            <DropdownMenuItem onClick={(e) => handleActionClick(e, () => handleEdit(so.id))}>
                                                Edit
                                            </DropdownMenuItem>
                                            {so.status !== 'Completed' && so.status !== 'Cancelled' && (
                                                <DropdownMenuItem onClick={(e) => handleCreateInvoice(e, so.id)}>
                                                    Create Invoice
                                                </DropdownMenuItem>
                                            )}
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
