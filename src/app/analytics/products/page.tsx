'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Package, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductDemandWidget } from '@/components/analytics/product-demand-widget';
import { ProductTopWidget } from '@/components/analytics/product-top-widget';
import { ProductConversionWidget } from '@/components/analytics/product-conversion-widget';
import { ProductTimeSeriesWidget } from '@/components/analytics/product-timeseries-widget';

export default function ProductAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    customerType?: string;
    salesRepId?: string;
  }>({});

  // Default to last 12 months
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 12);
    setFilters({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Product Analytics</h1>
          <p className="text-muted-foreground">Analyze product demand, conversion, and performance metrics.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter analytics by date range, customer type, and salesperson</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerType">Customer Type</Label>
              <Select value={filters.customerType || '__all__'} onValueChange={(v) => handleFilterChange('customerType', v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  <SelectItem value="domestic">Domestic</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="salesRep">Sales Rep</Label>
              <Input
                id="salesRep"
                placeholder="Sales Rep ID"
                value={filters.salesRepId || ''}
                onChange={(e) => handleFilterChange('salesRepId', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Demand Overview */}
      <ProductDemandWidget filters={filters} />

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductTopWidget filters={filters} sortBy="revenue" limit={10} />
        <ProductTopWidget filters={filters} sortBy="conversion" limit={10} />
      </div>

      {/* Conversion Funnel */}
      <ProductConversionWidget filters={filters} />

      {/* Time Series */}
      <ProductTimeSeriesWidget filters={filters} />
    </div>
  );
}

