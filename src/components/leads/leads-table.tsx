
'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Mail, Phone, MapPin, Building2, Calendar, Tag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from '@/types';
import { Badge } from "../ui/badge";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const stageConfig: Record<Lead['status'], { color: string; bgColor: string }> = {
    'New': { color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
    'Contacted': { color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
    'Qualified': { color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
    'Converted': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
    'Disqualified': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' }
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
      <Card className="card-enhanced">
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
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No leads found.</p>
              <p className="text-sm mt-2">Click "Add New Lead" to get started.</p>
            </div>
          ) : (
            <>
            <div className="rounded-lg border overflow-hidden">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Product Interest</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer group animate-fade-in"
                      onClick={() => router.push(`/sales/leads/add?leadId=${lead.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold group-hover:text-primary transition-colors">
                              {lead.companyName}
                            </div>
                            {lead.contactName && (
                              <div className="text-xs text-muted-foreground">{lead.contactName}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <a 
                                href={`mailto:${lead.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-primary transition-colors"
                              >
                                {lead.email}
                              </a>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <a 
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-primary transition-colors"
                              >
                                {lead.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.productInterest ? (
                          <Badge variant="outline" className="font-normal">
                            {lead.productInterest}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.country && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || lead.country}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "badge-enhanced font-medium border",
                            stageConfig[lead.status]?.bgColor,
                            stageConfig[lead.status]?.color
                          )}
                        >
                          <span className={cn("w-2 h-2 rounded-full mr-1.5", stageConfig[lead.status]?.color.replace('text-', 'bg-').replace('-700', '-500'))}></span>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.leadSource ? (
                          <Badge variant="secondary" className="font-normal">
                            <Tag className="h-3 w-3 mr-1" />
                            {lead.leadSource}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.page * PAGE_SIZE + 1} to {Math.min((pagination.page + 1) * PAGE_SIZE, leads.length)} of {leads.length} leads
                </div>
                <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={pagination.page === 0 || isLoading}
                      className="btn-enhanced"
                  >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!leads || (pagination.page + 1) * PAGE_SIZE >= leads.length || isLoading}
                      className="btn-enhanced"
                  >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>
  );
}
