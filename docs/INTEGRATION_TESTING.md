# Integration Testing Guide - Phase 4 Features

## Overview

This document provides test cases and guidelines for testing Phase 4 security features including approval workflows, audit logging, security alerts, and session management.

---

## Approval Workflow Testing

### Test Case 1: Create Approval Request and Execute

**Objective:** Verify that approval requests are created, can be approved, and automatically execute the approved action.

**Steps:**
1. Create an approval workflow for quote discount overrides >20%
2. Create or update a quote with a discount >20%
3. Verify approval request is created with status `pending`
4. Approve the request via `/api/approval-requests/[id]/approve`
5. Verify the quote is automatically updated with the discount
6. Verify approval request status is `approved`

**Expected Results:**
- Approval request created
- Quote update blocked until approval
- After approval, quote automatically updated
- Approval request marked as approved

---

### Test Case 2: Reject Approval Request

**Objective:** Verify that rejected approval requests prevent action execution.

**Steps:**
1. Create an approval request (via workflow trigger)
2. Reject the request via `/api/approval-requests/[id]/reject` with reason
3. Verify approval request status is `rejected`
4. Verify the original action was NOT executed

**Expected Results:**
- Approval request rejected
- Original operation not executed
- Rejection reason stored

---

### Test Case 3: Approval Workflow Thresholds

**Objective:** Verify approval workflows trigger based on configured thresholds.

**Steps:**
1. Create approval workflow with threshold (e.g., discount >20%)
2. Attempt quote update with discount 15% (below threshold)
3. Verify no approval required
4. Attempt quote update with discount 25% (above threshold)
5. Verify approval required

**Expected Results:**
- Threshold-based approval triggering works correctly
- Operations below threshold proceed without approval
- Operations above threshold require approval

---

### Test Case 4: Multiple Approvers

**Objective:** Verify that users in approver roles can approve requests.

**Steps:**
1. Create approval workflow with approverRoles: ["admin", "finance"]
2. Create approval request
3. Login as finance user
4. Verify finance user can see and approve the request
5. Login as sales user
6. Verify sales user cannot see or approve the request

**Expected Results:**
- Only configured approvers can approve
- Approver role check works correctly

---

## Audit Logging Testing

### Test Case 5: Audit Log Creation for Pricing Changes

**Objective:** Verify audit logs are created for pricing changes.

**Steps:**
1. Update a quote with price changes
2. Query `/api/security/audit-logs?action=pricing_updated&resource=quote`
3. Verify audit log entry exists with correct details
4. Verify log includes user, timestamp, IP address, and change details

**Expected Results:**
- Audit log entry created
- All required fields populated
- Details include pricing change information

---

### Test Case 6: Audit Log Filtering

**Objective:** Verify audit log filtering works correctly.

**Steps:**
1. Perform various actions (pricing updates, user changes, etc.)
2. Filter by user ID
3. Filter by resource type
4. Filter by date range
5. Filter by action type
6. Verify filtered results are correct

**Expected Results:**
- Filters work correctly
- Results match filter criteria
- No unauthorized data exposed

---

### Test Case 7: Audit Log Immutability

**Objective:** Verify audit logs cannot be modified or deleted.

**Steps:**
1. Create audit log entry
2. Attempt to update audit log (should fail)
3. Attempt to delete audit log (should fail)
4. Verify audit log remains unchanged

**Expected Results:**
- Audit logs are immutable
- Updates/deletes are prevented at database level

---

## Security Alerts Testing

### Test Case 8: Bulk Operation Alert

**Objective:** Verify security alerts are created for large bulk operations.

**Steps:**
1. Configure alert threshold (default: 50 items)
2. Perform bulk operation on >50 items
3. Query `/api/security/alerts?type=bulk_operation`
4. Verify alert created with correct severity
5. Verify alert includes operation details

**Expected Results:**
- Alert created when threshold exceeded
- Alert severity based on operation size
- Alert metadata includes operation details

---

### Test Case 9: Failed Login Alert

**Objective:** Verify security alerts for failed login attempts.

**Steps:**
1. Attempt login with invalid credentials (3 times)
2. Verify medium severity alert created
3. Attempt login with invalid credentials (5 times total)
4. Verify high severity alert created
5. Verify alert includes attempt count and IP address

**Expected Results:**
- Alerts created at configured thresholds
- Severity increases with attempt count
- Alert includes relevant metadata

---

### Test Case 10: New Login Location Alert

**Objective:** Verify alerts for logins from new locations.

**Steps:**
1. User logs in from Location A
2. User logs in from Location B (different city/country)
3. Verify alert created for new login location
4. Verify alert includes location details

**Expected Results:**
- Alert created for new locations
- Alert includes IP, city, country information
- Previous locations tracked correctly

---

### Test Case 11: Alert Acknowledgment

**Objective:** Verify alerts can be acknowledged.

**Steps:**
1. Create security alert
2. Acknowledge alert via `/api/security/alerts/[id]/acknowledge`
3. Verify alert marked as acknowledged
4. Verify acknowledgedBy and acknowledgedAt fields set
5. Filter by acknowledged status

