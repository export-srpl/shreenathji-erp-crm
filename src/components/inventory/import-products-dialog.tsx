
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
import type { Product } from '@/types';

type ImportProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsImported: (products: Omit<Product, 'id'>[]) => void;
};

export function ImportProductsDialog({ open, onOpenChange, onProductsImported }: ImportProductsDialogProps) {
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
        const lines = csvContent.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.trim());
        
        const nameIndex = headers.findIndex(h => h.toLowerCase() === 'productname' || h.toLowerCase() === 'product name');
        const categoryIndex = headers.findIndex(h => h.toLowerCase() === 'category');
        const hsnIndex = headers.findIndex(h => h.toLowerCase() === 'hsncode' || h.toLowerCase() === 'hsn code');

        if (nameIndex === -1 || categoryIndex === -1 || hsnIndex === -1) {
            toast({
                variant: 'destructive',
                title: 'Invalid CSV Format',
                description: 'File must contain "productName", "category", and "hsnCode" columns.',
            });
            return;
        }

        const importedProducts: Omit<Product, 'id'>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const data = lines[i].split(',');
          if (data.length === headers.length) {
            const productName = data[nameIndex].trim();
            const category = data[categoryIndex].trim();
            const hsnCode = data[hsnIndex].trim();
            
            if (productName && category && hsnCode) {
               importedProducts.push({ productName, category, hsnCode });
            }
          }
        }

        if (importedProducts.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Products Found',
                description: 'The CSV file is empty or does not contain valid product data.',
            });
            return;
        }

        onProductsImported(importedProducts);

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
            <DialogTitle>Import Bulk Products</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your products. The file should have columns for `productName`, `category`, and `hsnCode`.
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
