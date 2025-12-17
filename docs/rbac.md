# Role-Based Access Control (RBAC)

This document explains how RBAC works in the `shreenathji-erp-crm` backend, which roles exist, what each role can do, and how to manually verify that permissions are enforced correctly.

RBAC is implemented in two layers:

- **Authentication & identity** – handled by `src/lib/auth.ts` via a `User` record in Postgres and optional Firebase headers.
- **Authorization** – enforced in API routes using the helper `isRoleAllowed(role, allowedRoles)`.

> **Important (dev mode):** When no `x-firebase-uid` header is present, `getAuthContext` returns a synthetic `"dev-user"` with role `"admin"` so local development and manual testing work without a full auth setup. In production you **must** remove this shortcut and enforce real authentication.

---

## 1. Roles and their permissions

The system defines the following roles (`AppRole` in `src/lib/auth.ts`):

```ts
export type AppRole = 'admin' | 'sales' | 'finance' | 'user';
```

High‑level expectations:

- **admin**
  - Full read & write access to all business entities.
  - Can manage customers, leads, quotes, proformas, sales orders, invoices, payments, users/roles.
- **sales**
  - Manage sales pipeline: leads, quotes, proformas, sales orders.
  - Read‑only access to invoices, payments, customers (except where explicitly allowed).
- **finance**
  - Manage invoices and payments.
  - Read access to customers, sales orders, reports.
- **user**
  - Read‑only access to high‑level dashboards and reports (no write access by default).

### 1.1 API routes and allowed roles

Below is a summary of write operations and which roles are allowed.

#### Leads

- `GET /api/leads` – **any role** (no auth check; read‑only).
- `POST /api/leads` – `admin`, `sales`.
- `POST /api/leads/import` – `admin`, `sales`.
- `POST /api/leads/[id]/status` – `admin`, `sales`.

#### Customers

- `GET /api/customers` – **any role** (no auth check; read‑only).
- `POST /api/customers` – `admin`, `sales`.
- `POST /api/customers/import` – `admin`, `sales`.
- `DELETE /api/customers/[id]` – `admin`, `sales`.

#### Products

- `GET /api/products` – **any role**.
- `POST /api/products` – `admin` only.

#### Sales orders / Quotes / Proformas

- `GET /api/quotes`, `GET /api/proforma-invoices`, `GET /api/sales-orders` – **any role**.
- `POST /api/quotes` – `admin`, `sales`.
- `PATCH /api/quotes/[id]` – `admin`, `sales`.
- `POST /api/proforma-invoices` – `admin`, `sales`.
- `PATCH /api/proforma-invoices/[id]` – `admin`, `sales`.
- `POST /api/sales-orders` – `admin`, `sales`.
- `PATCH /api/sales-orders/[id]` – `admin`, `sales`.

#### Invoices & Payments

- `GET /api/invoices`, `GET /api/invoices/[id]` – **any role**.
- `POST /api/invoices` – `admin`, `finance`.
- `PATCH /api/invoices/[id]` – `admin`, `finance`.
- `POST /api/payments` – `admin`, `finance`.

#### Reports

- `GET /api/reports/sales-summary` – **any role** (read‑only).
- `GET /api/reports/conversion-funnel` – **any role**.
- `GET /api/reports/top-customers` – **any role**.

#### PDF endpoints

- `GET /api/quotes/[id]/pdf` – **any role** (read‑only).
- `GET /api/proforma-invoices/[id]/pdf` – **any role**.
- `GET /api/invoices/[id]/pdf` – **any role**.

---

## 2. How RBAC is implemented

### 2.1 Auth context helper (`src/lib/auth.ts`)

Key pieces:

- `getAuthContext(req)`:
  - Reads headers:
    - `x-firebase-uid` – unique identifier from Firebase (or other IdP).
    - `x-user-email` – optional email.
  - Looks up (or creates) a `User` row in Postgres with fields:
    - `id`, `firebaseUid`, `email`, `role`.
  - Returns:
    ```ts
    export interface AuthContext {
      userId: string | null;
      firebaseUid: string | null;
      email: string | null;
      role: AppRole;
    }
    ```
- **Dev fallback**:
  - If `x-firebase-uid` is missing, it returns:
    ```ts
    {
      userId: 'dev-user',
      firebaseUid: null,
      email,
      role: 'admin',
    }
    ```
  - This makes all writes behave as if an admin is logged in (convenient for local testing).

