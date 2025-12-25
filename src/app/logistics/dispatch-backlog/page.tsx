'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface DispatchBacklogEntry {
  customerId: string;
  customerName: string;
  customerSrplId: string | null;
  productId: string;
  productName: string;
  productSku: string | null;
  productSrplId: string | null;
  ordered: number;
  dispatched: number;
  pending: number;
  salesOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    quantity: number;
    dispatchedQuantity: number;
    pendingQuantity: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    quantity: number;
  }>;
}

interface DispatchBacklogResponse {
  data: DispatchBacklogEntry[];
  summary: {
    totalEntries: number;
    totalPending: number;
    totalOrdered: number;
    totalDispatched: number;
  };
}

export default function DispatchBacklogPage() {
  const { toast } = useToast();
  const [backlogData, setBacklogData] = useState<DispatchBacklogEntry[]>([]);
  const [summary, setSummary] = useState<DispatchBacklogResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DispatchBacklogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBacklogData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/dispatch-backlog');
      if (!res.ok) {
        throw new Error('Failed to fetch backlog data');
      }
      const response: DispatchBacklogResponse = await res.json();
      setBacklogData(response.data);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch dispatch backlog:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load dispatch backlog',
        description: 'Could not fetch backlog data from the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBacklogData();
  }, []);

  const filteredData = backlogData.filter(
    (item) =>
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.productSku && item.productSku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExport = () => {
    // TODO: Implement Excel/PDF export
    toast({
      title: 'Export functionality',
      description: 'Export to Excel/PDF will be implemented soon.',
    });
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
          <h1 className="text-3xl font-bold">Dispatch Backlog Summary</h1>
          <p className="text-muted-foreground mt-1">
            Consolidated view of all pending dispatch quantities by customer and product
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Ordered (MTS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalOrdered.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Dispatched (MTS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDispatched.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Pending (MTS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.totalPending.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backlog Entries</CardTitle>
              <CardDescription>All pending dispatch quantities</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search by customer or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {searchQuery ? 'No entries found matching your search.' : 'No backlog entries found.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered (MTS)</TableHead>
                    <TableHead className="text-right">Dispatched (MTS)</TableHead>
                    <TableHead className="text-right">Pending (MTS)</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((entry) => (
                    <TableRow key={`${entry.customerId}-${entry.productId}`}>
                      <TableCell className="font-medium">{entry.customerName}</TableCell>
                      <TableCell>
                        {entry.productName}
                        {entry.productSku && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({entry.productSku})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{entry.ordered.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.dispatched.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {entry.pending.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedEntry(entry)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Backlog Details</DialogTitle>
            <DialogDescription>
              {selectedEntry?.customerName} - {selectedEntry?.productName}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Ordered</Label>
                  <p className="text-lg font-semibold">{selectedEntry.ordered.toFixed(2)} MTS</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Dispatched</Label>
                  <p className="text-lg font-semibold">{selectedEntry.dispatched.toFixed(2)} MTS</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pending</Label>
                  <p className="text-lg font-semibold text-orange-600">
                    {selectedEntry.pending.toFixed(2)} MTS
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Contributing Sales Orders</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead className="text-right">Ordered Qty</TableHead>
                        <TableHead className="text-right">Dispatched Qty</TableHead>
                        <TableHead className="text-right">Pending Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEntry.salesOrders.map((so) => (
                        <TableRow key={so.id}>
                          <TableCell className="font-mono text-sm">{so.orderNumber}</TableCell>
                          <TableCell>{format(new Date(so.orderDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-right">{so.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{so.dispatchedQuantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {so.pendingQuantity.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedEntry.invoices.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Related Invoices</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Invoice Date</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntry.invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(inv.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-right">{inv.quantity.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

