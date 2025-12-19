/**
 * Seed default permissions for RBAC system
 * Run with: npx tsx scripts/seed-permissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPermissions = [
  // Admin: Full access to everything
  { resource: 'lead', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all leads' },
  { resource: 'lead', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create leads' },
  { resource: 'lead', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all leads' },
  { resource: 'lead', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete leads' },
  
  { resource: 'deal', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all deals' },
  { resource: 'deal', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create deals' },
  { resource: 'deal', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all deals' },
  { resource: 'deal', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete deals' },
  
  { resource: 'customer', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all customers' },
  { resource: 'customer', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create customers' },
  { resource: 'customer', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all customers' },
  { resource: 'customer', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete customers' },
  
  { resource: 'product', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all products' },
  { resource: 'product', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create products' },
  { resource: 'product', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all products' },
  { resource: 'product', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete products' },
  
  { resource: 'quote', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all quotes' },
  { resource: 'quote', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create quotes' },
  { resource: 'quote', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all quotes' },
  { resource: 'quote', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete quotes' },
  
  { resource: 'invoice', action: 'view_all', scope: 'all', role: 'admin', description: 'Admin can view all invoices' },
  { resource: 'invoice', action: 'create', scope: 'all', role: 'admin', description: 'Admin can create invoices' },
  { resource: 'invoice', action: 'edit_all', scope: 'all', role: 'admin', description: 'Admin can edit all invoices' },
  { resource: 'invoice', action: 'delete', scope: 'all', role: 'admin', description: 'Admin can delete invoices' },

  // Sales: Own records + team visibility
  { resource: 'lead', action: 'view', scope: 'own', role: 'sales', description: 'Sales can view own leads' },
  { resource: 'lead', action: 'view', scope: 'team', role: 'sales', description: 'Sales can view team leads' },
  { resource: 'lead', action: 'create', scope: 'own', role: 'sales', description: 'Sales can create leads' },
  { resource: 'lead', action: 'update', scope: 'own', role: 'sales', description: 'Sales can update own leads' },
  
  { resource: 'deal', action: 'view', scope: 'own', role: 'sales', description: 'Sales can view own deals' },
  { resource: 'deal', action: 'view', scope: 'team', role: 'sales', description: 'Sales can view team deals' },
  { resource: 'deal', action: 'create', scope: 'own', role: 'sales', description: 'Sales can create deals' },
  { resource: 'deal', action: 'update', scope: 'own', role: 'sales', description: 'Sales can update own deals' },
  
  { resource: 'quote', action: 'view', scope: 'own', role: 'sales', description: 'Sales can view own quotes' },
  { resource: 'quote', action: 'view', scope: 'team', role: 'sales', description: 'Sales can view team quotes' },
  { resource: 'quote', action: 'create', scope: 'own', role: 'sales', description: 'Sales can create quotes' },
  { resource: 'quote', action: 'update', scope: 'own', role: 'sales', description: 'Sales can update own quotes' },
  
  { resource: 'customer', action: 'view', scope: 'all', role: 'sales', description: 'Sales can view all customers' },
  { resource: 'customer', action: 'create', scope: 'own', role: 'sales', description: 'Sales can create customers' },
  { resource: 'customer', action: 'update', scope: 'own', role: 'sales', description: 'Sales can update own customers' },
  
  { resource: 'product', action: 'view', scope: 'all', role: 'sales', description: 'Sales can view all products' },
  
  { resource: 'invoice', action: 'view', scope: 'own', role: 'sales', description: 'Sales can view own invoices' },
  { resource: 'invoice', action: 'view', scope: 'team', role: 'sales', description: 'Sales can view team invoices' },

  // Finance: View-only for most, full access to invoices
  { resource: 'lead', action: 'view', scope: 'all', role: 'finance', description: 'Finance can view all leads' },
  { resource: 'deal', action: 'view', scope: 'all', role: 'finance', description: 'Finance can view all deals' },
  { resource: 'customer', action: 'view', scope: 'all', role: 'finance', description: 'Finance can view all customers' },
  { resource: 'product', action: 'view', scope: 'all', role: 'finance', description: 'Finance can view all products' },
  { resource: 'quote', action: 'view', scope: 'all', role: 'finance', description: 'Finance can view all quotes' },
  { resource: 'invoice', action: 'view_all', scope: 'all', role: 'finance', description: 'Finance can view all invoices' },
  { resource: 'invoice', action: 'create', scope: 'all', role: 'finance', description: 'Finance can create invoices' },
  { resource: 'invoice', action: 'edit_all', scope: 'all', role: 'finance', description: 'Finance can edit all invoices' },

  // Field-level permissions: Protect sensitive fields
  { resource: 'product', action: 'view', scope: 'all', role: 'sales', field: 'unitPrice', description: 'Sales can view product prices' },
  { resource: 'product', action: 'update', scope: 'all', role: 'sales', field: 'unitPrice', description: 'Sales cannot edit product prices' },
  
  { resource: 'customer', action: 'view', scope: 'all', role: 'sales', field: 'gstNo', description: 'Sales can view GST numbers' },
  { resource: 'customer', action: 'update', scope: 'all', role: 'sales', field: 'gstNo', description: 'Sales can edit GST numbers' },
  
  { resource: 'lead', action: 'view', scope: 'all', role: 'finance', field: 'gstNo', description: 'Finance can view GST numbers' },
  { resource: 'lead', action: 'view', scope: 'all', role: 'finance', field: 'vatNumber', description: 'Finance can view VAT numbers' },
];

async function seedPermissions() {
  console.log('Seeding default permissions...');

  for (const perm of defaultPermissions) {
    try {
      // Create or find permission
      // Note: Prisma generates a compound unique constraint name
      // We'll use findFirst + create/update pattern instead
      let permission = await prisma.permission.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
          field: perm.field || null,
          scope: perm.scope,
        },
      });

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            resource: perm.resource,
            action: perm.action,
            field: perm.field || null,
            scope: perm.scope,
            description: perm.description,
          },
        });
      } else {
        permission = await prisma.permission.update({
          where: { id: permission.id },
          data: {
            description: perm.description,
          },
        });
      }

      // Create or find role permission
      const existing = await prisma.rolePermission.findFirst({
        where: {
          role: perm.role,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            role: perm.role,
            permissionId: permission.id,
          },
        });
      }

      console.log(`✓ ${perm.role} -> ${perm.resource}.${perm.action}${perm.field ? `.${perm.field}` : ''} (${perm.scope})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⊘ Already exists: ${perm.role} -> ${perm.resource}.${perm.action}`);
      } else {
        console.error(`✗ Failed to seed: ${perm.role} -> ${perm.resource}.${perm.action}`, error);
      }
    }
  }

  console.log('Done seeding permissions!');
}

seedPermissions()
  .catch((error) => {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

