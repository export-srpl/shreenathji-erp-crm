# Migration Scripts

## Firestore to Postgres Migration

This script migrates historical data from Firestore to your Postgres database.

### Prerequisites

1. **Firebase Service Account**: You need a Firebase service account JSON file with Firestore read permissions.

2. **Environment Variables**: Set one of the following:
   - `FIREBASE_SERVICE_ACCOUNT` - JSON string of your service account credentials
   - `GOOGLE_APPLICATION_CREDENTIALS` - Path to your service account JSON file

3. **Database Connection**: Ensure `DATABASE_URL` is set in your `.env` file (already configured for Prisma/Neon).

### How to Run

1. **Set Firebase credentials** (choose one method):

   **Method 1: Environment variable with JSON string**
   ```bash
   # Windows PowerShell
   $env:FIREBASE_SERVICE_ACCOUNT = Get-Content -Path "path\to\service-account.json" -Raw

   # Linux/Mac
   export FIREBASE_SERVICE_ACCOUNT=$(cat path/to/service-account.json)
   ```

   **Method 2: Environment variable with file path**
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"

   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

2. **Run the migration script**:
   ```bash
   node scripts/migrate-firestore-to-postgres.cjs
   ```

3. **Monitor the output**: The script will log progress for each collection:
   - Migrating customers (clients collection)...
   - Migrated X customers.
   - Migrating leads (leads collection)...
   - Migrated Y leads.
   - etc.

### What Gets Migrated

The script migrates the following Firestore collections to Postgres:

| Firestore Collection | Postgres Table(s) | Notes |
|---------------------|-------------------|-------|
| `clients` | `Customer` | Maps customer data including contact info |
| `leads` | `Lead` | Maps lead data with status and source |
| `products` | `Product` | Maps product catalog |
| `quotes` | `Quote` + `QuoteItem` | Migrates quotes with line items |
| `proforma-invoices` | `ProformaInvoice` + `ProformaItem` | Migrates proforma invoices with line items |
| `sales-orders` | `SalesOrder` + `SalesOrderItem` | Migrates sales orders with line items |
| `invoices` | `Invoice` + `InvoiceItem` | Migrates invoices with line items |
| `payments` | `Payment` | Migrates payment records |

### Data Mapping

- **IDs**: Firestore document IDs are preserved as Postgres record IDs
- **Dates**: Firestore timestamps are converted to JavaScript Date objects
- **Line Items**: Arrays of line items are split into separate related records
- **Relationships**: Foreign keys (customerId, productId, etc.) are preserved if they match migrated IDs

### Safety Features

- **Upsert Logic**: The script uses `upsert` operations, so you can safely re-run it without creating duplicates
- **Error Handling**: Individual document failures are logged but don't stop the migration
- **Transaction Safety**: Each document is migrated independently

### Troubleshooting

**Error: "Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS"**
- Make sure you've set one of the environment variables before running the script

**Error: "Failed to migrate [entity]"**
- Check the console output for specific error messages
- Common issues:
  - Missing required fields (e.g., customerId that doesn't exist)
  - Invalid date formats
  - Data type mismatches

**No data migrated**
- Verify your Firestore collections exist and have data
- Check that your Firebase service account has read permissions
- Ensure your DATABASE_URL is correct and accessible

### Post-Migration

After migration:
1. Verify data in your Postgres database using Prisma Studio: `npx prisma studio`
2. Check that relationships are intact (e.g., quotes link to customers)
3. Update any hardcoded references if needed

