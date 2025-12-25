'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SalesPerformanceEntry {
  salesRepId: string;
  salesRepName: string;
  salesRepEmail: string;
  totalOrders: number;
  totalOrderValue: number;
  totalInvoiced: number;
  totalPendingDispatch: number;
  invoiceRate: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    customerName: string;
    value: number;
  }>;
}

interface SalesPerformanceResponse {
  data: SalesPerformanceEntry[];
  summary: {
    totalSalesReps: number;
    totalOrders: number;
    totalOrderValue: number;
    totalInvoiced: number;
  };
}

export default function SalesPerformancePage() {
  const { toast } = useToast();
  const [data, setData] = useState<SalesPerformanceEntry[]>([]);
  const [summary, setSummary] = useState<SalesPerformanceResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/reports/sales-performance?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch sales performance data');

        const result: SalesPerformanceResponse = await res.json();
        setData(result.data || []);
        setSummary(result.summary);
      } catch (error) {
        console.error('Failed to fetch sales performance:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load sales performance',
          description: 'Could not load performance data. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, toast]);

  const handleExport = () => {
    // TODO: Implement Excel/PDF export
    toast({
      title: 'Export functionality',
      description: 'Export to Excel/PDF will be implemented soon.',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
          <h1 className="text-3xl font-bold">Sales Performance by Person</h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics for each sales representative
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
          <CardDescription>Filter by date range</CardDescription>
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

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Sales Reps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSalesReps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalOrderValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalInvoiced)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No sales performance data available for the selected date range.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance Details</CardTitle>
            <CardDescription>
              {data.length} sales representative(s) with order activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Person</TableHead>
                    <TableHead className="text-right">Total Orders</TableHead>
                    <TableHead className="text-right">Order Value</TableHead>
                    <TableHead className="text-right">Invoiced Amount</TableHead>
                    <TableHead className="text-right">Invoice Rate</TableHead>
                    <TableHead className="text-right">Pending Dispatch (MTS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry) => (
                    <TableRow key={entry.salesRepId}>
                      <TableCell className="font-medium">
                        {entry.salesRepName}
                        {entry.salesRepEmail && (
                          <div className="text-xs text-muted-foreground">{entry.salesRepEmail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{entry.totalOrders}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.totalOrderValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.totalInvoiced)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={entry.invoiceRate >= 80 ? 'default' : 'secondary'}>
                          {entry.invoiceRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.totalPendingDispatch.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

