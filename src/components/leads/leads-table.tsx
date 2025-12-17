
'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from '@/types';
import { Badge } from "../ui/badge";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 15;

const stageConfig: Record<Lead['status'], { color: string }> = {
    'New': { color: 'bg-blue-500' },
    'Contacted': { color: 'bg-yellow-500' },
    'Qualified': { color: 'bg-purple-500' },
    'Converted': { color: 'bg-green-600' },
    'Disqualified': { color: 'bg-red-600' }
  };

export function LeadsTable() {
  const { toast } = useToast();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<{ page: number }>({ page: 0 });

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/leads');
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        setLeads(data);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Failed to load leads',
          description: 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [toast]);

  const pagedLeads = useMemo(() => {
    const start = pagination.page * PAGE_SIZE;
    return leads.slice(start, start + PAGE_SIZE);
  }, [leads, pagination.page]);

  const handleNext = () => {
    const maxPage = Math.floor((leads.length - 1) / PAGE_SIZE);
    setPagination(prev => ({
      page: Math.min(prev.page + 1, maxPage),
    }));
  };

  const handlePrev = () => {
    if (pagination.page === 0) return;
    setPagination(prev => ({
      page: prev.page - 1,
    }));
  };

  return (
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>A complete list of all leads in the pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : leads.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No leads found.</p>
              <p className="text-sm">Click "Add New Lead" to get started.</p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Lead Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/sales/leads/add?leadId=${lead.id}`)}
                  >
                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.productInterest}</TableCell>
                    <TableCell>{lead.country}</TableCell>
                    <TableCell>{format(new Date(lead.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${stageConfig[lead.status].color}`}></span>
                             <span>{lead.status}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{lead.leadSource}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={pagination.page === 0 || isLoading}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!leads || leads.length < PAGE_SIZE || isLoading}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            </>
          )}
        </CardContent>
      </Card>
  );
}
