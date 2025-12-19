'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductConversionWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    customerType?: string;
    salesRepId?: string;
  };
}

export function ProductConversionWidget({ filters }: ProductConversionWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const res = await fetch(`/api/analytics/products/conversion?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load product conversion:', error);
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
          <BarChart3 className="h-5 w-5" />
          Product Conversion Funnel
        </CardTitle>
        <CardDescription>Conversion rates from Leads → Deals → Quotes → Sales Orders → Invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No conversion data available</p>
        ) : (
          <div className="space-y-6">
            {data.slice(0, 10).map((product) => (
              <div key={product.productId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{product.productName}</div>
                    {product.productSku && (
                      <div className="text-xs text-muted-foreground">SKU: {product.productSku}</div>
                    )}
                  </div>
                  <Badge variant="outline">
                    Overall: {product.conversionRates.overall.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 text-center p-2 rounded bg-muted">
                    <div className="font-semibold">{product.funnel.leads}</div>
                    <div className="text-xs text-muted-foreground">Leads</div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-2 rounded bg-muted">
                    <div className="font-semibold">{product.funnel.deals}</div>
                    <div className="text-xs text-muted-foreground">Deals</div>
                    <div className="text-xs text-primary mt-1">
                      {product.conversionRates.leadToDeal.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-2 rounded bg-muted">
                    <div className="font-semibold">{product.funnel.quotes}</div>
                    <div className="text-xs text-muted-foreground">Quotes</div>
                    <div className="text-xs text-primary mt-1">
                      {product.conversionRates.dealToQuote.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-2 rounded bg-muted">
                    <div className="font-semibold">{product.funnel.salesOrders}</div>
                    <div className="text-xs text-muted-foreground">Sales Orders</div>
                    <div className="text-xs text-primary mt-1">
                      {product.conversionRates.quoteToSO.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 text-center p-2 rounded bg-primary/10">
                    <div className="font-semibold">{product.funnel.invoices}</div>
                    <div className="text-xs text-muted-foreground">Invoices</div>
                    <div className="text-xs text-primary mt-1">
                      {product.conversionRates.soToInvoice.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

