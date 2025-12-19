'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductTopWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    customerType?: string;
    salesRepId?: string;
  };
  sortBy: 'revenue' | 'quantity' | 'conversion';
  limit?: number;
}

export function ProductTopWidget({ filters, sortBy, limit = 10 }: ProductTopWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.customerType) params.append('customerType', filters.customerType);
        if (filters.salesRepId) params.append('salesRepId', filters.salesRepId);
        params.append('sortBy', sortBy);
        params.append('limit', limit.toString());

        const res = await fetch(`/api/analytics/products/top?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load top products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters, sortBy, limit]);

  const getTitle = () => {
    switch (sortBy) {
      case 'revenue':
        return 'Top Products by Revenue';
      case 'quantity':
        return 'Top Products by Quantity';
      case 'conversion':
        return 'Top Products by Conversion';
      default:
        return 'Top Products';
    }
  };

  const getValue = (product: any) => {
    switch (sortBy) {
      case 'revenue':
        return `₹${product.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'quantity':
        return `${product.totalSoldQuantity.toLocaleString('en-IN')} units`;
      case 'conversion':
        return `${product.conversionRate.toFixed(1)}%`;
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>Top {limit} products ranked by {sortBy}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No product data available</p>
        ) : (
          <div className="space-y-4">
            {data.map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{product.productName}</div>
                    {product.productSku && (
                      <div className="text-xs text-muted-foreground">SKU: {product.productSku}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{getValue(product)}</div>
                  {sortBy === 'revenue' && (
                    <div className="text-xs text-muted-foreground">
                      {product.invoiceCount} invoice{product.invoiceCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {sortBy === 'conversion' && (
                    <div className="text-xs text-muted-foreground">
                      {product.leadCount} lead{product.leadCount !== 1 ? 's' : ''} → {product.invoiceCount} sale{product.invoiceCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

