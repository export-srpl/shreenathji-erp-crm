
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect } from 'react';
import type { Payment, Customer, SalesDocument } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';


type AddPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentAdded: (payment: Omit<Payment, 'id'>) => void;
};

const paymentMethods: Payment['paymentMethod'][] = ['Bank Transfer', 'Cheque', 'Credit Card', 'Other'];

export function AddPaymentDialog({ open, onOpenChange, onPaymentAdded }: AddPaymentDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod'] | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch customers
  const customersCollection = useMemoFirebase(() => (firestore && user ? collection(firestore, 'clients') : null), [firestore, user]);
  const { data: customers } = useCollection<Customer>(customersCollection);

  // Fetch invoices for the selected customer
  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedCustomer) return null;
    return query(collection(firestore, 'invoices'), where('customerId', '==', selectedCustomer.id));
  }, [firestore, user, selectedCustomer]);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<SalesDocument>(invoicesQuery);


  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedInvoiceId('');
    setPaymentDate('');
    setAmount('');
    setPaymentMethod('');
    setTransactionId('');
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || !selectedInvoiceId || !paymentDate || !amount || !paymentMethod) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all required fields.',
        });
        return;
    }

    setIsSubmitting(true);
    const selectedInvoice = invoices?.find(inv => inv.id === selectedInvoiceId);

    const paymentData: Omit<Payment, 'id'> = {
        clientId: selectedCustomer.id,
        clientName: selectedCustomer.companyName,
        invoiceId: selectedInvoiceId,
        invoiceNumber: selectedInvoice?.id || 'N/A',
        paymentDate,
        amount: Number(amount),
        paymentMethod,
        transactionId,
        status: 'Pending', // Default status
    };
    
    onPaymentAdded(paymentData);
    
    setIsSubmitting(false);
    onOpenChange(false);
    resetForm();
  };
  
  useEffect(() => {
      if(!open) {
          resetForm();
      }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
             Enter the details for the payment received. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="customer">Client</Label>
                 <CustomerCombobox
                    customers={customers || []}
                    onSelectCustomer={(customerId) => {
                        const customer = customers?.find(c => c.id === customerId);
                        setSelectedCustomer(customer || null);
                        setSelectedInvoiceId(''); // Reset invoice selection
                    }}
                    value={selectedCustomer?.id || ''}
                    disabled={isSubmitting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="invoice">Invoice</Label>
                <Select onValueChange={setSelectedInvoiceId} value={selectedInvoiceId} disabled={!selectedCustomer || isLoadingInvoices || isSubmitting}>
                    <SelectTrigger id="invoice">
                        <SelectValue placeholder={isLoadingInvoices ? "Loading invoices..." : "Select an invoice"} />
                    </SelectTrigger>
                    <SelectContent>
                        {invoices && invoices.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                                Invoice #{inv.id} - {inv.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received</Label>
                    <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input id="paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required disabled={isSubmitting} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                     <Select onValueChange={(value) => setPaymentMethod(value as Payment['paymentMethod'])} value={paymentMethod} required disabled={isSubmitting}>
                        <SelectTrigger id="paymentMethod">
                            <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                        <SelectContent>
                            {paymentMethods.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="transactionId">Transaction ID / Cheque No.</Label>
                    <Input id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} disabled={isSubmitting} />
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isSubmitting ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function CustomerCombobox({ customers, onSelectCustomer, value, disabled }: { customers: Customer[], onSelectCustomer: (customerId: string) => void, value: string, disabled?: boolean }) {
  const [open, setOpen] = useState(false)

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
            ? customers.find((customer) => customer.id === value)?.companyName
            : "Select client..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search client..." />
          <CommandEmpty>No client found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
                {customers.map((customer) => (
                    <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={(currentValue) => {
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
