'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { DispatchRegisterEntry } from "@/types";
import { Loader2 } from "lucide-react";

export default function DispatchRegisterPage() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const dispatchQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'dispatchRegister')) : null),
    [firestore, user]
  );
  
  const { data: dispatchData, isLoading: isDataLoading } = useCollection<DispatchRegisterEntry>(dispatchQuery);
  
  const isLoading = isAuthLoading || isDataLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dispatch Register</h1>
        <p className="text-muted-foreground">Product-wise order, dispatched, and work-in-progress quantities.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Overview</CardTitle>
          <CardDescription>Live status of all product dispatches.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !dispatchData || dispatchData.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No dispatch data available.</p>
              <p className="text-sm">Dispatch information will appear here as orders are processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Order Qty (kg)</TableHead>
                  <TableHead className="text-right">Dispatched Qty (kg)</TableHead>
                  <TableHead className="text-right">WIP Qty (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-right">{item.orderQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.dispatchedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.wipQty.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
