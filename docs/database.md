# Shreenathji ERP+CRM Database Schema (DD)

This document provides a comprehensive overview of the Firestore database structure for the Shreenathji ERP+CRM application. It serves as a Data Dictionary (DD) for developers and system architects.

## Table of Contents

1.  [Design Philosophy](#design-philosophy)
2.  [Data Models (Entities)](#data-models-entities)
    *   [Client](#client)
    *   [Product](#product)
    *   [Lead](#lead)
    *   [Deal](#deal)
    *   [Sales Documents (Quote, Proforma, Invoice)](#sales-documents)
    *   [SalesOrder](#salesorder)
    *   [Payment](#payment)
    *   [DispatchRegisterEntry](#dispatchregisterentry)
3.  [Firestore Collection Structure](#firestore-collection-structure)

---

## Design Philosophy

The Firestore database is designed as a NoSQL, document-based system optimized for real-time data synchronization, scalability, and secure access. The core principles are:

-   **Denormalization for Performance:** Data is strategically denormalized to reduce the need for complex joins. For instance, customer names are stored on invoices to avoid fetching the customer document every time an invoice is displayed.
-   **Security-First:** The structure is designed to work with Firestore Security Rules. Access is controlled by structuring data in a way that allows for simple, path-based authorization. Client-side writes are heavily restricted in favor of trusted backend functions for core business logic.
-   **Hierarchical & Scalable:** Data is organized hierarchically. Core entities like `clients` and `products` are in root collections, while related transactional data (like invoices or orders) are often in subcollections.

---

## Data Models (Entities)

This section describes the main data models (entities) used in the system.

### Client

Represents a customer of Shreenathji Rasayan Pvt. Ltd.

| Field                | Type   | Description                                                              | Required |
| -------------------- | ------ | ------------------------------------------------------------------------ | -------- |
| `id`                 | string | Unique identifier for the client.                                        | Yes      |
| `name`               | string | Name of the client company.                                              | Yes      |
| `gstTaxId`           | string | Goods and Services Tax Identification Number (GSTIN) for Indian clients. | No       |
| `iec`                | string | Import Export Code (IEC) for international clients.                      | No       |
| `creditLimit`        | number | The maximum credit amount allowed for the client.                        | No       |
| `outstandingBalance` | number | The current outstanding balance owed by the client.                      | No       |
| `contactName`        | string | Name of the primary contact person.                                      | No       |
| `contactEmail`       | string | Email address of the primary contact.                                    | No       |
| `contactPhone`       | string | Phone number of the primary contact.                                     | No       |
| `address`            | string | The client's primary physical address.                                   | No       |

### Product

Represents a product in the company's inventory.

| Field         | Type   | Description                                                        | Required |
| ------------- | ------ | ------------------------------------------------------------------ | -------- |
| `productName` | string | The name of the product (e.g., "Formaldehyde").                    | Yes      |
| `category`    | string | The category the product belongs to (e.g., "Chemicals").           | Yes      |
| `hsnCode`     | string | The Harmonized System of Nomenclature (HSN) code for the product.  | Yes      |

### Lead

Represents a potential sales lead before they become a customer.

| Field                 | Type   | Description                                                            | Required |
| --------------------- | ------ | ---------------------------------------------------------------------- | -------- |
| `companyName`         | string | The name of the prospective company.                                   | Yes      |
| `contactName`         | string | The name of the contact person.                                        | Yes      |
| `email`               | string | The email of the contact person.                                       | Yes      |
| `phone`               | string | The phone number of the contact person.                                | Yes      |
| `status`              | string | The current stage of the lead. Enum: `New`, `Contacted`, `Qualified`, `Disqualified`, `Converted`. | Yes      |
| `leadSource`          | string | How the lead was generated (e.g., "Website", "Referral").              | Yes      |
| `assignedSalesperson` | string | The name of the salesperson responsible for the lead.                  | Yes      |

### Deal

Represents a qualified sales opportunity in the pipeline.

| Field        | Type   | Description                                                              | Required |
| ------------ | ------ | ------------------------------------------------------------------------ | -------- |
| `title`      | string | A descriptive title for the deal (e.g., "Annual Supply Contract").       | Yes      |
| `company`    | string | The name of the company the deal is with.                                | Yes      |
| `value`      | number | The estimated monetary value of the deal.                                | Yes      |
| `stage`      | string | The current stage in the pipeline. Enum: `Prospecting`, `Technical Discussion`, `Quotation`, `Negotiation`, `Won`, `Lost`. | Yes      |
| `customerId` | string | The ID of the `Client` this deal is associated with.                     | Yes      |

### Sales Documents

The `Quote`, `ProformaInvoice`, and `Invoice` entities share a common structure for sales documents.

| Field             | Type                | Description                                                          |
| ----------------- | ------------------- | -------------------------------------------------------------------- |
| `id`              | string              | Unique identifier for the document.                                  |
| `customerId`      | string              | The ID of the `Client` this document belongs to.                     |
| `customerName`    | string              | Denormalized name of the customer for display purposes.              |
| `date`            | string (ISO)        | The creation date of the document.                                   |
| `currency`        | string              | The currency used (e.g., "INR", "USD").                              |
| `lineItems`       | Array<`LineItem`>   | An array of products, quantities, and prices.                        |
| `amount`          | number              | The total calculated amount of the document.                         |
| `status`          | string              | The status of the document (e.g., "Draft", "Sent", "Paid").          |

**LineItem Sub-document:**

| Field         | Type   | Description                   |
| ------------- | ------ | ----------------------------- |
| `productId`   | string | ID of the `Product`.          |
| `productName` | string | Denormalized product name.    |
| `hsnCode`     | string | Denormalized HSN code.        |
| `qty`         | number | Quantity of the product.      |
| `rate`        | number | Price per unit.               |
| `amount`      | number | Total amount for the line.    |

### SalesOrder

Represents a sales order confirmed by a client, often generated from a Purchase Order. It extends the basic `SalesDocument` structure.

| Field       | Type   | Description                                                              |
| ----------- | ------ | ------------------------------------------------------------------------ |
| `poNumber`  | string | The client's Purchase Order number.                                    |
| `poDate`    | string | The date of the client's Purchase Order.                               |
| `status`    | string | Enum: `Draft`, `Confirmed`, `Partially Executed`, `Completed`, `Cancelled`. |

### Payment

Represents a payment received from a client against an invoice.

| Field           | Type         | Description                                                            | Required |
| --------------- | ------------ | ---------------------------------------------------------------------- | -------- |
| `id`            | string       | Unique identifier for the payment.                                     | Yes      |
| `clientId`      | string       | The ID of the client who made the payment.                             | Yes      |
| `invoiceId`     | string       | The ID of the invoice this payment is for.                             | Yes      |
| `paymentDate`   | string (ISO) | The date the payment was received.                                     | Yes      |
| `amount`        | number       | The amount paid.                                                       | Yes      |
| `paymentMethod` | string       | Method of payment (e.g., "Bank Transfer", "Cheque").                   | Yes      |
| `transactionId` | string       | The transaction reference number.                                      | No       |
| `status`        | string       | The status of the payment. Enum: `Pending`, `Cleared`.                 | Yes      |

### DispatchRegisterEntry

Represents an aggregated, product-wise summary for the dispatch register.

| Field           | Type   | Description                                        | Required |
| --------------- | ------ | -------------------------------------------------- | -------- |
| `productName`   | string | The name of the product.                           | Yes      |
| `orderQty`      | number | Total ordered quantity for this product.           | Yes      |
| `dispatchedQty` | number | Total dispatched quantity for this product.        | Yes      |
| `wipQty`        | number | Total work-in-progress quantity for this product.  | Yes      |

---

## Firestore Collection Structure

This section outlines the organization of collections and subcollections in Firestore.

-   `/clients/{clientId}`
    -   **Description:** The root collection for all customer data. Each document represents a single client.
    -   **Subcollections:**
        -   `/clients/{clientId}/purchaseOrders/{purchaseOrderId}`: Stores purchase orders received from a specific client.
        -   `/clients/{clientId}/invoices/{invoiceId}`: Stores invoices issued to a specific client.
        -   `/clients/{clientId}/payments/{paymentId}`: Stores payments received from a specific client.

-   `/products/{productId}`
    -   **Description:** A root collection containing all product definitions.

-   `/leads/{leadId}`
    -   **Description:** A root collection for all sales leads.

-   `/deals/{dealId}`
    -   **Description:** A root collection for all sales deals/opportunities.

-   `/quotes/{quoteId}`
    -   **Description:** A root collection storing all sales quotations.

-   `/proforma-invoices/{proformaId}`
    -   **Description:** A root collection storing all proforma invoices.

-   `/sales-orders/{salesOrderId}`
    -   **Description:** A root collection storing all confirmed sales orders.

-   `/invoices/{invoiceId}`
    -   **Description:** A root collection storing all final tax invoices. This is a denormalized collection for easier querying across all clients.

-   `/payments/{paymentId}`
    -   **Description:** A root collection for all payment records.

-   `/dispatchRegister/{dispatchId}`
    **Description:** A root collection storing aggregated dispatch data on a per-product basis. This is likely updated by backend triggers for real-time inventory and order fulfillment tracking.
