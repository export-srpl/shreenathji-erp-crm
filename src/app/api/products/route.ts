import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { productSchema, validateInput } from '@/lib/validation';

// GET /api/products - list products
export async function GET(req: Request) {
  try {
    // SECURITY: Require authentication
    const { requireAuth } = await import('@/lib/auth-utils');
    const authError = await requireAuth();
    if (authError) return authError;

    const prisma = await getPrismaClient();
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        hsnCode: true,
        description: true,
        unitPrice: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: error.message || 'Unknown error',
        code: error.code,
      },
      { status: 500 }
    );
  }
}

// POST /api/products - create a new product
export async function POST(req: Request) {
  try {
    const prisma = await getPrismaClient();
    const auth = await getAuthContext(req);
    if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // SECURITY: Validate and sanitize input
    // Transform body to match schema format
    const validationData = {
      name: body.productName ?? body.name,
      sku: body.sku || undefined,
    hsnCode: body.hsnCode || undefined,
      description: body.description || undefined,
      unitPrice: body.unitPrice ?? body.rate ?? 0,
      currency: body.currency || 'INR',
      stockQty: body.stockQty ?? 0,
    };

    const validation = validateInput(productSchema, validationData);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Prepare data
    const productData: any = {
      name: validatedData.name,
      description: validatedData.description || null,
      unitPrice: validatedData.unitPrice,
      currency: validatedData.currency,
      stockQty: validatedData.stockQty || 0,
    };

    // Only include sku if it's provided and not empty
    const sku = validatedData.sku && validatedData.sku.trim() !== '' ? validatedData.sku.trim() : null;
    if (sku) {
      productData.sku = sku;
    }

  if (validatedData.hsnCode && validatedData.hsnCode.trim() !== '') {
    productData.hsnCode = validatedData.hsnCode.trim();
  }

    const isUpsert = Boolean((body as any).upsert);

    // If upsert mode is enabled and SKU exists, update instead of failing
    if (sku && isUpsert) {
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        const updateData = { ...productData };
        // Don't update SKU; it's the identifier
        delete updateData.sku;
        const updated = await prisma.product.update({
          where: { sku },
          data: updateData,
        });
        return NextResponse.json(
          { ...updated, _mode: 'updated' },
          { status: 200 },
        );
      }
    }

    try {
      // Try to create a new product record
      const product = await prisma.product.create({
        data: productData,
      });
      return NextResponse.json(
        { ...product, _mode: 'created' },
        { status: 201 },
      );
    } catch (err: any) {
      // Handle unique constraint errors on SKU with a clear message
      if (err.code === 'P2002' && sku) {
        return NextResponse.json(
          {
            error: `A product with SKU "${sku}" already exists. Enable upsert or use a unique SKU.`,
            field: 'sku',
            sku,
            code: 'SKU_UNIQUE_CONSTRAINT',
          },
          { status: 409 },
        );
      }

      throw err;
    }
  } catch (error: any) {
    console.error('Failed to create product:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Bulk delete products
export async function DELETE(req: Request) {
  try {
    const prisma = await getPrismaClient();
    const auth = await getAuthContext(req);
    if (!auth.userId || !isRoleAllowed(auth.role, ['admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 });
    }

    // Delete all products in a single transaction
    const result = await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    });
  } catch (error: any) {
    console.error('Failed to bulk delete products:', error);
    
    // Handle Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete products' },
      { status: 500 }
    );
  }
}


