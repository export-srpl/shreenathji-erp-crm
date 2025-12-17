
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
import React, { useState, useEffect, useMemo } from 'react';
import type { Deal, Customer } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

type AddDealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealAdded: (deal: Omit<Deal, 'id' | 'contact'>) => void;
  dealToEdit?: Deal;
};

const stages: Deal['stage'][] = [
  'Prospecting',
  'Technical Discussion',
  'Quotation',
  'Negotiation',
];

export function AddDealDialog({ open, onOpenChange, onDealAdded, dealToEdit }: AddDealDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState<number | string>('');
  const [stage, setStage] = useState<Deal['stage']>('Prospecting');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!dealToEdit;

  const customersCollection = useMemoFirebase(() => (firestore && user ? collection(firestore, 'clients') : null), [firestore, user]);
  const { data: customers, isLoading: areCustomersLoading } = useCollection<Customer>(customersCollection);

  useEffect(() => {
    if (open) {
      if (isEditMode && dealToEdit) {
        setTitle(dealToEdit.title);
        setValue(dealToEdit.value);
        setStage(dealToEdit.stage);
        setSelectedCustomerId(dealToEdit.customerId);
      } else {
        setTitle('');
        setValue('');
        setStage('Prospecting');
        setSelectedCustomerId('');
      }
    }
  }, [dealToEdit, isEditMode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

    if (!title || !value || !stage || !selectedCustomerId || !selectedCustomer) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required fields.',
      });
      return;
    }

    setIsSubmitting(true);

    const dealData: Omit<Deal, 'id' | 'contact'> = {
      title,
      value: Number(value),
      stage,
      company: selectedCustomer.companyName,
      customerId: selectedCustomerId,
    };

    onDealAdded(dealData);

    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details for this deal."
                : "Enter the details for the new deal. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Deal Title</Label>
              <Input
                id="title"
                placeholder="e.g. Annual Supply Contract"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
               <CustomerCombobox
                  customers={customers || []}
                  onSelectCustomer={setSelectedCustomerId}
                  value={selectedCustomerId}
                  disabled={isSubmitting || areCustomersLoading}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value (INR)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="e.g. 500000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Initial Stage</Label>
                <Select onValueChange={(value) => setStage(value as Deal['stage'])} value={stage} required>
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || areCustomersLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Save Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function CustomerCombobox({ customers, onSelectCustomer, value, disabled }: { customers: Customer[], onSelectCustomer: (customerId: string) => void, value: string, disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  const selectedCustomerName = useMemo(() => {
    return customers.find((customer) => customer.id === value)?.companyName;
  }, [customers, value]);

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
          {value ? selectedCustomerName : "Select customer..."}
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
                    onSelectCustomer(currentValue);
                    setOpen(false);
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
  );
}
