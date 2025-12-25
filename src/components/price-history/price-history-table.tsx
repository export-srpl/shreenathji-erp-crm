'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PriceHistoryEntry {
  id: string;
  documentType: string;
  documentNo: string;
  documentDate: string;
  quantity: number;
  unitPrice: string | number;
  discountPct: number;
  currency: string;
  product?: {
    id: string;
    name: string;
    sku: string | null;
  };
  customer?: {
    id: string;
    companyName: string;
  };
}

interface PriceHistoryTableProps {
  customerId?: string;
  productId?: string;
}

export function PriceHistoryTable({ customerId, productId }: PriceHistoryTableProps) {
  const [data, setData] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [documentType, setDocumentType] = useState<string>('all');

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!customerId && !productId) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (documentType !== 'all') params.set('documentType', documentType);

        const url = customerId
          ? `/api/price-history/by-customer/${customerId}?${params.toString()}`
          : `/api/price-history/by-product/${productId}?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch price history');

        const result = await res.json();
        setData(result.data || []);
      } catch (error) {
        console.error('Failed to fetch price history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [customerId, productId, startDate, endDate, documentType]);

  const formatPrice = (price: string | number, currency: string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
    }).format(numPrice);
  };

  const calculateFinalPrice = (unitPrice: string | number, discountPct: number) => {
    const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) : unitPrice;
    return price * (1 - discountPct / 100);
  };

  const getDocumentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'Quote':
        return 'secondary';
      case 'ProformaInvoice':
        return 'outline';
      case 'SalesOrder':
        return 'default';
      case 'Invoice':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Quote">Quote</SelectItem>
              <SelectItem value="ProformaInvoice">Proforma Invoice</SelectItem>
              <SelectItem value="SalesOrder">Sales Order</SelectItem>
              <SelectItem value="Invoice">Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setDocumentType('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          No price history found for the selected filters.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Document No</TableHead>
                {customerId && <TableHead>Product</TableHead>}
                {productId && <TableHead>Customer</TableHead>}
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Final Price</TableHead>
                <TableHead>Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => {
                const finalPrice = calculateFinalPrice(entry.unitPrice, entry.discountPct);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.documentDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDocumentTypeBadgeVariant(entry.documentType)}>
                        {entry.documentType === 'ProformaInvoice' ? 'Proforma' : entry.documentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.documentNo}</TableCell>
                    {customerId && (
                      <TableCell>
                        {entry.product?.name}
                        {entry.product?.sku && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({entry.product.sku})
                          </span>
                        )}
                      </TableCell>
                    )}
                    {productId && <TableCell>{entry.customer?.companyName}</TableCell>}
                    <TableCell className="text-right">{entry.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(entry.unitPrice, entry.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.discountPct > 0 ? `${entry.discountPct}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(finalPrice, entry.currency)}
                    </TableCell>
                    <TableCell>{entry.currency}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

