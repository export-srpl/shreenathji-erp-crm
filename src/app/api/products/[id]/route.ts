import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { productUpdateSchema, validateInput } from '@/lib/validation';
import { checkPricingApproval, isPendingApproval } from '@/lib/approval-integration';
import { logAudit } from '@/lib/audit-logger';

type Params = {
  params: { id: string };
};

// GET /api/products/[id] - Get a single product
export async function GET(_req: Request, { params }: Params) {
  // SECURITY: Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const prisma = await getPrismaClient();

  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PATCH /api/products/[id] - Update a product
export async function PATCH(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();
  const body = await req.json();

  try {
    // Validate and sanitize incoming data (all fields optional on update)
    const validation = validateInput(productUpdateSchema, {
      name: body.productName ?? body.name,
      sku: body.sku,
      description: body.description,
      unitPrice: body.unitPrice ?? body.rate,
      currency: body.currency,
      stockQty: body.stockQty,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Load existing product for comparison
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const pending = await isPendingApproval(
      prisma,
      'product',
      params.id,
      'update'
    );

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This product has pending approval requests. Please wait for approval before making changes.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check for price changes that require approval
    if (data.unitPrice !== undefined && auth.userId) {
      const ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        null;
      const userAgent = req.headers.get('user-agent') || null;

      const approvalCheck = await checkPricingApproval(prisma, {
        resource: 'product',
        resourceId: params.id,
        userId: auth.userId,
        unitPrice: data.unitPrice,
        existingUnitPrice: existing.unitPrice ? Number(existing.unitPrice) : undefined,
        ipAddress,
        userAgent,
      });

      if (approvalCheck.requiresApproval) {
        if (approvalCheck.error) {
          return NextResponse.json(
            {
              error: approvalCheck.error,
              approvalRequestId: approvalCheck.approvalRequestId,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            error: 'Approval required',
            message: 'This price change requires approval before it can be applied.',
            approvalRequestId: approvalCheck.approvalRequestId,
            requiresApproval: true,
          },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stockQty !== undefined) updateData.stockQty = data.stockQty;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    // Phase 4: Log audit entry for price changes
    if (data.unitPrice !== undefined && auth.userId) {
      const ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        null;
      const userAgent = req.headers.get('user-agent') || null;

      await logAudit(prisma, {
        userId: auth.userId,
        action: 'pricing_updated',
        resource: 'product',
        resourceId: params.id,
        details: {
          productName: product.name,
          sku: product.sku,
          oldPrice: existing.unitPrice ? Number(existing.unitPrice) : null,
          newPrice: Number(product.unitPrice),
          priceChangePct: existing.unitPrice
            ? ((Number(product.unitPrice) - Number(existing.unitPrice)) / Number(existing.unitPrice)) * 100
            : null,
        },
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(req: Request, { params }: Params) {
  const auth = await getAuthContext(req);
  if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = await getPrismaClient();

  try {
    // Load product to check if it exists and get details
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Phase 4: Check if there's a pending approval request
    const { isPendingApproval } = await import('@/lib/approval-integration');
    const pending = await isPendingApproval(prisma, 'product', params.id, 'delete');

    if (pending) {
      return NextResponse.json(
        {
          error: 'Pending approval required',
          message: 'This product deletion has pending approval requests. Please wait for approval before deleting.',
        },
        { status: 403 }
      );
    }

    // Phase 4: Check if approval is required for product deletion
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      null;
    const userAgent = req.headers.get('user-agent') || null;

    const { checkAndRequestApproval } = await import('@/lib/approval-integration');
    const approvalCheck = await checkAndRequestApproval(prisma, {
      resource: 'product',
      resourceId: params.id,
      action: 'delete',
      data: {
        productName: product.name,
        sku: product.sku,
      },
      userId: auth.userId,
      ipAddress,
      userAgent,
    });

    if (approvalCheck.requiresApproval) {
      if (approvalCheck.error) {
        return NextResponse.json(
          {
            error: approvalCheck.error,
            approvalRequestId: approvalCheck.approvalRequestId,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Approval required',
          message: 'Product deletion requires approval before it can be performed.',
          approvalRequestId: approvalCheck.approvalRequestId,
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    // Phase 4: Log audit entry before deletion
    const { logAudit } = await import('@/lib/audit-logger');
    await logAudit(prisma, {
      userId: auth.userId,
      action: 'product_deleted',
      resource: 'product',
      resourceId: params.id,
      details: {
        productName: product.name,
        sku: product.sku,
      },
      ipAddress,
      userAgent,
    });

    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

