'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentManager } from '@/components/documents/document-manager';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to load product',
          description: 'Could not load the product. Please try again.',
        });
        router.push('/inventory/products');
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load product',
        description: 'Could not load the product. Please try again.',
      });
      router.push('/inventory/products');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Button variant="outline" onClick={() => router.push('/inventory/products')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/inventory/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">{product.name}</h1>
            {product.srplId && (
              <p className="text-muted-foreground">SRPL ID: {product.srplId}</p>
            )}
          </div>
        </div>
        <Button onClick={() => router.push(`/inventory/products/edit/${productId}`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Basic product details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm font-medium">{product.name}</p>
            </div>
            {product.sku && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <p className="text-sm font-medium">{product.sku}</p>
              </div>
            )}
            {product.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
            {product.unitPrice !== null && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                <p className="text-sm font-medium">
                  {product.currency || 'INR'} {product.unitPrice?.toFixed(2) || '0.00'}
                </p>
              </div>
            )}
            {product.stockQty !== null && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                <p className="text-sm font-medium">{product.stockQty}</p>
              </div>
            )}
            {product.hsnCode && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">HSN Code</label>
                <p className="text-sm font-medium">{product.hsnCode}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Metadata and timestamps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.createdAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm">{new Date(product.createdAt).toLocaleString()}</p>
              </div>
            )}
            {product.updatedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{new Date(product.updatedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents Section - Shows all documents linked to this product */}
      <DocumentManager
        entityType="product"
        entityId={productId}
        productId={productId}
      />
    </div>
  );
}

