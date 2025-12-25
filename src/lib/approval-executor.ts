import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './prisma';

export interface ExecutionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Execute an approved action based on the approval request metadata
 */
export async function executeApprovedAction(
  prisma: PrismaClient,
  requestId: string
): Promise<ExecutionResult> {
  try {
    // Load the approval request
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== 'approved') {
      return { success: false, error: 'Request is not approved' };
    }

    // Parse metadata to get original operation data
    let metadata: Record<string, any> = {};
    try {
      metadata = request.metadata ? JSON.parse(request.metadata) : {};
    } catch (e) {
      return { success: false, error: 'Invalid metadata format' };
    }

    const { resource, resourceId, action } = request;

    // Execute based on resource type and action
    switch (resource) {
      case 'quote':
      case 'invoice':
      case 'sales_order':
      case 'proforma_invoice':
        if (action === 'update' || action === 'pricing_override' || action === 'discount_override') {
          return await executeDocumentUpdate(prisma, resource, resourceId, metadata);
        }
        break;

      case 'product':
        if (action === 'update' || action === 'pricing_override') {
          return await executeProductUpdate(prisma, resourceId, metadata);
        }
        break;

      case 'document':
        if (action === 'delete') {
          // Document deletion is handled separately - return success as deletion
          // was already performed or needs manual execution
          return { success: true, data: { message: 'Document deletion requires manual execution' } };
        }
        break;

      default:
        return { success: false, error: `Unknown resource type: ${resource}` };
    }

    return { success: false, error: `Action ${action} for ${resource} not implemented` };
  } catch (error) {
    console.error('Failed to execute approved action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute document (quote/invoice/sales_order/proforma_invoice) update
 */
async function executeDocumentUpdate(
  prisma: PrismaClient,
  resource: string,
  resourceId: string,
  metadata: Record<string, any>
): Promise<ExecutionResult> {
  try {
    // Get the update data from metadata
    const updateData = metadata.updateData || metadata.data || {};
    const items = updateData.items || metadata.items;

    if (!items || !Array.isArray(items)) {
      return { success: false, error: 'Items data not found in metadata' };
    }

    // Map resource to Prisma model
    const modelMap: Record<string, string> = {
      quote: 'quote',
      invoice: 'invoice',
      sales_order: 'salesOrder',
      proforma_invoice: 'proformaInvoice',
    };

    const modelName = modelMap[resource];
    if (!modelName) {
      return { success: false, error: `Unknown document type: ${resource}` };
    }

    // Execute update based on resource type
    switch (resource) {
      case 'quote':
        await prisma.quote.update({
          where: { id: resourceId },
          data: {
            items: {
              deleteMany: { quoteId: resourceId },
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            },
          },
        });
        break;

      case 'invoice':
        await prisma.invoice.update({
          where: { id: resourceId },
          data: {
            items: {
              deleteMany: { invoiceId: resourceId },
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            },
          },
        });
        break;

      case 'sales_order':
        await prisma.salesOrder.update({
          where: { id: resourceId },
          data: {
            items: {
              deleteMany: { salesOrderId: resourceId },
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            },
          },
        });
        break;

      case 'proforma_invoice':
        await prisma.proformaInvoice.update({
          where: { id: resourceId },
          data: {
            items: {
              deleteMany: { proformaId: resourceId },
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct ?? 0,
              })),
            },
          },
        });
        break;
    }

    return { success: true, data: { message: `${resource} updated successfully` } };
  } catch (error) {
    console.error(`Failed to execute ${resource} update:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * Execute product update
 */
async function executeProductUpdate(
  prisma: PrismaClient,
  productId: string,
  metadata: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const updateData = metadata.updateData || metadata.data || {};
    const unitPrice = updateData.unitPrice || metadata.unitPrice;

    if (unitPrice === undefined) {
      return { success: false, error: 'Unit price not found in metadata' };
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        unitPrice: unitPrice,
      },
    });

    return { success: true, data: { message: 'Product updated successfully' } };
  } catch (error) {
    console.error('Failed to execute product update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

