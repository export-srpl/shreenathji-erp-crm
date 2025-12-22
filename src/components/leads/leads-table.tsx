
'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone, MapPin, Building2, Calendar, Tag } from "lucide-react";
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

const DEFAULT_PAGE_SIZE = 15;

const stageConfig: Record<Lead['status'], { color: string; bgColor: string }> = {
    'New': { color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
    'Contacted': { color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
    'Qualified': { color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
    'Converted': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
    'Disqualified': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' }
  };

const sortOptions: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'companyName-asc', label: 'Company Name (A-Z)' },
  { value: 'companyName-desc', label: 'Company Name (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
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
      { value: 'Disqualified', label: 'Disqualified' },
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

  // Filter, search, and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...allLeads];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.companyName?.toLowerCase().includes(query) ||
          lead.contactName?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.productInterest?.toLowerCase().includes(query) ||
          lead.country?.toLowerCase().includes(query)
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

  return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>A complete list of all leads in the pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
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
      </Card>
  );
}
