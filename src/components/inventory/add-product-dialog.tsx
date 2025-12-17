
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
import React, { useState, useEffect } from 'react';
import type { Product } from '@/types';
import { Loader2 } from 'lucide-react';

type AddProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAction: (product: Product | Omit<Product, 'id'>) => Promise<void>;
  productToEdit?: Product;
};

export function AddProductDialog({ open, onOpenChange, onProductAction, productToEdit }: AddProductDialogProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!productToEdit;

  useEffect(() => {
    if (open) {
        if (isEditMode && productToEdit) {
          setProductName(productToEdit.productName);
          setCategory(productToEdit.category);
          setHsnCode(productToEdit.hsnCode);
        } else {
          setProductName('');
          setCategory('');
          setHsnCode('');
        }
    }
  }, [productToEdit, isEditMode, open]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let productData: Product | Omit<Product, 'id'>;
    if (isEditMode && productToEdit) {
      productData = { ...productToEdit, productName, category, hsnCode };
    } else {
      productData = { productName, category, hsnCode };
    }

    await onProductAction(productData);
    
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
             {isEditMode 
                ? "Update the details for this product." 
                : "Enter the details for the new product. Click save when you're done."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productName" className="text-right">
                Product Name
              </Label>
              <Input
                id="productName"
                placeholder="e.g. Formaldehyde"
                className="col-span-3"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                placeholder="e.g. Chemicals"
                className="col-span-3"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hsnCode" className="text-right">
                HSN Code
              </Label>
              <Input
                id="hsnCode"
                placeholder="e.g. 29121100"
                className="col-span-3"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? (isSubmitting ? 'Saving...' : 'Save Changes') : (isSubmitting ? 'Saving...' : 'Save Product')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
