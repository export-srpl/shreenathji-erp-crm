'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { formatDateForExport } from '@/lib/export-utils';

interface DispatchRegisterEntry {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  poNo: string;
  poDate: string | null;
  totalOrderReceived: number;
  totalDispatched: number;
  totalPending: number;
  salesPerson: string;
}

export default function DispatchRegisterPage() {
  const { toast } = useToast();
  const [dispatchData, setDispatchData] = useState<DispatchRegisterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDispatchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/dispatch-register');
        if (!res.ok) {
          throw new Error('Failed to fetch dispatch data');
        }
        const data = await res.json();
        setDispatchData(data);
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

    fetchDispatchData();
  }, [toast]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dispatch Register</h1>
        <p className="text-muted-foreground">Track order received, dispatched, and pending quantities by customer and product.</p>
      </div>
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Dispatch Register</CardTitle>
          <CardDescription>
            Total entries: {dispatchData.length} | Last updated: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dispatchData.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No dispatch data available.</p>
              <p className="text-sm">Dispatch information will appear here as sales orders are created and invoices are generated.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead className="text-right">Total Order Received (MTS)</TableHead>
                    <TableHead className="text-right">Total Dispatched (MTS)</TableHead>
                    <TableHead className="text-right">Total Pending (MTS)</TableHead>
                    <TableHead>Sales Person</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchData.map((item, index) => (
                    <TableRow key={`${item.customerId}-${item.productId}-${index}`}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.poNo || '-'}</TableCell>
                      <TableCell>{item.poDate ? formatDateForExport(item.poDate) : '-'}</TableCell>
                      <TableCell className="text-right">{Number(item.totalOrderReceived).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(item.totalDispatched).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(item.totalPending).toFixed(2)}
                      </TableCell>
                      <TableCell>{item.salesPerson}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
