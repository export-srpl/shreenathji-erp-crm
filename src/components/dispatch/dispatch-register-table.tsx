'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ChevronDown, ChevronRight, AlertTriangle, Download } from 'lucide-react';
import { formatDateForExport } from '@/lib/export-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface DispatchRegisterEntry {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productSKU?: string;
  primaryPONumber: string;
  primaryPODate: string | null;
  allPOs: Array<{
    poNumber: string;
    poDate: string;
    orderId: string;
    quantity: number;
  }>;
  totalOrderReceived: number;
  totalDispatched: number;
  totalPending: number;
  dispatchStatus: 'Pending' | 'Partially Dispatched' | 'Fully Dispatched' | 'Over-Dispatched';
  hasAnomaly: boolean;
  anomalyMessage?: string;
  salesPerson: string;
  salesPersonEmail: string;
  lineItems: Array<{
    salesOrderId: string;
    salesOrderNumber: string;
    salesOrderDate: string;
    salesOrderItemId: string;
    orderedQuantity: number;
    dispatchedQuantity: number;
    pendingQuantity: number;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      quantity: number;
    }>;
  }>;
}

interface DispatchRegisterTableProps {
  data: DispatchRegisterEntry[];
  onExport?: () => void;
}

const statusConfig: Record<DispatchRegisterEntry['dispatchStatus'], { color: string; bgColor: string }> = {
  'Pending': { color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200' },
  'Partially Dispatched': { color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
  'Fully Dispatched': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  'Over-Dispatched': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
};

export function DispatchRegisterTable({ data, onExport }: DispatchRegisterTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drillDownEntry, setDrillDownEntry] = useState<DispatchRegisterEntry | null>(null);

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleDrillDown = (entry: DispatchRegisterEntry) => {
    setDrillDownEntry(entry);
  };

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table className="table-enhanced">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Primary PO</TableHead>
              <TableHead>PO Date</TableHead>
              <TableHead className="text-right">Ordered (MTS)</TableHead>
              <TableHead className="text-right">Dispatched (MTS)</TableHead>
              <TableHead className="text-right">Pending (MTS)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sales Person</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const key = `${item.customerId}-${item.productId}-${index}`;
              const isExpanded = expandedRows.has(key);
              const hasMultiplePOs = item.allPOs.length > 1;

              return (
                <>
                  <TableRow
                    key={key}
                    className={item.hasAnomaly ? 'bg-red-50/50' : ''}
                  >
                    <TableCell>
                      {hasMultiplePOs && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRow(key)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{item.primaryPONumber}</span>
                        {hasMultiplePOs && (
                          <Badge variant="outline" className="text-xs">
                            +{item.allPOs.length - 1} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.primaryPODate ? formatDateForExport(item.primaryPODate) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalOrderReceived.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalDispatched.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.totalPending.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${statusConfig[item.dispatchStatus].bgColor} ${statusConfig[item.dispatchStatus].color} border`}
                        >
                          {item.dispatchStatus}
                        </Badge>
                        {item.hasAnomaly && (
                          <AlertTriangle className="h-4 w-4 text-red-600" title={item.anomalyMessage} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.salesPerson}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDrillDown(item)}
                        title="View calculation trail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasMultiplePOs && (
                    <TableRow key={`${key}-expanded`} className="bg-muted/30">
                      <TableCell colSpan={11}>
                        <div className="p-4 space-y-2">
                          <div className="font-semibold text-sm mb-2">All Purchase Orders:</div>
                          <div className="space-y-1">
                            {item.allPOs.map((po) => (
                              <div
                                key={po.orderId}
                                className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded border"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-medium">{po.poNumber}</span>
                                  <span className="text-muted-foreground">
                                    {formatDateForExport(po.poDate)}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {po.quantity.toFixed(2)} MTS
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownEntry} onOpenChange={() => setDrillDownEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Dispatch Calculation Trail</DialogTitle>
            <DialogDescription>
              Complete traceability for {drillDownEntry?.customerName} - {drillDownEntry?.productName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {drillDownEntry && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Ordered</div>
                    <div className="text-lg font-semibold">
                      {drillDownEntry.totalOrderReceived.toFixed(2)} MTS
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Dispatched</div>
                    <div className="text-lg font-semibold">
                      {drillDownEntry.totalDispatched.toFixed(2)} MTS
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pending</div>
                    <div className="text-lg font-semibold">
                      {drillDownEntry.totalPending.toFixed(2)} MTS
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge
                      variant="outline"
                      className={`${statusConfig[drillDownEntry.dispatchStatus].bgColor} ${statusConfig[drillDownEntry.dispatchStatus].color} border`}
                    >
                      {drillDownEntry.dispatchStatus}
                    </Badge>
                  </div>
                </div>

                {drillDownEntry.hasAnomaly && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Anomaly Detected
                    </div>
                    <div className="text-sm text-red-600">{drillDownEntry.anomalyMessage}</div>
                  </div>
                )}

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="font-semibold">Sales Order Line Items:</div>
                  {drillDownEntry.lineItems.map((lineItem, idx) => (
                    <div key={lineItem.salesOrderItemId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Sales Order: {lineItem.salesOrderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            Date: {formatDateForExport(lineItem.salesOrderDate)} | Item ID: {lineItem.salesOrderItemId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Ordered</div>
                          <div className="font-semibold">{lineItem.orderedQuantity.toFixed(2)} MTS</div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Invoice Dispatches:</div>
                        {lineItem.invoices.length === 0 ? (
                          <div className="text-sm text-muted-foreground italic pl-4">
                            No invoices dispatched for this line item
                          </div>
                        ) : (
                          <div className="space-y-2 pl-4">
                            {lineItem.invoices.map((invoice) => (
                              <div
                                key={invoice.invoiceId}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded border"
                              >
                                <div>
                                  <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDateForExport(invoice.invoiceDate)} | ID: {invoice.invoiceId}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">{invoice.quantity.toFixed(2)} MTS</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm text-muted-foreground">Line Item Summary:</div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Dispatched: </span>
                            <span className="font-semibold">{lineItem.dispatchedQuantity.toFixed(2)} MTS</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pending: </span>
                            <span className="font-semibold">{lineItem.pendingQuantity.toFixed(2)} MTS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

