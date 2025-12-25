# API Documentation - Phase 4 Security Features

## Overview

This document describes the API endpoints added in Phase 4 for security, governance, and enterprise controls including approval workflows, audit logs, security alerts, and session management.

---

## Approval Workflows

### Create Approval Workflow

**POST** `/api/approval-workflows`

Create a new approval workflow rule.

**Request Body:**
```json
{
  "name": "High Discount Approval",
  "resource": "quote",
  "action": "discount_override",
  "requiresApproval": true,
  "approverRoles": ["admin", "finance"],
  "approverUserIds": [],
  "thresholdField": "discountPct",
  "thresholdValue": 20,
  "isActive": true
}
```

**Response:** `201 Created`
```json
{
  "id": "workflow-id",
  "name": "High Discount Approval",
  "resource": "quote",
  "action": "discount_override",
  "requiresApproval": true,
  "approverRoles": ["admin", "finance"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Permissions:** Admin only

---

### List Approval Workflows

**GET** `/api/approval-workflows`

Get all approval workflows.

**Query Parameters:**
- `isActive` (optional): Filter by active status (`true`/`false`)

**Response:** `200 OK`
```json
[
  {
    "id": "workflow-id",
    "name": "High Discount Approval",
    "resource": "quote",
    "action": "discount_override",
    "requiresApproval": true,
    "approverRoles": ["admin", "finance"],
    "isActive": true
  }
]
```

**Permissions:** Admin only

---

### Update Approval Workflow

**PATCH** `/api/approval-workflows/[id]`

Update an existing approval workflow.

**Request Body:**
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "id": "workflow-id",
  "name": "Updated Name",
  "isActive": false,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Permissions:** Admin only

---

### Delete Approval Workflow

**DELETE** `/api/approval-workflows/[id]`

Delete an approval workflow.

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Permissions:** Admin only

---

## Approval Requests

### List Approval Requests

**GET** `/api/approval-requests`

Get approval requests with filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`|`approved`|`rejected`)
- `resource` (optional): Filter by resource type
- `myRequests` (optional): `true` to get only requests created by current user
- `myApprovals` (optional): `true` to get only requests pending approval by current user

**Response:** `200 OK`
```json
[
  {
    "id": "request-id",
    "resource": "quote",
    "resourceId": "quote-id",
    "action": "discount_override",
    "status": "pending",
    "requestedBy": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "requestedAt": "2024-01-01T00:00:00Z",
    "reason": "Customer requested special pricing",
    "metadata": "{\"discountPct\": 25}"
  }
]
```

**Permissions:** Authenticated users (filtered based on role)

---

### Get Pending Approvals Count

**GET** `/api/approval-requests/count`

Get count of pending approvals for current user.

**Response:** `200 OK`
```json
{
  "count": 5
}
```

**Permissions:** Authenticated users

---

### Approve Request

**POST** `/api/approval-requests/[id]/approve`

Approve an approval request. Automatically executes the approved action.

**Response:** `200 OK`
```json
{
  "success": true,
  "status": "approved",
  "executed": true,
  "executionResult": {
    "message": "Quote updated successfully"
  }
}
```

**Permissions:** Users with approval permissions (admin or configured approvers)

---

### Reject Request

**POST** `/api/approval-requests/[id]/reject`

Reject an approval request.

**Request Body:**
```json
{
  "rejectionReason": "Discount too high without manager approval"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "status": "rejected"
}
```

**Permissions:** Users with approval permissions (admin or configured approvers)

---

## Audit Logs

### Get Audit Logs

**GET** `/api/security/audit-logs`

Get system-wide audit logs with filtering.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `resource` (optional): Filter by resource type
- `resourceId` (optional): Filter by resource ID
- `action` (optional): Filter by action
- `startDate` (optional): Start date (ISO string)
- `endDate` (optional): End date (ISO string)
- `limit` (optional): Number of logs to return (default: 100, max: 1000)

**Response:** `200 OK`
```json
[
  {
    "id": "log-id",
    "userId": "user-id",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "action": "pricing_updated",
    "resource": "quote",
    "resourceId": "quote-id",
    "details": "{\"quoteNumber\": \"Q-001\", \"itemCount\": 3}",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-01T00:00:00Z"
  }
]
```

**Permissions:** Admin only

---

## Security Alerts

### Get Security Alerts

**GET** `/api/security/alerts`

Get security alerts with filtering.

**Query Parameters:**
- `severity` (optional): Filter by severity (`low`|`medium`|`high`|`critical`)
- `type` (optional): Filter by alert type
- `acknowledged` (optional): Filter by acknowledged status (`true`|`false`)
- `limit` (optional): Number of alerts to return (default: 100)

**Response:** `200 OK`
```json
[
  {
    "id": "alert-id",
    "type": "bulk_operation",
    "severity": "medium",
    "title": "Large bulk update operation on leads detected",
    "description": "User performed a bulk update operation affecting 75 lead items",
    "userId": "user-id",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "resource": "lead",
    "acknowledged": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Permissions:** Admin only

---

### Acknowledge Security Alert

**POST** `/api/security/alerts/[id]/acknowledge`

Acknowledge a security alert.

**Response:** `200 OK`
```json
{
  "success": true,
  "acknowledged": true,
  "acknowledgedAt": "2024-01-01T00:00:00Z"
}
```

**Permissions:** Admin only

---

## Session Management

### Get User Sessions

**GET** `/api/sessions`

Get all active sessions for the current user.

**Response:** `200 OK`
```json
[
  {
    "id": "session-id",
    "device": "Desktop",
    "browser": "Chrome",
    "os": "Windows",
    "city": "Ahmedabad",
    "country": "India",
    "ipAddress": "192.168.1.1",
    "lastActivityAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "isCurrent": true
  }
]
```

**Permissions:** Authenticated users (own sessions only)

---

### Terminate Session

**DELETE** `/api/sessions/[id]`

Terminate a specific session.

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Permissions:** Authenticated users (own sessions only, admin can terminate any)

---

## Alert Thresholds Configuration

### Get Alert Thresholds

**GET** `/api/security/thresholds`

Get current alert threshold configuration.

**Response:** `200 OK`
```json
{
  "bulkOperationCount": 50,
  "bulkOperationHighSeverity": 100,
  "failedLoginMedium": 3,
  "failedLoginHigh": 5,
  "pricingOverrideMedium": 20,
  "pricingOverrideHigh": 50
}
```

**Permissions:** Admin only

**Note:** Thresholds are configured via environment variables:
- `ALERT_BULK_OPERATION_THRESHOLD` (default: 50)
- `ALERT_BULK_OPERATION_HIGH_THRESHOLD` (default: 100)
- `ALERT_FAILED_LOGIN_MEDIUM` (default: 3)
- `ALERT_FAILED_LOGIN_HIGH` (default: 5)
- `ALERT_PRICING_OVERRIDE_MEDIUM` (default: 20)
- `ALERT_PRICING_OVERRIDE_HIGH` (default: 50)

---

## Common Response Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Authentication

All API endpoints require authentication via session cookie (`app_session`). The session is validated against the database and must be active (not expired).

---

## Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

