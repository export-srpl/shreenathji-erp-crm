'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DispatchRegisterTable } from '@/components/dispatch/dispatch-register-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DispatchRegisterEntry {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  primaryPONumber: string;
  primaryPODate: string | null;
  allPOs: Array<{
    poNumber: string;
    poDate: string;
    orderId: string;
    quantity: number;
  }>;
  totalOrderReceived: number;
  totalDispatched: number;
  totalPending: number;
  dispatchStatus: 'Pending' | 'Partially Dispatched' | 'Fully Dispatched' | 'Over-Dispatched';
  hasAnomaly: boolean;
  anomalyMessage?: string;
  salesPerson: string;
  salesPersonEmail: string;
  lineItems: Array<{
    salesOrderId: string;
    salesOrderNumber: string;
    salesOrderDate: string;
    salesOrderItemId: string;
    orderedQuantity: number;
    dispatchedQuantity: number;
    pendingQuantity: number;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      quantity: number;
    }>;
  }>;
}

interface DispatchRegisterResponse {
  data: DispatchRegisterEntry[];
  asOfDate: string;
  totalEntries: number;
  anomaliesCount: number;
  generatedAt: string;
}

export default function DispatchRegisterPage() {
  const { toast } = useToast();
  const [dispatchData, setDispatchData] = useState<DispatchRegisterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [exceptionType, setExceptionType] = useState<string>('all');
  const [metadata, setMetadata] = useState<{
    asOfDate: string;
    totalEntries: number;
    anomaliesCount: number;
    generatedAt: string;
  } | null>(null);

  const fetchDispatchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        asOfDate: asOfDate,
        includeAnomalies: includeAnomalies.toString(),
        ...(exceptionType !== 'all' && { exceptionType }),
      });
      const res = await fetch(`/api/dispatch-register?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dispatch data');
      }
      const response: DispatchRegisterResponse = await res.json();
      setDispatchData(response.data);
      setMetadata({
        asOfDate: response.asOfDate,
        totalEntries: response.totalEntries,
        anomaliesCount: response.anomaliesCount,
        generatedAt: response.generatedAt,
      });
    } catch (error) {
      console.error('Failed to fetch dispatch register:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load dispatch register',
        description: 'Could not fetch dispatch data from the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatchData();
  }, [asOfDate, includeAnomalies, exceptionType]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        asOfDate: asOfDate,
        format: 'csv',
      });
      const res = await fetch(`/api/dispatch-register/export?${params}`);
      if (!res.ok) {
        throw new Error('Failed to export dispatch register');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispatch-register-${asOfDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Export Successful',
        description: 'Dispatch register has been exported to CSV.',
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export dispatch register.',
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dispatch Register</h1>
        <p className="text-muted-foreground">
          Track order received, dispatched, and pending quantities by customer and product with
          complete audit trail and line-item level traceability.
        </p>
      </div>

      <Card className="card-enhanced mb-6">
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="asOfDate">As of Date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                View dispatch status as of selected date
              </p>
            </div>
            <div>
              <Label htmlFor="includeAnomalies">Show Anomalies</Label>
              <Select
                value={includeAnomalies ? 'yes' : 'no'}
                onValueChange={(value) => setIncludeAnomalies(value === 'yes')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes (Include)</SelectItem>
                  <SelectItem value="no">No (Hide)</SelectItem>
                </SelectContent>
              </Select>
              {includeAnomalies && (
                <Select
                  value={exceptionType}
                  onValueChange={setExceptionType}
                  className="mt-2"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by exception type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exceptions</SelectItem>
                    <SelectItem value="over_dispatch">Over-Dispatch Only</SelectItem>
                    <SelectItem value="delayed_dispatch">Delayed Dispatch Only</SelectItem>
                    <SelectItem value="excessive_partial">Excessive Partial Only</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Include or exclude over-dispatched entries
              </p>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dispatch Register</CardTitle>
              <CardDescription className="mt-2">
                {metadata && (
                  <>
                    Total entries: {metadata.totalEntries} | As of:{' '}
                    {new Date(metadata.asOfDate).toLocaleDateString()} | Generated:{' '}
                    {new Date(metadata.generatedAt).toLocaleString()}
                    {metadata.anomaliesCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {metadata.anomaliesCount} Anomaly{metadata.anomaliesCount !== 1 ? 'ies' : ''}
                      </Badge>
                    )}
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dispatchData.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No dispatch data available.</p>
              <p className="text-sm">
                Dispatch information will appear here as sales orders are created and invoices are
                generated.
              </p>
            </div>
          ) : (
            <DispatchRegisterTable data={dispatchData} onExport={handleExport} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