**Expected Results:**
- Alert acknowledgment works
- Acknowledgment tracked correctly
- Filtering by acknowledged status works

---

## Session Management Testing

### Test Case 12: Session Creation and Tracking

**Objective:** Verify sessions are created and tracked correctly.

**Steps:**
1. Login from device A
2. Login from device B
3. Query `/api/sessions`
4. Verify both sessions listed
5. Verify session details include device, browser, OS, location
6. Verify current session marked as `isCurrent`

**Expected Results:**
- Sessions created correctly
- Device/browser/OS detected correctly
- Location tracked (if available)
- Current session identified

---

### Test Case 13: Session Termination

**Objective:** Verify sessions can be terminated.

**Steps:**
1. Create multiple sessions
2. Terminate a session via `/api/sessions/[id]`
3. Verify session deleted
4. Verify terminated session cannot be used for authentication
5. Verify other sessions remain active

**Expected Results:**
- Sessions can be terminated
- Terminated sessions cannot authenticate
- Other sessions unaffected

---

### Test Case 14: Session Cleanup

**Objective:** Verify old sessions are cleaned up automatically.

**Steps:**
1. Create multiple sessions (>3)
2. Login again (triggers cleanup)
3. Verify only 3 most recent sessions remain
4. Verify oldest sessions deleted

**Expected Results:**
- Old sessions cleaned up automatically
- Maximum session limit enforced
- Most recent sessions preserved

---

## Configurable Thresholds Testing

### Test Case 15: Threshold Configuration

**Objective:** Verify alert thresholds are configurable via environment variables.

**Steps:**
1. Set `ALERT_BULK_OPERATION_THRESHOLD=30` in environment
2. Perform bulk operation on 35 items
3. Verify alert created (exceeds threshold of 30)
4. Verify threshold can be read via `/api/security/thresholds`

**Expected Results:**
- Thresholds configurable via environment variables
- Defaults used when not configured
- Threshold API returns current values

---

## Email Notifications Testing

### Test Case 16: Email Notification for Critical Alerts

**Objective:** Verify email notifications are sent for high/critical alerts (when configured).

**Steps:**
1. Configure email service (SendGrid/SES/SMTP)
2. Create high severity security alert
3. Verify email sent to admin users
4. Verify email includes alert details and link to dashboard

**Expected Results:**
- Email sent for high/critical alerts (when service configured)
- Email includes relevant alert information
- Email links to security dashboard

---

## Permission Testing

### Test Case 17: Audit Log Access Permissions

**Objective:** Verify only admins can access audit logs.

**Steps:**
1. Login as admin user
2. Access `/api/security/audit-logs`
3. Verify access granted
4. Login as sales user
5. Access `/api/security/audit-logs`
6. Verify access denied (403 Forbidden)

**Expected Results:**
- Admin can access audit logs
- Non-admin users denied access
- Permission check works correctly

---

### Test Case 18: Approval Permissions

**Objective:** Verify only authorized users can approve requests.

**Steps:**
1. Create approval workflow with specific approver roles
2. Create approval request
3. Login as user in approver role
4. Verify user can approve
5. Login as user not in approver role
6. Verify user cannot approve

**Expected Results:**
- Only authorized approvers can approve
- Role-based approval permissions work
- Unauthorized users receive 403 Forbidden

---

## End-to-End Workflow Testing

### Test Case 19: Complete Pricing Approval Flow

**Objective:** Test complete flow from pricing change to approval to execution.

**Steps:**
1. Configure approval workflow for pricing changes >10%
2. Update product price with >10% change
3. Verify approval request created
4. Verify product update blocked
5. Approve request
6. Verify product automatically updated
7. Verify audit log created for pricing change
8. Verify security alert created (if threshold exceeded)

**Expected Results:**
- Complete workflow functions correctly
- All components integrated properly
- Data consistency maintained

---

### Test Case 20: Complete User Management Audit Flow

**Objective:** Test audit logging for user management actions.

**Steps:**
1. Create new user
2. Update user role
3. Delete user
4. Query audit logs filtered by user management actions
5. Verify all actions logged correctly
6. Verify logs include user details and changes

**Expected Results:**
- All user management actions logged
- Audit logs contain complete change history
- Logs are immutable

---

## Test Data Setup

Before running tests, ensure test data is available:

```bash
npm run db:seed
```

This creates:
- Test users (admin, sales, finance)
- Test customers
- Test products
- Test leads

---

## Running Tests

### Manual Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Use API testing tool (Postman, curl, etc.) or the frontend UI

3. Follow test cases step by step

### Automated Testing (Future)

Automated integration tests can be added using:
- Jest or Vitest for test framework
- Supertest for API testing
- Test database for isolation

---

## Test Checklist

- [ ] Approval workflow creation and management
- [ ] Approval request creation and approval/rejection
- [ ] Automatic execution of approved actions
- [ ] Audit log creation for all critical operations
- [ ] Audit log filtering and querying
- [ ] Security alert creation for various scenarios
- [ ] Security alert acknowledgment
- [ ] Session creation and management
- [ ] Session termination
- [ ] Configurable thresholds
- [ ] Email notifications (when configured)
- [ ] Permission checks for all endpoints
- [ ] End-to-end workflow testing

