# SRPL Auto-Numbering System

## Overview

A production-ready, system-level auto-numbering engine that generates unique identifiers with the `SRPL` prefix for all CRM modules. The system is fully backend-driven, thread-safe, and supports year/financial year segmentation.

## Format

- **Standard**: `SRPL-<MODULE-CODE>-<SEQUENCE>`
  - Example: `SRPL-LEAD-000001`, `SRPL-CUST-000001`
  
- **With Year**: `SRPL-<MODULE-CODE>-<YEAR>-<SEQUENCE>`
  - Example: `SRPL-INV-2025-000123`
  
- **With Financial Year**: `SRPL-<MODULE-CODE>-FY<YY>-<SEQUENCE>`
  - Example: `SRPL-INV-FY25-000123`

## Supported Modules

| Module | Code | Example ID |
|--------|------|------------|
| Customer | CUST | SRPL-CUST-000001 |
| Lead | LEAD | SRPL-LEAD-000001 |
| Product | PROD | SRPL-PROD-000001 |
| Vendor | VEND | SRPL-VEND-000001 |
| Deal | DEAL | SRPL-DEAL-000001 |
| Quotation | QUOT | SRPL-QUOT-000001 |
| Proforma Invoice | PI | SRPL-PI-000001 |
| Sales Order | SO | SRPL-SO-000001 |
| Invoice | INV | SRPL-INV-000001 |
| Credit Note | CN | SRPL-CN-000001 |
| Debit Note | DN | SRPL-DN-000001 |
| Delivery Challan | DC | SRPL-DC-000001 |
| Receipt | RCPT | SRPL-RCPT-000001 |
| Task | TASK | SRPL-TASK-000001 |
| Activity | ACT | SRPL-ACT-000001 |
| Payment | PAY | SRPL-PAY-000001 |

## Database Schema

### SequenceCounter
Tracks the current sequence number for each module (optionally per year/FY).

### SequenceConfig
Configuration for each module:
- `useYearPrefix`: Enable year-based sequences
- `useFinancialYear`: Enable financial year sequences
- `financialYearStart`: Month when FY starts (default: 4 = April)
- `padding`: Number of digits for sequence (default: 6)

## Usage

### In API Routes

```typescript
import { generateSRPLId } from '@/lib/srpl-id-generator';
import { getPrismaClient } from '@/lib/prisma';

const prisma = await getPrismaClient();

// Generate SRPL ID
const srplId = await generateSRPLId({
  moduleCode: 'LEAD',
  prisma,
});

// Create record with SRPL ID
const lead = await prisma.lead.create({
  data: {
    srplId, // Auto-generated
    companyName: 'Acme Corp',
    // ... other fields
  },
});
```

### Using Helper Function

```typescript
import { createWithSRPLId } from '@/lib/srpl-helpers';

const lead = await createWithSRPLId(
  prisma,
  'lead',
  'LEAD',
  {
    companyName: 'Acme Corp',
    // srplId will be auto-generated
  }
);
```

## Features

✅ **Thread-Safe**: Uses database transactions with row-level locking  
✅ **Atomic Operations**: No race conditions even with concurrent requests  
✅ **Idempotent**: Safe to retry on failures  
✅ **Rollback-Safe**: Transactional updates ensure consistency  
✅ **Configurable**: Year/FY prefixes can be enabled per module  
✅ **Non-Editable**: IDs are generated server-side, never user-editable  
✅ **Scalable**: Efficient database queries with proper indexing  

## Migration

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_srpl_auto_numbering_system
```

This will:
- Add `srplId` fields to all models
- Create `SequenceCounter` and `SequenceConfig` tables
- Initialize default configurations

### Step 2: Migrate Existing Records (Optional)

Run the migration script to generate SRPL IDs for existing records:

```bash
npx tsx scripts/migrate-srpl-ids.ts
```

This will:
- Find all records without `srplId`
- Generate SRPL IDs for them in chronological order
- Update records in batches

## Configuration

### Enable Year-Based Sequences

```typescript
// Via API (Admin only)
PATCH /api/srpl/config
{
  "moduleCode": "INV",
  "useYearPrefix": true
}
```

### Enable Financial Year Sequences

```typescript
PATCH /api/srpl/config
{
  "moduleCode": "INV",
  "useFinancialYear": true,
  "financialYearStart": 4  // April
}
```

## Implementation Status

- ✅ Database schema created
- ✅ Core ID generation service
- ✅ Thread-safe atomic operations
- ✅ Configuration management
- ✅ Migration script for existing records
- ✅ Example implementation in Leads API
- ⚠️ **TODO**: Update remaining API routes (Customers, Products, Quotes, etc.)
- ⚠️ **TODO**: Update frontend to display SRPL IDs
- ⚠️ **TODO**: Add SRPL ID to search/filter functionality

## Next Steps

1. **Update All API Routes**: Add SRPL ID generation to:
   - `/api/customers` (POST)
   - `/api/products` (POST)
   - `/api/quotes` (POST)
   - `/api/sales-orders` (POST)
   - `/api/proforma-invoices` (POST)
   - `/api/invoices` (POST)
   - And all other module creation endpoints

2. **Update Frontend**: 
   - Display SRPL IDs in all listings
   - Add SRPL ID column to tables
   - Include in search/filter
   - Show in PDF exports

3. **Update Form Submission**: 
   - Lead capture forms should use SRPL ID generation

## Security

- SRPL IDs are **never editable** by users
- Generation happens **server-side only**
- Configuration changes require **admin role**
- All operations are **audit-safe** and **transactional**

## Performance

- Uses database-level locking for concurrency
- Indexed on `moduleCode`, `year`, and `financialYear`
- Efficient queries with proper WHERE clauses
- Batch operations supported for migrations

