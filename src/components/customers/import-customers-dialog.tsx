'use client';

import React, { useState } from 'react';
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
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/types';

type ImportCustomersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomersImported: (customers: Omit<Customer, 'id'>[]) => void;
};

export function ImportCustomersDialog({ open, onOpenChange, onCustomersImported }: ImportCustomersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            toast({ variant: 'destructive', title: 'Invalid CSV', description: 'File is empty or contains only a header.' });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['companyName', 'customerType', 'billingAddress', 'shippingAddress', 'country', 'contactName', 'contactEmail', 'contactPhone'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid CSV Format',
                description: `File must contain the following columns: ${missingHeaders.join(', ')}.`,
            });
            return;
        }
        
        const importedCustomers: Omit<Customer, 'id'>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const data = lines[i].split(',').map(d => d.trim());
          const customerObject = headers.reduce((obj, header, index) => {
              obj[header] = data[index];
              return obj;
          }, {} as any);

          if (requiredHeaders.every(h => customerObject[h])) {
             importedCustomers.push({
                companyName: customerObject.companyName,
                customerType: customerObject.customerType,
                billingAddress: customerObject.billingAddress,
                shippingAddress: customerObject.shippingAddress,
                country: customerObject.country,
                state: customerObject.state || '',
                cityState: customerObject.cityState || '',
                gstNo: customerObject.gstNo || '',
                contactPerson: {
                    name: customerObject.contactName,
                    email: customerObject.contactEmail,
                    phone: customerObject.contactPhone,
                    designation: customerObject.contactDesignation || '',
                }
             });
          }
        }

        if (importedCustomers.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Customers Found',
                description: 'The CSV file does not contain valid customer data matching the required headers.',
            });
            return;
        }

        onCustomersImported(importedCustomers);
        onOpenChange(false);
        setFile(null);
      } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'There was an error processing the CSV file.',
        });
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import Bulk Customers</DialogTitle>
            <DialogDescription>
              Upload a CSV file with customer data. Required headers: `companyName`, `customerType`, `billingAddress`, `shippingAddress`, `country`, `contactName`, `contactEmail`, `contactPhone`.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csvFile">Upload CSV</Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              <UploadCloud className="mr-2" />
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
