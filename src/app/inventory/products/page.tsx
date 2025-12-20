
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, MoreHorizontal, Trash2, Pencil, Loader2, Check, X } from "lucide-react";
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
import { SearchBar } from "@/components/data-table/search-bar";
import { SortBy, SortOption } from "@/components/data-table/sort-by";
import { FilterPanel, FilterOption } from "@/components/data-table/filter-panel";
import { Pagination } from "@/components/data-table/pagination";
import { Progress } from "@/components/ui/progress";

const DEFAULT_PAGE_SIZE = 10;

const sortOptions: SortOption[] = [
  { value: 'productName-asc', label: 'Product Name (A-Z)' },
  { value: 'productName-desc', label: 'Product Name (Z-A)' },
  { value: 'category-asc', label: 'Category (A-Z)' },
  { value: 'category-desc', label: 'Category (Z-A)' },
  { value: 'sku-asc', label: 'SKU (A-Z)' },
  { value: 'sku-desc', label: 'SKU (Z-A)' },
  { value: 'hsnCode-asc', label: 'HSN Code (A-Z)' },
];

const filterOptions: FilterOption[] = [
  {
    key: 'category',
    label: 'Category',
    type: 'text',
  },
  {
    key: 'hsnCode',
    label: 'HSN Code',
    type: 'text',
  },
];

