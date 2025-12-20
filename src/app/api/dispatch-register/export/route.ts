import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

/**
 * GET /api/dispatch-register/export
 * Export dispatch register in audit-friendly CSV format
 * Query params:
 *   - asOfDate: ISO date string (optional)
 *   - format: 'csv' (default) or 'json'
 */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfDateParam = searchParams.get('asOfDate');
    const format = searchParams.get('format') || 'csv';

    // Fetch dispatch register data
    const baseUrl = new URL(req.url);
    baseUrl.pathname = '/api/dispatch-register';
    if (asOfDateParam) {
      baseUrl.searchParams.set('asOfDate', asOfDateParam);
    }

    const dispatchRes = await fetch(baseUrl.toString(), {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    });

    if (!dispatchRes.ok) {
      throw new Error('Failed to fetch dispatch register data');
    }

    const dispatchData = await dispatchRes.json();
    const entries = dispatchData.data || [];

    if (format === 'json') {
      return NextResponse.json({
        exportDate: new Date().toISOString(),
        asOfDate: dispatchData.asOfDate,
        entries: entries.map((entry: any) => ({
          customerId: entry.customerId,
          customerName: entry.customerName,
          productId: entry.productId,
          productName: entry.productName,
          productSKU: entry.productSKU || '',
          primaryPONumber: entry.primaryPONumber,
          primaryPODate: entry.primaryPODate,
          totalOrderReceived: entry.totalOrderReceived,
          totalDispatched: entry.totalDispatched,
          totalPending: entry.totalPending,
          dispatchStatus: entry.dispatchStatus,
          hasAnomaly: entry.hasAnomaly,
          anomalyMessage: entry.anomalyMessage,
          salesPerson: entry.salesPerson,
          salesPersonEmail: entry.salesPersonEmail,
          unitOfMeasure: 'MTS',
          lineItems: entry.lineItems.map((li: any) => ({
            salesOrderId: li.salesOrderId,
            salesOrderNumber: li.salesOrderNumber,
            salesOrderDate: li.salesOrderDate,
            salesOrderItemId: li.salesOrderItemId,
            orderedQuantity: li.orderedQuantity,
            dispatchedQuantity: li.dispatchedQuantity,
            pendingQuantity: li.pendingQuantity,
            invoices: li.invoices.map((inv: any) => ({
              invoiceId: inv.invoiceId,
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              quantity: inv.quantity,
            })),
          })),
        })),
      });
    }

    // CSV format
    const csvRows: string[] = [];

    // Header row
    csvRows.push(
      [
        'Customer ID',
        'Customer Name',
        'Product ID',
        'Product Name',
        'Product SKU',
        'Primary PO Number',
        'Primary PO Date',
        'Total Order Received (MTS)',
        'Total Dispatched (MTS)',
        'Total Pending (MTS)',
        'Dispatch Status',
        'Has Anomaly',
        'Anomaly Message',
        'Sales Person',
        'Sales Person Email',
        'Unit of Measure',
        'Sales Order ID',
        'Sales Order Number',
        'Sales Order Date',
        'Sales Order Item ID',
        'Ordered Quantity (MTS)',
        'Dispatched Quantity (MTS)',
        'Pending Quantity (MTS)',
        'Invoice ID',
        'Invoice Number',
        'Invoice Date',
        'Invoice Quantity (MTS)',
      ].join(',')
    );

    // Data rows (one row per invoice line item for full traceability)
    entries.forEach((entry: any) => {
      if (entry.lineItems.length === 0) {
        // No line items, add summary row
        csvRows.push(
          [
            entry.customerId,
            `"${entry.customerName}"`,
            entry.productId,
            `"${entry.productName}"`,
            entry.productSKU || '',
            entry.primaryPONumber,
            entry.primaryPODate || '',
            entry.totalOrderReceived.toFixed(2),
            entry.totalDispatched.toFixed(2),
            entry.totalPending.toFixed(2),
            entry.dispatchStatus,
            entry.hasAnomaly ? 'Yes' : 'No',
            entry.anomalyMessage ? `"${entry.anomalyMessage}"` : '',
            `"${entry.salesPerson}"`,
            entry.salesPersonEmail,
            'MTS',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ].join(',')
        );
      } else {
        entry.lineItems.forEach((lineItem: any) => {
          if (lineItem.invoices.length === 0) {
            // No invoices, add line item row
            csvRows.push(
              [
                entry.customerId,
                `"${entry.customerName}"`,
                entry.productId,
                `"${entry.productName}"`,
                entry.productSKU || '',
                entry.primaryPONumber,
                entry.primaryPODate || '',
                entry.totalOrderReceived.toFixed(2),
                entry.totalDispatched.toFixed(2),
                entry.totalPending.toFixed(2),
                entry.dispatchStatus,
                entry.hasAnomaly ? 'Yes' : 'No',
                entry.anomalyMessage ? `"${entry.anomalyMessage}"` : '',
                `"${entry.salesPerson}"`,
                entry.salesPersonEmail,
                'MTS',
                lineItem.salesOrderId,
                lineItem.salesOrderNumber,
                lineItem.salesOrderDate,
                lineItem.salesOrderItemId,
                lineItem.orderedQuantity.toFixed(2),
                lineItem.dispatchedQuantity.toFixed(2),
                lineItem.pendingQuantity.toFixed(2),
                '',
                '',
                '',
                '',
              ].join(',')
            );
          } else {
            lineItem.invoices.forEach((invoice: any) => {
              csvRows.push(
                [
                  entry.customerId,
                  `"${entry.customerName}"`,
                  entry.productId,
                  `"${entry.productName}"`,
                  entry.productSKU || '',
                  entry.primaryPONumber,
                  entry.primaryPODate || '',
                  entry.totalOrderReceived.toFixed(2),
                  entry.totalDispatched.toFixed(2),
                  entry.totalPending.toFixed(2),
                  entry.dispatchStatus,
                  entry.hasAnomaly ? 'Yes' : 'No',
                  entry.anomalyMessage ? `"${entry.anomalyMessage}"` : '',
                  `"${entry.salesPerson}"`,
                  entry.salesPersonEmail,
                  'MTS',
                  lineItem.salesOrderId,
                  lineItem.salesOrderNumber,
                  lineItem.salesOrderDate,
                  lineItem.salesOrderItemId,
                  lineItem.orderedQuantity.toFixed(2),
                  lineItem.dispatchedQuantity.toFixed(2),
                  lineItem.pendingQuantity.toFixed(2),
                  invoice.invoiceId,
                  invoice.invoiceNumber,
                  invoice.invoiceDate,
                  invoice.quantity.toFixed(2),
                ].join(',')
              );
            });
          }
        });
      }
    });

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dispatch-register-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export dispatch register:', error);
    return NextResponse.json(
      {
        error: 'Failed to export dispatch register',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

