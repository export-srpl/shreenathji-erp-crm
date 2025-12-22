import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getAuthContext, isRoleAllowed } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-utils';
import { customerSchema, validateInput } from '@/lib/validation';
import { logActivity } from '@/lib/activity-logger';

// GET /api/customers - list customers
export async function GET(req: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth();
    if (authError) {
      console.error('Authentication failed:', authError.status);
      return authError;
    }

    let prisma;
    try {
      prisma = await getPrismaClient();
    } catch (prismaError: any) {
      console.error('Error getting Prisma client:', prismaError);
      return NextResponse.json(
        { error: 'Database connection error', details: prismaError.message },
        { status: 500 }
      );
    }

    let auth;
    try {
      auth = await getAuthContext(req);
    } catch (authError: any) {
      console.error('Error getting auth context:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 500 }
      );
    }

    if (!auth.userId) {
      console.error('No userId in auth context');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get visibility filter based on user's scope (includes country filtering for salesScope)
    let visibilityFilter: any = {};
    try {
      const { getVisibilityFilter } = await import('@/lib/rbac');
      visibilityFilter = await getVisibilityFilter(prisma, auth, 'customer', 'all');
    } catch (rbacError: any) {
      console.error('Error getting visibility filter:', rbacError);
      console.error('RBAC error stack:', rbacError.stack);
      // Fallback: if RBAC fails, admin sees all, others see none
      if (auth.role === 'admin') {
        visibilityFilter = {};
      } else {
        // For non-admin, try to get salesScope directly
        try {
          const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: { salesScope: true },
          });
          if (user?.salesScope === 'domestic_sales') {
            visibilityFilter = { country: 'India' };
          } else if (user?.salesScope === 'export_sales') {
            visibilityFilter = { country: { not: 'India' } };
          } else {
            visibilityFilter = {};
          }
        } catch (userError: any) {
          console.error('Error fetching user for fallback filter:', userError);
          visibilityFilter = {};
        }
      }
    }

    // Ensure visibilityFilter is a valid object
    if (!visibilityFilter || typeof visibilityFilter !== 'object' || Array.isArray(visibilityFilter)) {
      console.warn('Invalid visibility filter, using empty object');
      visibilityFilter = {};
    }

    // Clean the filter - remove any undefined or null values that might cause Prisma errors
    const cleanFilter: any = {};
    for (const [key, value] of Object.entries(visibilityFilter)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively clean nested objects
          const cleanNested: any = {};
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            if (nestedValue !== undefined && nestedValue !== null) {
              cleanNested[nestedKey] = nestedValue;
            }
          }
          if (Object.keys(cleanNested).length > 0) {
            cleanFilter[key] = cleanNested;
          }
        } else {
          cleanFilter[key] = value;
        }
      }
    }

    console.log('Customers GET - fetching customers with filter:', JSON.stringify(cleanFilter));
    console.log('Customers GET - user role:', auth.role);
    console.log('Customers GET - user salesScope:', auth.salesScope);
    
    // Build where clause - use empty object instead of undefined for Prisma
    // Soft-delete: exclude inactive customers by default unless includeInactive=true
    const searchParams = new URL(req.url).searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClauseBase = Object.keys(cleanFilter).length > 0 ? cleanFilter : {};
    const whereClause = includeInactive
      ? whereClauseBase
      : { AND: [whereClauseBase, { isActive: { not: false } }] };
    
    let customers;
    try {
      // First, try a simple query to test database connection
      try {
        const testQuery = await prisma.customer.count();
        console.log(`Customers GET - database connection OK. Total customers in DB: ${testQuery}`);
      } catch (testError: any) {
        console.error('Customers GET - database connection test failed:', testError);
        console.error('Customers GET - test error details:', {
          name: testError.name,
          code: testError.code,
          message: testError.message
        });
        return NextResponse.json(
          { 
            error: 'Database connection failed', 
            details: testError.message,
            code: testError.code || 'CONNECTION_ERROR'
          },
          { status: 500 }
        );
      }
      
      // Now run the actual query - only include where if filter has keys
      const queryOptions: any = {
        select: {
          id: true,
          srplId: true,
          companyName: true,
          customerType: true,
          isActive: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          contactTitle: true,
          billingAddress: true,
          shippingAddress: true,
          country: true,
          state: true,
          city: true,
          gstNo: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      };
      
      // Only add where clause if filter has keys
      if (Object.keys(whereClause).length > 0) {
        queryOptions.where = whereClause;
      }
      
      console.log('Customers GET - executing query with options:', JSON.stringify({
        hasWhere: Object.keys(whereClause).length > 0,
        whereKeys: Object.keys(whereClause),
        orderBy: queryOptions.orderBy
      }));
      
      customers = await prisma.customer.findMany(queryOptions);
      console.log(`Customers GET - query succeeded, found ${customers.length} customers`);
    } catch (dbError: any) {
      console.error('Customers GET - database query error:', dbError);
      console.error('Customers GET - database error name:', dbError.name);
      console.error('Customers GET - database error code:', dbError.code);
      console.error('Customers GET - database error message:', dbError.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Customers GET - database error stack:', dbError.stack);
      }
      console.error('Customers GET - filter that caused error:', JSON.stringify(cleanFilter));
      console.error('Customers GET - where clause:', JSON.stringify(whereClause));
      
      // Try a fallback query without filter
      try {
        console.log('Customers GET - attempting fallback query without filter...');
        customers = await prisma.customer.findMany({
          select: {
            id: true,
            srplId: true,
            companyName: true,
            customerType: true,
            isActive: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            contactTitle: true,
            billingAddress: true,
            shippingAddress: true,
            country: true,
            state: true,
            city: true,
            gstNo: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to prevent huge results
        });
        console.log(`Customers GET - fallback query succeeded, returning ${customers.length} limited results`);
      } catch (fallbackError: any) {
        console.error('Customers GET - fallback query also failed:', fallbackError);
        console.error('Customers GET - fallback error details:', {
          name: fallbackError.name,
          code: fallbackError.code,
          message: fallbackError.message,
          stack: process.env.NODE_ENV === 'development' ? fallbackError.stack : undefined
        });
        return NextResponse.json(
          { 
            error: 'Database query failed', 
            details: dbError.message || 'Unknown database error',
            code: dbError.code || 'UNKNOWN_ERROR',
            name: dbError.name || 'Error',
            fallbackError: fallbackError.message,
            stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
          },
          { status: 500 }
        );
      }
    }

    console.log(`Customers GET - returning ${customers.length} customers`);
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error('Unexpected error fetching customers:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch customers', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/customers - create a new customer
export async function POST(req: Request) {
  try {
    // SECURITY: Require authentication
    const authError = await requireAuth();
    if (authError) {
      console.error('Authentication failed in POST:', authError.status);
      return authError;
    }

    let prisma;
    try {
      prisma = await getPrismaClient();
    } catch (prismaError: any) {
      console.error('Error getting Prisma client in POST:', prismaError);
      return NextResponse.json(
        { error: 'Database connection error', details: prismaError.message },
        { status: 500 }
      );
    }

    let auth;
    try {
      auth = await getAuthContext(req);
    } catch (authError: any) {
      console.error('Error getting auth context in POST:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 500 }
      );
    }

    if (!auth.userId) {
      console.error('No userId in auth context for POST');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - allow admin or users with salesScope
    const canCreate = auth.role === 'admin' || auth.salesScope === 'export_sales' || auth.salesScope === 'domestic_sales';
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError: any) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body', details: jsonError.message },
        { status: 400 }
      );
    }

    // Enforce country restriction based on salesScope
    if (auth.salesScope === 'domestic_sales' && body.country !== 'India') {
      return NextResponse.json(
        { error: 'Domestic Sales users can only create companies for India' },
        { status: 403 }
      );
    }
    if (auth.salesScope === 'export_sales' && body.country === 'India') {
      return NextResponse.json(
        { error: 'Export Sales users can only create companies for countries other than India' },
        { status: 403 }
      );
    }

    // SECURITY: Validate and sanitize input
    const validationData = {
      companyName: body.companyName,
      customerType: body.customerType,
      country: body.country,
      state: body.state,
      city: body.city,
      gstNo: body.gstNo,
      billingAddress: body.billingAddress,
      shippingAddress: body.shippingAddress,
      contactName: body.contactPerson?.name || body.contactName,
      contactEmail: body.contactPerson?.email || body.contactEmail,
      contactPhone: body.contactPerson?.phone || body.contactPhone,
      contactTitle: body.contactPerson?.designation || body.contactTitle,
      currency: body.currency,
    };

    const validation = validateInput(customerSchema, validationData);
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Set default currency for non-India customers if not provided
    let currencyValue = validatedData.currency;
    if (!currencyValue && validatedData.country !== 'India') {
      currencyValue = 'USD'; // Default to USD for export customers
    }

    let customer;
    try {
      // Test database connection first
      await prisma.customer.count();

      // Create customer
      customer = await prisma.customer.create({
        data: {
          companyName: validatedData.companyName,
          customerType: validatedData.customerType,
          country: validatedData.country,
          state: validatedData.state || null,
          city: validatedData.city || null,
          gstNo: validatedData.gstNo || null,
          billingAddress: validatedData.billingAddress || null,
          shippingAddress: validatedData.shippingAddress || null,
          contactName: validatedData.contactName || null,
          contactEmail: validatedData.contactEmail || null,
          contactPhone: validatedData.contactPhone || null,
          contactTitle: validatedData.contactTitle || null,
          currency: currencyValue || null,
        },
      });
    } catch (dbError: any) {
      console.error('Database error creating customer:', dbError);
      console.error('Database error name:', dbError.name);
      console.error('Database error code:', dbError.code);
      console.error('Database error message:', dbError.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Database error stack:', dbError.stack);
      }
      console.error('Customer data that caused error:', JSON.stringify(validatedData));
      
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          details: dbError.message || 'Failed to create customer',
          code: dbError.code || 'UNKNOWN_ERROR',
          name: dbError.name || 'Error',
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        },
        { status: 500 }
      );
    }

    // Log activity: customer created (non-blocking)
    try {
      await logActivity({
        prisma,
        module: 'CUST',
        entityType: 'customer',
        entityId: customer.id,
        srplId: (customer as any).srplId || undefined,
        action: 'create',
        description: `Customer created: ${customer.companyName}`,
        metadata: {
          customerType: customer.customerType,
          country: customer.country,
        },
        performedById: auth.userId,
      });
    } catch (logError: any) {
      // Don't fail the request if logging fails
      console.error('Failed to log activity:', logError);
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error creating customer:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to create customer', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


