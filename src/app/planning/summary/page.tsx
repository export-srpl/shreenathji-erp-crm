'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MonthlyData {
  month: string;
  ordered: number;
  dispatched: number;
  pending: number;
  salesOrderCount: number;
  salesOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    quantity: number;
  }>;
}

interface PlanningSignalData {
  productId: string;
  productName: string;
  productSku: string | null;
  productSrplId: string | null;
  monthlySummary: MonthlyData[];
  totalOrdered: number;
  totalDispatched: number;
  totalPending: number;
}

interface PlanningSignalResponse {
  data: PlanningSignalData[];
  summary: {
    totalProducts: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

export default function PlanningSummaryPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PlanningSignalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPlanningSignal = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/planning-signal?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch planning signal');

        const result: PlanningSignalResponse = await res.json();
        setData(result.data || []);
      } catch (error) {
        console.error('Failed to fetch planning signal:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load planning signal',
          description: 'Could not load planning data. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanningSignal();
  }, [startDate, endDate, toast]);

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleExport = () => {
    // TODO: Implement Excel/PDF export
    toast({
      title: 'Export functionality',
      description: 'Export to Excel/PDF will be implemented soon.',
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planning Signal</h1>
          <p className="text-muted-foreground mt-1">
            Forward-looking demand based on confirmed Sales Orders
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Adjust date range for planning signal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No planning data available for the selected date range.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Product-wise Planning Summary</CardTitle>
            <CardDescription>
              {data.length} product(s) with confirmed orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Total Ordered</TableHead>
                    <TableHead className="text-right">Total Dispatched</TableHead>
                    <TableHead className="text-right">Total Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((product) => {
                    const isExpanded = expandedProducts.has(product.productId);
                    return (
                      <>
                        <TableRow key={product.productId}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleProduct(product.productId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.productName}
                            {product.productSku && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({product.productSku})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{product.totalOrdered}</TableCell>
                          <TableCell className="text-right">{product.totalDispatched}</TableCell>
                          <TableCell className="text-right font-medium">
                            <Badge variant={product.totalPending > 0 ? 'default' : 'secondary'}>
                              {product.totalPending}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={5} className="p-0">
                              <div className="border-t bg-muted/50">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Month</TableHead>
                                      <TableHead className="text-right">Ordered</TableHead>
                                      <TableHead className="text-right">Dispatched</TableHead>
                                      <TableHead className="text-right">Pending</TableHead>
                                      <TableHead className="text-right">Orders</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {product.monthlySummary.map((month) => (
                                      <TableRow key={month.month}>
                                        <TableCell className="font-medium">
                                          {formatMonth(month.month)}
                                        </TableCell>
                                        <TableCell className="text-right">{month.ordered}</TableCell>
                                        <TableCell className="text-right">
                                          {month.dispatched}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {month.pending}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {month.salesOrderCount}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