> **Production note:** Replace this fallback with a proper 401/403 once you integrate real authentication. For example, return `userId: null, role: 'user'` when there is no valid token.

### 2.2 Authorization helper (`isRoleAllowed`)

`src/lib/auth.ts`:

```ts
export function isRoleAllowed(role: AppRole, allowed: AppRole[]): boolean {
  return allowed.includes(role);
}
```

All mutating API routes call it like:

```ts
const auth = await getAuthContext(req);
if (!auth.userId || !isRoleAllowed(auth.role, ['admin', 'sales'])) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

This pattern is already used in all `POST`/`PATCH`/`DELETE` handlers across:

- `src/app/api/leads/*`, `customers/*`, `products/*`, `quotes/*`,  
  `proforma-invoices/*`, `sales-orders/*`, `invoices/*`, `payments/*`.

---

## 3. Manual RBAC test checklist

Use this checklist whenever you change RBAC rules or add new endpoints.

### 3.1 Setup

1. Start the app:
   ```bash
   npm run dev -- -p 3000
   ```
2. Ensure `DATABASE_URL` is set in `.env` and Prisma migrations are applied:
   ```bash
   npx prisma migrate status
   ```
3. For realistic RBAC tests (without dev fallback), temporarily edit `getAuthContext` to:
   ```ts
   if (!firebaseUid) {
     return { userId: null, firebaseUid: null, email: null, role: 'user' };
   }
   ```
   (Remember to revert this after testing if you rely on the dev admin.)

### 3.2 Testing with different roles

Use a REST client (VS Code REST, Postman, or `curl`) and set headers:

```http
X-Firebase-Uid: <some-user-id>
X-User-Email: some.user@example.com
```

Then manually configure the user’s role in the database (`User.role` column) via psql / a SQL client / Prisma Studio.

#### A. Admin user (`role = 'admin'`)

1. **Leads**
   - `GET /api/leads` → **200**, returns list.
   - `POST /api/leads` with valid body → **201**, new lead appears in DB and `/sales/leads`.
2. **Customers**
   - `POST /api/customers` → **201**, new customer visible on `/customers`.
   - `DELETE /api/customers/:id` → **200** and row removed.
3. **Sales docs**
   - `POST /api/quotes` / `POST /api/proforma-invoices` / `POST /api/sales-orders` / `POST /api/invoices` → **201**.
4. **Payments**
   - `POST /api/payments` → **201** and record appears in `/finance/payments-received`.

#### B. Sales user (`role = 'sales'`)

1. **Leads**
   - `GET /api/leads` → **200**.
   - `POST /api/leads` → **201**.
2. **Quotes / Proformas / Sales Orders**
   - Can `POST` and `PATCH` these endpoints → **201/200**.
3. **Invoices / Payments**
   - `POST /api/invoices` or `/api/payments` → should return **403 Forbidden**.

#### C. Finance user (`role = 'finance'`)

1. **Invoices & payments**
   - `POST /api/invoices`, `PATCH /api/invoices/:id`, `POST /api/payments` → **201/200**.
2. **Leads / Quotes / Sales Orders**
   - `POST /api/leads`, `POST /api/quotes`, `POST /api/sales-orders` → should return **403**.

#### D. Basic user (`role = 'user'`)

1. All `GET` endpoints (`/api/leads`, `/api/customers`, `/api/reports/*`, etc.) → **200**.
2. All `POST`/`PATCH`/`DELETE` to business entities → **403 Forbidden**.

### 3.3 Frontend smoke checks

With the dev fallback in place (`dev-user` as admin):

1. Log in at `/login` and ensure you can:
   - Create a lead, customer, quote, proforma, sales order, invoice, and payment.
   - See those records reflected on the corresponding list pages.
2. Temporarily change the fallback role in `getAuthContext` to `'user'`:
   - Try the same actions; all create/update/delete buttons should now show a **“Forbidden”** toast, and the Network tab should show `403` responses.

---

## 4. Future improvements

- Replace the dev fallback with a real auth flow (e.g., NextAuth + credentials/JWT, or Firebase Admin token verification).
- Introduce **automated tests**:
  - Use Playwright or Cypress to run end‑to‑end RBAC scenarios with different roles.
  - Add API‑level tests (e.g., using Vitest or Jest + `fetch`/`supertest`) that call `/api/*` with various `x-firebase-uid` and assert on `200` vs `403`.
- Centralize RBAC rules in a single config (e.g. `rbac-policies.ts`) and reference them from all routes to avoid drift.


