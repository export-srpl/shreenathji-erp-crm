
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockAmcData = [
  { id: 'amc-001', customer: 'Global Chemicals Inc.', startDate: '2024-01-15', endDate: '2025-01-14', status: 'Active' },
  { id: 'amc-002', customer: 'Pharma Solutions Ltd.', startDate: '2023-08-01', endDate: '2024-07-31', status: 'Expired' },
  { id: 'amc-003', customer: 'Innovate Labs', startDate: '2024-06-01', endDate: '2025-05-31', status: 'Active' },
  { id: 'amc-004', customer: 'Agro Industries', startDate: '2024-03-10', endDate: '2025-03-09', status: 'Active' },
  { id: 'amc-005', customer: 'Asia Pacific Polymers', startDate: '2023-11-20', endDate: '2024-11-19', status: 'Upcoming Renewal' },
];

export default function AmcContractsPage() {
  const [contracts, setContracts] = useState(mockAmcData);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">AMC Contracts</h1>
          <p className="text-muted-foreground">Manage Annual Maintenance Contracts for customers.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          New AMC Contract
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>View, track, and manage all AMCs.</CardDescription>
        </CardHeader>
        <CardContent>
           {contracts.length === 0 ? (
             <div className="text-center text-muted-foreground py-12">
                <p>No AMC contracts have been created yet.</p>
             </div>
           ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contracts.map((contract) => (
                        <TableRow key={contract.id}>
                            <TableCell className="font-medium">{contract.customer}</TableCell>
                            <TableCell>{contract.startDate}</TableCell>
                            <TableCell>{contract.endDate}</TableCell>
                            <TableCell>
                                <Badge 
                                    variant={contract.status === 'Active' ? 'default' : (contract.status === 'Expired' ? 'destructive' : 'secondary')}
                                    className={contract.status === 'Active' ? 'bg-green-600' : (contract.status === 'Upcoming Renewal' ? 'bg-yellow-500' : '')}
                                >
                                    {contract.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Renew Contract
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
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

