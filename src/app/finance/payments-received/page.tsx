
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Payment } from '@/types';
import { collection, query, limit, startAfter, DocumentData, endBefore, limitToLast, Query } from 'firebase/firestore';
import { AddPaymentDialog } from '@/components/finance/add-payment-dialog';

const PAGE_SIZE = 10;

export default function PaymentsReceivedPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<{
    cursors: (DocumentData | null)[],
    page: number
  }>({ cursors: [null], page: 0 });
  const [direction, setDirection] = useState<'next' | 'prev' | 'none'>('none');

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q: Query<DocumentData>;
    const baseQuery = collection(firestore, 'payments');

    if (direction === 'next') {
        q = query(baseQuery, startAfter(pagination.cursors[pagination.page]), limit(PAGE_SIZE));
    } else if (direction === 'prev') {
        q = query(baseQuery, endBefore(pagination.cursors[pagination.page]), limitToLast(PAGE_SIZE));
    } else {
        q = query(baseQuery, limit(PAGE_SIZE));
    }
    return q;
  }, [firestore, user, pagination.page, direction]);

  const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsQuery);
  const isLoading = isAuthLoading || isPaymentsLoading;

  const handleNext = () => {
    if (!payments || payments.length < PAGE_SIZE) return;
    const nextCursor = payments[payments.length - 1]._raw || null;
    setPagination(prev => ({
        cursors: [...prev.cursors.slice(0, prev.page + 1), nextCursor],
        page: prev.page + 1
    }));
    setDirection('next');
  };

  const handlePrev = () => {
      if (pagination.page === 0) return;
      setPagination(prev => ({
          cursors: prev.cursors,
          page: prev.page - 1
      }));
      setDirection('prev');
  };

  const handleAddPayment = (payment: Omit<Payment, 'id'>) => {
    // TODO: Call a secure 'createPayment' Cloud Function
    console.log("Calling backend to create payment:", payment);
    toast({
        title: "Payment Queued",
        description: `Payment for invoice ${payment.invoiceNumber} is being recorded.`
    });
  };

  const getStatusVariant = (status: Payment['status']) => {
    switch (status) {
      case 'Cleared':
        return 'default';
      case 'Pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: Payment['status']) => {
     switch(status) {
      case 'Cleared':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return '';
    }
  }


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Payments Received</h1>
          <p className="text-muted-foreground">Track and manage all incoming client payments.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="mr-2" />
            Record Payment
        </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>Browse and manage all recorded payments.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : !payments || payments.length === 0 ? (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No payments have been recorded yet.</p>
                    <p className="text-sm">Click "Record Payment" to get started.</p>
                </div>
            ) : (
                <>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.clientName}</TableCell>
                                <TableCell>{p.invoiceNumber}</TableCell>
                                <TableCell>{p.paymentDate}</TableCell>
                                <TableCell>{p.paymentMethod}</TableCell>
                                <TableCell className="text-right">{p.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                <TableCell className="text-center">
                                    <Badge 
                                        variant={getStatusVariant(p.status)}
                                        className={getStatusColor(p.status)}
                                    >
                                        {p.status}
                                    </Badge>
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
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
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
                        disabled={!payments || payments.length < PAGE_SIZE}
                    >
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
                </>
            )}
        </CardContent>
      </Card>
      <AddPaymentDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onPaymentAdded={handleAddPayment}
       />
    </div>
  );
}
