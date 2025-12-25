import { z } from 'zod';

/**
 * Common validation schemas for input sanitization
 */

// Email validation
export const emailSchema = z.string().email().max(255).toLowerCase().trim();

// Password validation - minimum 8 characters
export const passwordSchema = z.string().min(8).max(128);

// Strong password validation - 12+ chars with complexity
export const strongPasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Product validation (for create)
export const productSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  // SKU is optional; when provided, enforce format
  sku: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .nullable(),
  hsnCode: z.string().max(50).trim().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  // Allow zero-priced products (e.g. when importing without prices)
  unitPrice: z.number().nonnegative().max(999999999),
  currency: z.string().length(3).default('INR'),
  stockQty: z.number().int().min(0).optional(),
});

// Product validation (for update - all fields optional)
export const productUpdateSchema = productSchema.partial();

// Lead validation (for create)
export const leadSchema = z.object({
  companyName: z.string().min(1).max(200).trim(),
  contactName: z.string().max(100).trim().optional().nullable(),
  email: emailSchema.optional().nullable(),
  phone: z.string().max(20).regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format').optional().nullable(),
  country: z.string().max(100).trim().optional().nullable(),
  state: z.string().max(100).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  billingAddress: z.string().max(500).trim().optional().nullable(),
  shippingAddress: z.string().max(500).trim().optional().nullable(),
  gstNo: z.string().max(50).trim().optional().nullable(),
  status: z.string().max(50).trim(),
  source: z.string().max(100).trim().optional().nullable(),
  productInterest: z.string().max(200).trim().optional().nullable(),
  application: z.string().max(200).trim().optional().nullable(),
  monthlyRequirement: z.string().max(100).trim().optional().nullable(),
  followUpDate: z.union([
    z.string().datetime(),
    z.string(),
    z.date(),
    z.null(),
  ]).optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
});

// Lead validation (for update - all fields optional)
export const leadUpdateSchema = leadSchema
  .extend({
    ownerId: z.string().min(1).optional().nullable(),
  })
  .partial();

// Export currencies for international customers
export const exportCurrencies = ['USD', 'EUR', 'CNY', 'JPY', 'GBP', 'CAD', 'AUD', 'CHF', 'HKD', 'NZD', 'INR', 'RUB'] as const;

// Customer validation (for create)
export const customerSchema = z.object({
  companyName: z.string().min(1).max(200).trim(),
  customerType: z.string().max(50).trim(),
  contactName: z.string().max(100).trim().optional().nullable(),
  contactEmail: emailSchema.optional().nullable(),
  contactPhone: z.string().max(20).regex(/^[\d\s\-\+\(\)]+$/).optional().nullable(),
  contactTitle: z.string().max(100).trim().optional().nullable(),
  billingAddress: z.string().max(500).trim().optional().nullable(),
  shippingAddress: z.string().max(500).trim().optional().nullable(),
  country: z.string().max(100).trim(),
  state: z.string().max(100).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  gstNo: z.string().max(50).trim().optional().nullable(),
  currency: z.enum(exportCurrencies).optional().nullable(),
});

// Customer validation (for update - all fields optional)
export const customerUpdateSchema = customerSchema.partial();

// Quote item and update validation
export const quoteItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).optional(),
});

export const quoteUpdateSchema = z.object({
  status: z.string().max(50).trim().optional(),
  notes: z.string().max(2000).trim().optional().nullable(),
  items: z.array(quoteItemSchema).optional(),
});

// Invoice item and update validation
export const invoiceItemSchema = quoteItemSchema;

export const invoiceUpdateSchema = z.object({
  status: z.string().max(50).trim().optional(),
  notes: z.string().max(2000).trim().optional().nullable(),
  items: z.array(invoiceItemSchema).optional(),
});

// Sales order item and update validation
export const salesOrderItemSchema = quoteItemSchema;

export const salesOrderUpdateSchema = z.object({
  status: z.string().max(50).trim().optional(),
  notes: z.string().max(2000).trim().optional().nullable(),
  expectedShip: z.string().datetime().optional().nullable(),
  items: z.array(salesOrderItemSchema).optional(),
});

// Deal update validation
export const dealUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  stage: z.string().max(100).trim().optional(),
  customerId: z.string().min(1).optional(),
  winLossReasonId: z.string().min(1).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
      }),
    )
    .optional(),
});

// User profile validation
export const userProfileSchema = z.object({
  name: z.string().max(100).trim().optional().nullable(),
  password: passwordSchema.optional(),
  currentPassword: z.string().optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

// Admin user update validation
export const userAdminUpdateSchema = z.object({
  name: z.string().max(100).trim().optional().nullable(),
  email: emailSchema.optional(),
  role: z.enum(['Admin', 'Sales', 'Finance', 'User']).optional(),
  password: passwordSchema.optional(),
  salesScope: z.enum(['export_sales', 'domestic_sales']).optional().nullable(),
});

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Validate and sanitize input using a Zod schema
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

