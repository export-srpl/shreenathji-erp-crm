
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, MoreHorizontal, Trash2, Pencil, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AddProductDialog } from '@/components/inventory/add-product-dialog';
import { ImportProductsDialog } from '@/components/inventory/import-products-dialog';
import type { Product } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, startAfter, endBefore, limitToLast, DocumentData, Query } from "firebase/firestore";

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const [pagination, setPagination] = useState<{
    cursors: (DocumentData | null)[],
    page: number
  }>({ cursors: [null], page: 0 });
  const [direction, setDirection] = useState<'next' | 'prev' | 'none'>('none');

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    let q: Query<DocumentData>;
    const baseQuery = collection(firestore, 'products');

    if (direction === 'next') {
        q = query(baseQuery, startAfter(pagination.cursors[pagination.page]), limit(PAGE_SIZE));
    } else if (direction === 'prev') {
        q = query(baseQuery, endBefore(pagination.cursors[pagination.page]), limitToLast(PAGE_SIZE));
    } else {
        q = query(baseQuery, limit(PAGE_SIZE));
    }
    return q;
  }, [firestore, user, pagination.page, direction]);

  const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);

  const isLoading = isAuthLoading || isProductsLoading;

  const handleNext = () => {
    if (!products || products.length < PAGE_SIZE) return;
    const nextCursor = products[products.length - 1]._raw || null;
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

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to add product:", newProduct);
    toast({
        title: 'Product Add Queued',
        description: `Product "${newProduct.productName}" will be added shortly.`,
    });
  };
  
  const handleEditProduct = async (updatedProduct: Product) => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to update product:", updatedProduct);
    setProductToEdit(undefined);
    toast({
        title: 'Product Update Queued',
        description: `Product "${updatedProduct.productName}" will be updated shortly.`,
    });
  };
  
  const handleDeleteProduct = (productId: string) => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to delete product:", productId);
    toast({
      title: 'Product Deletion Queued',
      description: 'The product will be removed shortly.',
    });
  };

  const handleImportProducts = (importedProducts: Omit<Product, 'id'>[]) => {
     // This is a placeholder for a secure backend call.
     console.log("Calling backend to import products:", importedProducts);
     toast({
        title: 'Import Queued',
        description: `${importedProducts.length} products are being imported.`,
     });
  };
  
  const openEditDialog = (product: Product) => {
    setProductToEdit(product);
    setAddDialogOpen(true);
  };
  
  const closeDialogs = () => {
    setProductToEdit(undefined);
    setAddDialogOpen(false);
  };

  const handleSelectProduct = (productId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked && products) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = () => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to bulk delete products:", selectedProducts);
    toast({
      title: 'Products Deletion Queued',
      description: `${selectedProducts.length} products will be removed shortly.`,
    });
    setSelectedProducts([]);
  };

  const isAllSelected = products && products.length > 0 && selectedProducts.length === products.length;
  const isSomeSelected = selectedProducts.length > 0 && products && selectedProducts.length < products.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog.</p>
        </div>
        {selectedProducts.length === 0 ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2" />
              Import Bulk Products
            </Button>
            <Button onClick={() => { setProductToEdit(undefined); setAddDialogOpen(true); }}>
              <PlusCircle className="mr-2" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline">
                <Pencil className="mr-2" />
                Bulk Edit ({selectedProducts.length})
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2" />
              Delete ({selectedProducts.length})
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Browse and manage your company's products.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No products have been added yet.</p>
              <p className="text-sm">Click "Add Product" or "Import Bulk Products" to get started.</p>
            </div>
          ) : (
            <>
             <Table>
              <TableHeader>
                <TableRow>
                   <TableHead padding="checkbox" className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected || (isSomeSelected && 'indeterminate')}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow 
                    key={product.id}
                    data-state={selectedProducts.includes(product.id) && "selected"}
                  >
                     <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked)}
                        aria-label={`Select product ${product.productName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.hsnCode}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600"
                          >
                            Delete
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
                    disabled={pagination.page === 0}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!products || products.length < PAGE_SIZE}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <AddProductDialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
            if (!open) {
                closeDialogs();
            } else {
                setAddDialogOpen(true);
            }
        }}
        onProductAction={productToEdit ? handleEditProduct : handleAddProduct}
        productToEdit={productToEdit}
      />
      <ImportProductsDialog 
        open={isImportDialogOpen} 
        onOpenChange={setImportDialogOpen}
        onProductsImported={handleImportProducts}
       />
    </div>
  );
}
