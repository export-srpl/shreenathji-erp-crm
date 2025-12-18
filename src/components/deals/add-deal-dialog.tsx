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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, ChevronsUpDown, Check, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

type DealStage = 'Prospecting' | 'Technical Discussion' | 'Quotation' | 'Negotiation' | 'Lost' | 'Won';

type Customer = {
  id: string;
  companyName: string;
};

type Product = {
  id: string;
  name: string;
};

type DealItem = {
  productId: string;
  quantity: number;
};

type AddDealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealAdded: () => void;
  dealToEdit?: {
    id: string;
    title: string;
    stage: string;
    customerId: string;
    items: Array<{ productId: string; quantity: number; product: { id: string; name: string } }>;
  };
};

const stages: DealStage[] = [
  'Prospecting',
  'Technical Discussion',
  'Quotation',
  'Negotiation',
  'Lost',
  'Won',
];

export function AddDealDialog({ open, onOpenChange, onDealAdded, dealToEdit }: AddDealDialogProps) {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<DealStage>('Prospecting');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<DealItem[]>([{ productId: '', quantity: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const isEditMode = !!dealToEdit;

  // Load customers and products
  useEffect(() => {
    if (open) {
      setIsLoadingCustomers(true);
      fetch('/api/customers')
        .then((res) => res.json())
        .then((data) => {
          setCustomers(data);
          setIsLoadingCustomers(false);
        })
        .catch((error) => {
          console.error('Failed to load customers:', error);
          setIsLoadingCustomers(false);
        });

      setIsLoadingProducts(true);
      fetch('/api/products')
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          setIsLoadingProducts(false);
        })
        .catch((error) => {
          console.error('Failed to load products:', error);
          setIsLoadingProducts(false);
        });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEditMode && dealToEdit) {
        setTitle(dealToEdit.title);
        setStage(dealToEdit.stage as DealStage);
        setSelectedCustomerId(dealToEdit.customerId);
        setItems(
          dealToEdit.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
          }))
        );
      } else {
        setTitle('');
        setStage('Prospecting');
        setSelectedCustomerId('');
        setItems([{ productId: '', quantity: 0 }]);
      }
    }
  }, [dealToEdit, isEditMode, open]);

  const handleAddProduct = () => {
    setItems([...items, { productId: '', quantity: 0 }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const newItems = [...items];
    newItems[index].productId = productId;
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: string) => {
    const newItems = [...items];
    newItems[index].quantity = parseFloat(quantity) || 0;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !selectedCustomerId) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required fields.',
      });
      return;
    }

    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Products',
        description: 'Please add at least one product with quantity.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditMode ? `/api/deals/${dealToEdit.id}` : '/api/deals';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          stage,
          customerId: selectedCustomerId,
          items: validItems,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save deal');
      }

      toast({
        title: isEditMode ? 'Deal Updated' : 'Deal Created',
        description: `The deal "${title}" has been ${isEditMode ? 'updated' : 'created'} successfully.`,
      });

      onDealAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save deal:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save deal',
        description: 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the details for this deal.'
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
                customers={customers}
                onSelectCustomer={setSelectedCustomerId}
                value={selectedCustomerId}
                disabled={isSubmitting || isLoadingCustomers}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select onValueChange={(value) => setStage(value as DealStage)} value={stage} required>
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products & Quantities</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Product</Label>
                      <ProductCombobox
                        products={products}
                        onSelectProduct={(productId) => handleProductChange(index, productId)}
                        value={item.productId}
                        disabled={isSubmitting || isLoadingProducts}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Quantity (MTS)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.quantity || ''}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || isLoadingCustomers || isLoadingProducts}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Save Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerCombobox({
  customers,
  onSelectCustomer,
  value,
  disabled,
}: {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  value: string;
  disabled?: boolean;
}) {
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
          {value ? selectedCustomerName : 'Select customer...'}
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
                  value={customer.companyName}
                  onSelect={() => {
                    onSelectCustomer(customer.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === customer.id ? 'opacity-100' : 'opacity-0')}
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

function ProductCombobox({
  products,
  onSelectProduct,
  value,
  disabled,
}: {
  products: Product[];
  onSelectProduct: (productId: string) => void;
  value: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedProductName = useMemo(() => {
    return products.find((product) => product.id === value)?.name;
  }, [products, value]);

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
          {value ? selectedProductName : 'Select product...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandEmpty>No product found.</CommandEmpty>
          <CommandList className="max-h-[300px]">
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelectProduct(product.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === product.id ? 'opacity-100' : 'opacity-0')}
                  />
                  {product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
