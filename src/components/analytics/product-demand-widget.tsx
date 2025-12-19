'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductDemandWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    customerType?: string;
    salesRepId?: string;
  };
}

export function ProductDemandWidget({ filters }: ProductDemandWidgetProps) {
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

        const res = await fetch(`/api/analytics/products/demand?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load product demand:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Demand Overview
        </CardTitle>
        <CardDescription>Aggregated demand across Leads, Deals, Quotes, Sales Orders, and Invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No product data available</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Quotes</TableHead>
                  <TableHead className="text-right">Sales Orders</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{product.productName}</div>
                        {product.productSku && (
                          <div className="text-xs text-muted-foreground">SKU: {product.productSku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{product.leadCount}</TableCell>
                    <TableCell className="text-right">{product.dealCount}</TableCell>
                    <TableCell className="text-right">{product.quoteCount}</TableCell>
                    <TableCell className="text-right">{product.salesOrderCount}</TableCell>
                    <TableCell className="text-right">{product.invoiceCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={product.conversionRate > 20 ? 'default' : 'secondary'}>
                        {product.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{product.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

