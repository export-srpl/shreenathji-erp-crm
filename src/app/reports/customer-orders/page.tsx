import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const customerData = [
  { customer: 'Global Chemicals Inc.', orderQty: 1000, dispatchedQty: 800, wipQty: 200, status: 'Partial' },
  { customer: 'Pharma Solutions Ltd.', orderQty: 500, dispatchedQty: 500, wipQty: 0, status: 'Completed' },
  { customer: 'Asia Pacific Polymers', orderQty: 1200, dispatchedQty: 1000, wipQty: 200, status: 'Partial' },
  { customer: 'Agro Industries', orderQty: 750, dispatchedQty: 600, wipQty: 150, status: 'Partial' },
  { customer: 'Innovate Labs', orderQty: 950, dispatchedQty: 950, wipQty: 0, status: 'Completed' },
];

export default function CustomerOrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Customer-wise Orders</h1>
        <p className="text-muted-foreground">View order, dispatched, and WIP quantities for each customer.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Order Status</CardTitle>
          <CardDescription>A summary of orders aggregated by customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
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
        </CardContent>
      </Card>
    </div>
  );
}
