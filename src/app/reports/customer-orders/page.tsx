'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerOrderData {
  customer: string;
  orderQty: number;
  dispatchedQty: number;
  wipQty: number;
  status: string;
}

export default function CustomerOrdersPage() {
  const { toast } = useToast();
  const [customerData, setCustomerData] = useState<CustomerOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Create API endpoint to aggregate sales orders by customer
        // For now, fetch sales orders and aggregate them
        const res = await fetch('/api/sales-orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        
        const orders = await res.json();
        
        // Aggregate by customer
        const aggregated = orders.reduce((acc: Record<string, CustomerOrderData>, order: any) => {
          const customerName = order.customer?.companyName || 'Unknown';
          
          if (!acc[customerName]) {
            acc[customerName] = {
              customer: customerName,
              orderQty: 0,
              dispatchedQty: 0,
              wipQty: 0,
              status: 'Partial',
            };
          }
          
          // Sum up quantities from order items
          order.items?.forEach((item: any) => {
            acc[customerName].orderQty += item.quantity || 0;
            // TODO: Get dispatched and WIP from dispatch register when available
          });
          
          return acc;
        }, {});
        
        setCustomerData(Object.values(aggregated));
      } catch (error) {
        console.error('Failed to fetch customer orders:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not fetch customer order data.',
        });
        setCustomerData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Customer-wise Orders</h1>
        <p className="text-muted-foreground">View order, dispatched, and WIP quantities for each customer.</p>
      </div>
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Customer Order Status</CardTitle>
          <CardDescription>A summary of orders aggregated by customer.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customerData.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No customer order data available.</p>
              <p className="text-sm mt-2">Order data will appear here once sales orders are created.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Order Qty (kg)</TableHead>
                    <TableHead className="text-right">Dispatched Qty (kg)</TableHead>
                    <TableHead className="text-right">WIP Qty (kg)</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerData.map((item) => (
                    <TableRow key={item.customer}>
                      <TableCell className="font-medium">{item.customer}</TableCell>
                      <TableCell className="text-right">{item.orderQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.dispatchedQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.wipQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'} className={item.status === 'Completed' ? 'bg-green-600' : ''}>
                          {item.status}
                        </Badge>
                      </TableCell>
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