export default function ProductsPage() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('productName-asc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [importInProgress, setImportInProgress] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importCompleted, setImportCompleted] = useState(0);
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [importErrors, setImportErrors] = useState<{ name: string; sku?: string; row?: number; error: string }[]>([]);
  const importCancelledRef = useRef(false);
  const [documentStatus, setDocumentStatus] = useState<Record<string, { TDS: boolean; MSDS: boolean; COA: boolean }>>({});

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error Response:', errorData);
          throw new Error(errorData.error || errorData.details || 'Failed to fetch products');
        }
        const data = await res.json();
        // Map Prisma Product to frontend Product type
        const mappedProducts: Product[] = data.map((p: any) => ({
          id: p.id,
          productName: p.name,
          category: p.description || 'Uncategorized',
          sku: p.sku || '',
          hsnCode: p.hsnCode || '',
        }));
        setAllProducts(mappedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load products',
          description: error instanceof Error ? error.message : 'Could not fetch products from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  // Fetch document status for products
  useEffect(() => {
    const fetchDocumentStatus = async () => {
      if (allProducts.length === 0) return;
      
      try {
        const productIds = allProducts.map(p => p.id).join(',');
        const res = await fetch(`/api/products/document-status?productIds=${productIds}`);
        if (res.ok) {
          const status = await res.json();
          setDocumentStatus(status);
        }
      } catch (error) {
        console.error('Failed to fetch document status:', error);
      }
    };

    fetchDocumentStatus();
  }, [allProducts]);

  // Filter, search, and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...allProducts];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.productName?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          (product.sku || '').toLowerCase().includes(query) ||
          (product.hsnCode || '').toLowerCase().includes(query)
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        result = result.filter((product) => {
          const productValue = (product as any)[key];
          return String(productValue || '').toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    const [sortField, sortDirection] = sortBy.split('-');
    result.sort((a, b) => {
      let aValue: any = (a as any)[sortField];
      let bValue: any = (b as any)[sortField];

      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return result;
  }, [allProducts, searchQuery, filters, sortBy]);

  // Paginate results
  const pagedProducts = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAndSortedProducts.slice(start, start + pageSize);
  }, [filteredAndSortedProducts, currentPage, pageSize]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filters, sortBy]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newProduct.productName,
          name: newProduct.productName,
          sku: newProduct.sku,
          hsnCode: newProduct.hsnCode,
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
        sku: saved.sku || '',
        hsnCode: saved.hsnCode || '',
      };

      // Use functional update to avoid stale state and accidental duplicates
      setAllProducts((prev) => {
        // If product already exists (should not normally happen here), replace it
        const existingIndex = prev.findIndex((p) => p.id === mapped.id);
        if (existingIndex >= 0) {
          return prev.map((p, idx) => (idx === existingIndex ? mapped : p));
        }
        return [mapped, ...prev];
      });
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
          sku: updatedProduct.sku,
          hsnCode: updatedProduct.hsnCode,
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
        sku: saved.sku || '',
        hsnCode: saved.hsnCode || '',
      };

      // Functional update to ensure we don't duplicate IDs in state
      setAllProducts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
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
    const product = allProducts.find((p: Product) => p.id === productId);
    const productName = product?.productName || 'Product';

    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    // Optimistic update - remove from UI immediately
    const previousProducts = allProducts;
    setAllProducts(allProducts.filter(p => p.id !== productId));

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setAllProducts(previousProducts);
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to delete product');
      }

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
      let updatedCount = 0;
      let failCount = 0;
      const seenSkus = new Set<string>();

      setImportInProgress(true);
      setImportTotal(importedProducts.length);
      setImportCompleted(0);
      setImportStartedAt(Date.now());
      setImportErrors([]);
      importCancelledRef.current = false;

      for (let index = 0; index < importedProducts.length; index++) {
        const product = importedProducts[index];
        const rowNumber = index + 1;
        const sku = (product.sku || '').trim();

        // Validate duplicate SKUs within the import file itself
        if (sku) {
          if (seenSkus.has(sku)) {
            failCount++;
            setImportErrors((prev) => [
              ...prev,
              {
                name: product.productName,
                sku,
                row: rowNumber,
                error: `Duplicate SKU "${sku}" in import file (row ${rowNumber}). Only the first occurrence is processed.`,
              },
            ]);
            setImportCompleted((prev) => prev + 1);
            continue;
          }
          seenSkus.add(sku);
        }
        // Allow user to cancel long-running imports
        if (importCancelledRef.current) {
          toast({
            title: 'Import cancelled',
            description: `Stopped after importing ${importCompleted} of ${importTotal} products.`,
          });
          break;
        }

        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName: product.productName,
              name: product.productName,
              sku: product.sku,
              hsnCode: product.hsnCode,
              description: product.category,
              upsert: true, // Enable upsert mode - update if exists, create if not
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

            // Safely merge into list using functional update so state is never stale
            setAllProducts((prev) => {
              const existingIndex = prev.findIndex(
                (p) => p.id === saved.id || (saved.sku && p.hsnCode === saved.sku),
              );

              if (existingIndex >= 0) {
                updatedCount++;
                return prev.map((p, idx) => (idx === existingIndex ? mapped : p));
              } else {
                successCount++;
                return [mapped, ...prev];
              }
            });
          } else {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            failCount++;
            setImportErrors((prev) => [
              ...prev,
              {
                name: product.productName,
                sku: sku || undefined,
                row: rowNumber,
                error: errorData.error || 'Unknown error',
              },
            ]);
            console.error(
              `Failed to import ${product.productName} (row ${rowNumber}, SKU "${sku}") :`,
              errorData.error,
            );
          }
        } catch (err) {
          failCount++;
          setImportErrors((prev) => [
            ...prev,
            {
              name: product.productName,
              sku: sku || undefined,
              row: rowNumber,
              error: err instanceof Error ? err.message : 'Unexpected error',
            },
          ]);
          console.error(`Error importing ${product.productName} (row ${rowNumber}, SKU "${sku}") :`, err);
        }

        // Update progress after each product
        setImportCompleted((prev) => prev + 1);
      }

      // Refresh products list to ensure consistency
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
            const mappedProducts: Product[] = data.map((p: any) => ({
              id: p.id,
              productName: p.name,
              category: p.description || 'Uncategorized',
              sku: p.sku || '',
              hsnCode: p.hsnCode || '',
            }));
          setAllProducts(mappedProducts);
        }
      } catch (refreshError) {
        console.error('Failed to refresh products:', refreshError);
      }

      // Show detailed import results
      const messages = [];
      if (successCount > 0) messages.push(`${successCount} created`);
      if (updatedCount > 0) messages.push(`${updatedCount} updated`);
      if (failCount > 0) messages.push(`${failCount} failed`);

      toast({
        title: failCount === 0 ? 'Import Successful' : 'Import Completed',
        description:
          messages.join(', ') ||
          (failCount === 0
            ? 'Congratulations! All products were imported successfully.'
            : 'Import finished with some issues.'),
      });
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Failed to import products:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to import products',
        description: 'An unexpected error occurred during import.',
      });
    } finally {
      setImportInProgress(false);
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
    if (checked && pagedProducts) {
      setSelectedProducts(pagedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

    const productNames = selectedProducts
      .map(id => allProducts.find(p => p.id === id)?.productName)
      .filter(Boolean)
      .join(', ');

    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} product(s)? This action cannot be undone.`)) {
      return;
    }

    // Optimistic update - remove from UI immediately
    const previousProducts = allProducts;
    const idsToDelete = [...selectedProducts];
    setAllProducts(allProducts.filter(p => !idsToDelete.includes(p.id)));
    setSelectedProducts([]);

    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (!res.ok) {
        // Revert on error
        setAllProducts(previousProducts);
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to delete products');
      }

      const result = await res.json();
      toast({
        title: 'Products Deleted',
        description: `${result.deletedCount || idsToDelete.length} product(s) have been successfully removed.`,
      });
    } catch (error) {
      console.error('Failed to bulk delete products:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };

  const isAllSelected = pagedProducts && pagedProducts.length > 0 && selectedProducts.length === pagedProducts.length;
  const isSomeSelected = selectedProducts.length > 0 && pagedProducts && selectedProducts.length < pagedProducts.length;

  const importProgressPercent =
    importTotal > 0 ? Math.round((importCompleted / importTotal) * 100) : 0;

  let etaSeconds: number | null = null;
  if (importStartedAt && importCompleted > 0 && importCompleted < importTotal) {
    const elapsedMs = Date.now() - importStartedAt;
    const perItem = elapsedMs / importCompleted;
    const remaining = importTotal - importCompleted;
    etaSeconds = Math.round((perItem * remaining) / 1000);
  }

  const handleDownloadErrorReport = () => {
    if (importErrors.length === 0) return;
    const header = 'Row,Product Name,SKU,Error';
    const rows = importErrors.map((e) => {
      const safeRow = e.row ?? '';
      const safeName = (e.name || '').replace(/"/g, '""');
      const safeSku = (e.sku || '').replace(/"/g, '""');
      const safeError = (e.error || '').replace(/"/g, '""');
      return `"${safeRow}","${safeName}","${safeSku}","${safeError}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-errors.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancelImport = () => {
    if (!importInProgress) return;
    importCancelledRef.current = true;
  };

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
          {/* Import progress + errors */}
          {(importInProgress || importCompleted > 0) && (
            <div className="mb-6 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>
                  {importInProgress
                    ? `Importing products: ${importCompleted} of ${importTotal}`
                    : `Import finished: ${importCompleted} of ${importTotal}`}
                </span>
                <span className="text-muted-foreground">
                  {etaSeconds !== null && importInProgress
                    ? `Approx. ${etaSeconds}s remaining`
                    : `${importProgressPercent}%`}
                </span>
              </div>
              <Progress value={importProgressPercent} />
              {importInProgress && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelImport}
                  >
                    Cancel import
                  </Button>
                </div>
              )}
              {!importInProgress && importErrors.length === 0 && importTotal > 0 && (
                <p className="text-sm text-emerald-700">
                  Congratulations! All products were imported successfully.
                </p>
              )}
              {!importInProgress && importErrors.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-amber-700">
                  <span>
                    Import completed with {importErrors.length} error
                    {importErrors.length > 1 ? 's' : ''}. You can download the error file for details.
                  </span>
                  <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                    Download error file
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Search, Sort, and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                placeholder="Search products by name, category, HSN code..."
                onSearch={handleSearch}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <SortBy
                options={sortOptions}
                value={sortBy}
                onSortChange={setSortBy}
              />
              <FilterPanel
                filters={filterOptions}
                values={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            </div>
          </div>

          {isLoading ? (
             <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>
                {allProducts.length === 0 ? 'No products have been added yet.' : 'No products match your search or filters.'}
              </p>
              <p className="text-sm">
                {allProducts.length === 0 ? 'Click "Add Product" or "Import Bulk Products" to get started.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <>
            <div className="rounded-lg border overflow-hidden">
             <Table className="table-enhanced">
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
                  <TableHead>SKU</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead className="text-center">TDS</TableHead>
                  <TableHead className="text-center">MSDS</TableHead>
                  <TableHead className="text-center">COA</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProducts.map((product) => (
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
                    <TableCell className="font-medium">
                      <a 
                        href={`/inventory/products/${product.id}`}
                        className="text-primary hover:underline"
                      >
                        {product.productName}
                      </a>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.sku || ''}</TableCell>
                    <TableCell>{product.hsnCode || ''}</TableCell>
                    <TableCell className="text-center">
                      {documentStatus[product.id]?.TDS ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {documentStatus[product.id]?.MSDS ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {documentStatus[product.id]?.COA ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 mx-auto" />
                      )}
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
            </div>
            <div className="mt-4 border-t pt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredAndSortedProducts.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
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
        onProductAction={async (product) => {
          if (productToEdit && 'id' in product) {
            await handleEditProduct(product as Product);
          } else {
            await handleAddProduct(product as Omit<Product, 'id'>);
          }
        }}
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
