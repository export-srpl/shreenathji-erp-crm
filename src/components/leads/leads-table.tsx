
'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone, MapPin, Building2, Calendar, Tag, Check, MoreVertical, UserPlus, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from '@/types';
import { Badge } from "../ui/badge";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/data-table/search-bar";
import { SortBy, SortOption } from "@/components/data-table/sort-by";
import { FilterPanel, FilterOption } from "@/components/data-table/filter-panel";
import { Pagination } from "@/components/data-table/pagination";
import { TemperatureBadge } from "./temperature-badge";
import { WinLossReasonDialog } from "./win-loss-reason-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PAGE_SIZE = 15;

const stageConfig: Record<string, { color: string; bgColor: string }> = {
    'New': { color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
    'Contacted': { color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
    'Qualified': { color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
    'Converted': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
    'Won': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
    'Lost': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
    'Disqualified': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' }
  };

const sortOptions: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'companyName-asc', label: 'Company Name (A-Z)' },
  { value: 'companyName-desc', label: 'Company Name (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
  { value: 'score-desc', label: 'Score (High to Low)' },
  { value: 'score-asc', label: 'Score (Low to High)' },
  { value: 'srplId-asc', label: 'SRPL ID (A-Z)' },
  { value: 'srplId-desc', label: 'SRPL ID (Z-A)' },
];

const filterOptions: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'New', label: 'New' },
      { value: 'Contacted', label: 'Contacted' },
      { value: 'Qualified', label: 'Qualified' },
      { value: 'Converted', label: 'Converted' },
      { value: 'Won', label: 'Won' },
      { value: 'Lost', label: 'Lost' },
      { value: 'Disqualified', label: 'Disqualified' },
    ],
  },
  {
    key: 'temperature',
    label: 'Temperature',
    type: 'select',
    options: [
      { value: 'Hot', label: 'Hot' },
      { value: 'Warm', label: 'Warm' },
      { value: 'Cold', label: 'Cold' },
    ],
  },
  {
    key: 'source',
    label: 'Source',
    type: 'select',
    options: [
      { value: 'Website', label: 'Website' },
      { value: 'Referral', label: 'Referral' },
      { value: 'Exhibition', label: 'Exhibition' },
      { value: 'Cold Call', label: 'Cold Call' },
      { value: 'IndiaMART', label: 'IndiaMART' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    key: 'srplId',
    label: 'SRPL ID',
    type: 'text',
  },
  {
    key: 'country',
    label: 'Country',
    type: 'text',
  },
  {
    key: 'productInterest',
    label: 'Product Interest',
    type: 'text',
  },
];

export function LeadsTable() {
  const { toast } = useToast();
  const router = useRouter();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([]);
  const [selectedView, setSelectedView] = useState<string>('');
  const [winLossDialogOpen, setWinLossDialogOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ leadIds: string[]; status: string } | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/leads');
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();
        setAllLeads(data);
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

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const productsData = await res.json();
          const mappedProducts = productsData.map((p: any) => ({
            id: p.id,
            name: p.name || p.productName || '',
          }));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };

    fetchLeads();
    fetchProducts();
  }, [toast]);

  // Fetch saved views
  useEffect(() => {
    const fetchSavedViews = async () => {
      try {
        const res = await fetch('/api/saved-views?module=LEAD');
        if (res.ok) {
          const views = await res.json();
          setSavedViews(views);
          // Set default view if available
          const defaultView = views.find((v: any) => v.isDefault);
          if (defaultView) {
            applySavedView(defaultView);
            setSelectedView(defaultView.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch saved views:', error);
      }
    };
    fetchSavedViews();
  }, []);

  const applySavedView = (view: any) => {
    try {
      const viewFilters = typeof view.filters === 'string' ? JSON.parse(view.filters) : view.filters;
      setFilters(viewFilters);
      if (view.sortBy && view.sortOrder) {
        setSortBy(`${view.sortBy}-${view.sortOrder}`);
      }
    } catch (error) {
      console.error('Failed to apply saved view:', error);
    }
  };

  // Filter, search, and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...allLeads];

    // Apply search (also include SRPL ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.companyName?.toLowerCase().includes(query) ||
          lead.contactName?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.productInterest?.toLowerCase().includes(query) ||
          lead.country?.toLowerCase().includes(query) ||
          lead.srplId?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        result = result.filter((lead) => {
          const leadValue = (lead as any)[key];
          if (key === 'source') {
            return lead.leadSource === value;
          }
          if (key === 'temperature') {
            return lead.temperature === value;
          }
          return String(leadValue || '').toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    const [sortField, sortDirection] = sortBy.split('-');
    result.sort((a, b) => {
      let aValue: any = (a as any)[sortField];
      let bValue: any = (b as any)[sortField];

      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'score') {
        // Handle null/undefined scores
        aValue = aValue ?? 0;
        bValue = bValue ?? 0;
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return result;
  }, [allLeads, searchQuery, filters, sortBy]);

  // Paginate results
  const pagedLeads = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAndSortedLeads.slice(start, start + pageSize);
  }, [filteredAndSortedLeads, currentPage, pageSize]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filters, sortBy]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
  }, []);

  const handleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
    if (checked === true && pagedLeads) {
      // Select all visible leads
      setSelectedLeadIds(new Set(pagedLeads.map(lead => lead.id)));
    } else {
      // Unselect all (checked === false or 'indeterminate')
      setSelectedLeadIds(new Set());
    }
  }, [pagedLeads]);

  const handleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  const handleBulkStatusUpdate = useCallback(async (status: string) => {
    const requiresReason = ['Won', 'Lost', 'Converted', 'Disqualified'].includes(status);
    
    if (requiresReason) {
      // Open dialog to get win/loss reason
      setPendingStatusUpdate({ leadIds: Array.from(selectedLeadIds), status });
      setWinLossDialogOpen(true);
    } else {
      // Direct status update
      try {
        const res = await fetch('/api/leads/bulk-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_stage',
            leadIds: Array.from(selectedLeadIds),
            status,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to update leads');
        }

        const result = await res.json();
        const successCount = result.summary?.successful || 0;
        const failureCount = result.summary?.failed || 0;

        if (successCount > 0) {
          toast({
            title: 'Leads Updated',
            description: `Successfully updated ${successCount} lead(s)${failureCount > 0 ? `. ${failureCount} failed.` : ''}`,
          });

          // Refresh leads and clear selection
          const refreshRes = await fetch('/api/leads');
          if (refreshRes.ok) {
            const refreshedLeads = await refreshRes.json();
            setAllLeads(refreshedLeads);
          }
          setSelectedLeadIds(new Set());
        } else {
          throw new Error('No leads were updated');
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'Failed to update leads',
        });
      }
    }
  }, [selectedLeadIds, toast]);

  const handleWinLossConfirm = useCallback(async (reasonId: string) => {
    if (!pendingStatusUpdate) return;

    try {
      const res = await fetch('/api/leads/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_stage',
          leadIds: pendingStatusUpdate.leadIds,
          status: pendingStatusUpdate.status,
          winLossReasonId: reasonId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update leads');
      }

      const result = await res.json();
      const successCount = result.summary?.successful || 0;
      const failureCount = result.summary?.failed || 0;

      toast({
        title: 'Leads Updated',
        description: `Successfully updated ${successCount} lead(s)${failureCount > 0 ? `. ${failureCount} failed.` : ''}`,
      });

      // Refresh leads and clear selection
      const refreshRes = await fetch('/api/leads');
      if (refreshRes.ok) {
        const refreshedLeads = await refreshRes.json();
        setAllLeads(refreshedLeads);
      }
      setSelectedLeadIds(new Set());
      setWinLossDialogOpen(false);
      setPendingStatusUpdate(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update leads',
      });
    }
  }, [pendingStatusUpdate, toast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedLeadIds.size === 0) return;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedLeadIds.size} lead(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch('/api/leads/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          leadIds: Array.from(selectedLeadIds),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete leads');
      }

      const result = await res.json();
      const successCount = result.summary?.successful || 0;
      const failureCount = result.summary?.failed || 0;

      toast({
        title: 'Leads Deleted',
        description: `Successfully deleted ${successCount} lead(s)${failureCount > 0 ? `. ${failureCount} failed.` : ''}`,
      });

      // Refresh leads and clear selection
      const refreshRes = await fetch('/api/leads');
      if (refreshRes.ok) {
        const refreshedLeads = await refreshRes.json();
        setAllLeads(refreshedLeads);
      }
      setSelectedLeadIds(new Set());
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Failed to delete leads',
      });
    }
  }, [selectedLeadIds, toast]);

  const allSelected = pagedLeads.length > 0 && selectedLeadIds.size === pagedLeads.length;
  const someSelected = selectedLeadIds.size > 0 && selectedLeadIds.size < pagedLeads.length;

  return (
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Leads</CardTitle>
              <CardDescription>A complete list of all leads in the pipeline.</CardDescription>
            </div>
            {selectedLeadIds.size > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {selectedLeadIds.size} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Saved Views and Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {savedViews.length > 0 && (
              <Select
                value={selectedView}
                onValueChange={(value) => {
                  if (value === '') {
                    setSelectedView('');
                    setFilters({});
                  } else {
                    const view = savedViews.find(v => v.id === value);
                    if (view) {
                      applySavedView(view);
                      setSelectedView(value);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Saved Views" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Leads</SelectItem>
                  {savedViews.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                      {view.name} {view.isDefault && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedLeadIds.size > 0 && (
              <div className="flex gap-2 flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions ({selectedLeadIds.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Qualified')}>
                      Mark as Qualified
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Contacted')}>
                      Mark as Contacted
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Won')}>
                      Mark as Won
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Lost')}>
                      Mark as Lost
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('Disqualified')}>
                      Mark as Disqualified
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleBulkDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeadIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          {/* Search, Sort, and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                placeholder="Search leads by company, contact, email, phone..."
                onSearch={handleSearch}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <SortBy
                options={sortOptions}
                value={sortBy}
                onSortChange={setSortBy}
              />
              <FilterPanel
                filters={filterOptions}
                values={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            </div>
          </div>

          {isLoading ? (
             <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : filteredAndSortedLeads.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {allLeads.length === 0 ? 'No leads found.' : 'No leads match your search or filters.'}
              </p>
              <p className="text-sm mt-2">
                {allLeads.length === 0 ? 'Click "Add New Lead" to get started.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <>
            <div className="rounded-lg border overflow-hidden">
              <Table className="table-enhanced">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[140px]">SRPL ID</TableHead>
                    <TableHead className="w-[200px]">Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Product Interest</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Score</TableHead>
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
                      onClick={(e) => {
                        // Don't navigate if clicking checkbox
                        if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) {
                          return;
                        }
                        router.push(`/sales/leads/add?leadId=${lead.id}`);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                          aria-label={`Select ${lead.companyName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {lead.srplId || '—'}
                        </span>
                      </TableCell>
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
                        {lead.productInterest ? (() => {
                          try {
                            const productData = JSON.parse(lead.productInterest);
                            if (Array.isArray(productData) && productData.length > 0) {
                              const productNames = productData
                                .map((p: any) => {
                                  if (!p.productId) return null;
                                  const product = products.find(prod => prod.id === p.productId);
                                  return product ? product.name : null;
                                })
                                .filter((name): name is string => Boolean(name));
                              
                              // If we found product names, display them
                              if (productNames.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {productNames.map((name: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="font-normal text-xs">
                                        {name}
                                      </Badge>
                                    ))}
                                  </div>
                                );
                              }
                              
                              // If products array is empty (still loading), show loading state
                              if (products.length === 0) {
                                return (
                                  <span className="text-muted-foreground text-xs">Loading...</span>
                                );
                              }
                              
                              // If no products found, show fallback
                              return (
                                <span className="text-muted-foreground text-sm">-</span>
                              );
                            }
                            // Fallback for old format (string) - try to find product by name or ID
                            const product = products.find(p => p.name === lead.productInterest || p.id === lead.productInterest);
                            return product ? (
                              <Badge variant="outline" className="font-normal text-xs">
                                {product.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-normal text-xs">
                                {lead.productInterest}
                              </Badge>
                            );
                          } catch {
                            // If not JSON, try to find product by the string value
                            const product = products.find(p => p.name === lead.productInterest || p.id === lead.productInterest);
                            return product ? (
                              <Badge variant="outline" className="font-normal text-xs">
                                {product.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-normal text-xs">
                                {lead.productInterest}
                              </Badge>
                            );
                          }
                        })() : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.country && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{[ (lead as any).city, lead.state, lead.country].filter(Boolean).join(', ') || lead.country}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <TemperatureBadge
                          temperature={lead.temperature}
                          score={lead.score}
                          showScore={true}
                        />
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
            <div className="mt-4 border-t pt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredAndSortedLeads.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
            </>
          )}
        </CardContent>

        {/* Win/Loss Reason Dialog */}
        {pendingStatusUpdate && (
          <WinLossReasonDialog
            open={winLossDialogOpen}
            onOpenChange={setWinLossDialogOpen}
            status={pendingStatusUpdate.status as 'Won' | 'Lost' | 'Converted' | 'Disqualified'}
            onConfirm={handleWinLossConfirm}
            module="LEAD"
          />
        )}
      </Card>
  );
}
