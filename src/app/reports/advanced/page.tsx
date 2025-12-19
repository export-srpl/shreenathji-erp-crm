'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, TrendingUp, BarChart3, Target, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeightedPipelineWidget } from '@/components/reports/weighted-pipeline-widget';
import { RevenueProjectionWidget } from '@/components/reports/revenue-projection-widget';
import { WinLossWidget } from '@/components/reports/win-loss-widget';
import { SalesCycleWidget } from '@/components/reports/sales-cycle-widget';
import { PerformanceWidget } from '@/components/reports/performance-widget';

export default function AdvancedReportsPage() {
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  }>({});

  // Default to last 3 months
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setFilters({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleExport = async (reportType: string) => {
    // TODO: Implement export functionality
    alert(`Exporting ${reportType} report...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Advanced Reports & Forecasting</h1>
          <p className="text-muted-foreground">Comprehensive sales analytics, projections, and performance metrics.</p>
        </div>
        <Button variant="outline" onClick={() => handleExport('all')}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter reports by date range, pipeline, and salesperson</CardDescription>
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
              <Label htmlFor="pipeline">Pipeline</Label>
              <Input
                id="pipeline"
                placeholder="Pipeline ID"
                value={filters.pipelineId || ''}
                onChange={(e) => handleFilterChange('pipelineId', e.target.value)}
              />
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

      {/* Reports Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Weighted Pipeline</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Projection</TabsTrigger>
          <TabsTrigger value="winloss">Win-Loss Analysis</TabsTrigger>
          <TabsTrigger value="cycle">Sales Cycle</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <WeightedPipelineWidget filters={filters} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueProjectionWidget filters={filters} />
        </TabsContent>

        <TabsContent value="winloss" className="space-y-4">
          <WinLossWidget filters={filters} />
        </TabsContent>

        <TabsContent value="cycle" className="space-y-4">
          <SalesCycleWidget filters={filters} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceWidget filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

