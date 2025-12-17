
'use client';

import { useState, useEffect } from 'react';
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

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        // Map Prisma Product to frontend Product type
        const mappedProducts: Product[] = data.map((p: any) => ({
          id: p.id,
          productName: p.name,
          category: p.description || 'Uncategorized',
          hsnCode: p.sku || '',
        }));
        setProducts(mappedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load products',
          description: 'Could not fetch products from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  const handleNext = () => {
    if (products.length < (currentPage + 1) * PAGE_SIZE) return;
    setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage === 0) return;
    setCurrentPage(prev => prev - 1);
  };

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.productName,
          name: newProduct.productName,
          sku: newProduct.hsnCode,
          description: newProduct.category,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to add product');
      }

      const saved = await res.json();
      const mapped: Product = {
        id: saved.id,
        productName: saved.name,
        category: saved.description || 'Uncategorized',
        hsnCode: saved.sku || '',
      };

      setProducts([mapped, ...products]);
      toast({
        title: 'Product Added',
        description: `Product "${newProduct.productName}" has been successfully added.`,
      });
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add product:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };
  
  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      const res = await fetch(`/api/products/${updatedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: updatedProduct.productName,
          name: updatedProduct.productName,
          sku: updatedProduct.hsnCode,
          description: updatedProduct.category,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to update product');
      }

      const saved = await res.json();
      const mapped: Product = {
        id: saved.id,
        productName: saved.name,
        category: saved.description || 'Uncategorized',
        hsnCode: saved.sku || '',
      };

      setProducts(products.map(p => p.id === mapped.id ? mapped : p));
      setProductToEdit(undefined);
      toast({
        title: 'Product Updated',
        description: `Product "${updatedProduct.productName}" has been successfully updated.`,
      });
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };
  
  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const productName = product?.productName || 'Product';

    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to delete product');
      }

      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: 'Product Deleted',
        description: `Product "${productName}" has been successfully removed.`,
      });
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };

  const handleImportProducts = async (importedProducts: Omit<Product, 'id'>[]) => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const product of importedProducts) {
        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName: product.productName,
              name: product.productName,
              sku: product.hsnCode,
              description: product.category,
            }),
          });

          if (res.ok) {
            const saved = await res.json();
            const mapped: Product = {
              id: saved.id,
              productName: saved.name,
              category: saved.description || 'Uncategorized',
              hsnCode: saved.sku || '',
            };
            setProducts(prev => [mapped, ...prev]);
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      toast({
        title: 'Import Completed',
        description: `${successCount} products imported successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      });
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Failed to import products:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to import products',
        description: 'An unexpected error occurred during import.',
      });
    }
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
                   <TableHead className="w-[50px]">
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
                {products.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((product) => (
                  <TableRow 
                    key={product.id}
                    data-state={selectedProducts.includes(product.id) && "selected"}
                  >
                     <TableCell>
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
                    disabled={products.length < (currentPage + 1) * PAGE_SIZE}
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
