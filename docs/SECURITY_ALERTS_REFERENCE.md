# Security Alerts Reference Guide

## Overview

Security alerts are automatically generated to notify administrators of suspicious activities, security events, and system anomalies. This document describes all alert types, their triggers, and severity levels.

---

## Alert Types

### 1. New Login Location (`new_login_location`)

**Severity:** Medium

**Trigger:** User logs in from a location (city/country) they haven't logged in from before.

**Details Included:**
- User ID and email
- IP address
- City and country
- Device and browser information
- Previous login locations

**Example:**
```
Title: "New Login Location Detected"
Description: "User logged in from Ahmedabad, India. Previous locations include: Mumbai, India."
```

---

### 2. Failed Login (`failed_login`)

**Severity:** Low → Medium → High (escalates with attempt count)

**Trigger:** Failed login attempts detected.

**Severity Levels:**
- **Low**: 1-2 failed attempts
- **Medium**: 3-4 failed attempts
- **High**: 5+ failed attempts

**Details Included:**
- Email address (if user exists)
- IP address
- Attempt count
- Timestamp

**Thresholds (configurable):**
- Medium: 3 attempts (default)
- High: 5 attempts (default)

---

### 3. Bulk Operation (`bulk_operation`)

**Severity:** Medium → High (based on operation size)

**Trigger:** Bulk operation affecting more items than threshold.

**Severity Levels:**
- **Medium**: Items > threshold but < high threshold (default: 50-100 items)
- **High**: Items > high threshold (default: >100 items)

**Details Included:**
- User ID
- Resource type (e.g., "lead", "customer")
- Action performed (e.g., "update", "delete")
- Item count
- IP address

**Thresholds (configurable):**
- Default threshold: 50 items
- High severity threshold: 100 items

**Example:**
```
Title: "Large bulk update operation on leads detected"
Description: "User performed a bulk update operation affecting 75 lead items, exceeding threshold of 50."
```

---

### 4. Pricing Override (`pricing_override`)

**Severity:** Low → Medium → High (based on change percentage)

**Trigger:** Significant price or discount changes detected.

**Severity Levels:**
- **Low**: Change < medium threshold
- **Medium**: Change >= medium threshold but < high threshold (default: 20-50%)
- **High**: Change >= high threshold (default: >50%)

**Details Included:**
- User ID
- Resource type and ID
- Original price
- New price
- Change percentage

**Thresholds (configurable):**
- Medium: 20% (default)
- High: 50% (default)

**Note:** Pricing overrides typically require approval workflows in addition to alerts.

---

### 5. Suspicious Activity (`suspicious_activity`)

**Severity:** High

**Trigger:** Detected patterns of suspicious behavior (e.g., multiple failed logins from same IP).

**Details Included:**
- Activity description
- User ID (if applicable)
- IP address
- Activity pattern details

**Example:**
```
Title: "Multiple failed login attempts from IP 192.168.1.1"
Description: "5 failed login attempts from IP 192.168.1.1 in the last 15 minutes. Possible brute force attack."
```

---

### 6. Document Deletion (`document_deletion`)

**Severity:** Medium

**Trigger:** Document deleted from the system.

**Details Included:**
- User ID
- Document name
- Document ID
- IP address

**Note:** Document deletion typically requires approval workflows.

---

### 7. Approval Bypassed (`approval_bypassed`)

**Severity:** Critical

**Trigger:** Attempt to bypass approval workflow (system anomaly).

**Details Included:**
- User ID
- Resource type and ID
- Action attempted
- System details

---

### 8. Unusual Access Pattern (`unusual_access_pattern`)

**Severity:** Medium → High

**Trigger:** Detected unusual patterns in user access (e.g., accessing many resources in short time).

**Details Included:**
- User ID
- Access pattern description
- Resource types accessed
- Timeframe

---

## Alert Severities

### Low
- Informational alerts
- Minor security events
- Typically no immediate action required

### Medium
- Requires attention
- Should be reviewed within reasonable time
- May indicate potential security concerns

### High
- Requires immediate attention
- May indicate security threat
- Should be reviewed promptly

### Critical
- Requires immediate action
- Indicates serious security issue
- Should be addressed immediately

---

## Configurable Thresholds

All thresholds can be configured via environment variables:

### Bulk Operation Thresholds
- `ALERT_BULK_OPERATION_THRESHOLD` (default: 50)
- `ALERT_BULK_OPERATION_HIGH_THRESHOLD` (default: 100)

### Failed Login Thresholds
- `ALERT_FAILED_LOGIN_MEDIUM` (default: 3)
- `ALERT_FAILED_LOGIN_HIGH` (default: 5)

### Pricing Override Thresholds
- `ALERT_PRICING_OVERRIDE_MEDIUM` (default: 20)
- `ALERT_PRICING_OVERRIDE_HIGH` (default: 50)

To view current thresholds: `GET /api/security/thresholds` (admin only)

---

## Email Notifications

High and critical severity alerts automatically trigger email notifications to admin users (when email service is configured).

### Email Configuration

Set up email service via environment variables:

**SendGrid:**
```
SENDGRID_API_KEY=your_api_key
EMAIL_FROM_ADDRESS=noreply@yourcompany.com
```

**SMTP:**
```
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_user
EMAIL_SMTP_PASSWORD=your_password
EMAIL_FROM_ADDRESS=noreply@yourcompany.com
```

**AWS SES:**
```
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
EMAIL_FROM_ADDRESS=noreply@yourcompany.com
```

---

## Viewing and Managing Alerts

### View Alerts

1. Navigate to **Security → Security Alerts**
2. View all alerts or filter by:
   - Severity (low, medium, high, critical)
   - Type (alert type)
   - Acknowledged status

### Acknowledge Alerts

1. Click on an alert to view details
2. Click **"Acknowledge"** button
3. Alert is marked as acknowledged
4. Acknowledged alerts can be filtered out

### Alert Details

Each alert includes:
- Type and severity
- Title and description
- User (if applicable)
- Resource and resource ID
- Timestamp
- Metadata (JSON with additional details)
- Acknowledgment status

---

## Best Practices

1. **Review alerts regularly** - Check the security alerts dashboard daily
2. **Acknowledge alerts** - Mark alerts as acknowledged after review
3. **Investigate high/critical alerts immediately** - Don't delay investigation
4. **Configure email notifications** - Ensure admins receive critical alerts
5. **Adjust thresholds** - Tune thresholds based on your organization's needs
6. **Monitor patterns** - Look for patterns in alerts that may indicate issues

---

## Integration with Approval Workflows

Many alerts are related to operations that require approval:
- **Pricing Override** alerts often accompany approval requests
- **Bulk Operation** alerts may indicate operations that should require approval
- **Document Deletion** alerts accompany deletion approval requests

Review both the approvals dashboard and security alerts dashboard for complete context.

---

## Alert Retention

Alerts are stored indefinitely in the database. For performance, consider:
- Acknowledging old alerts to reduce clutter
- Filtering by date range when querying
- Exporting alerts for external analysis if needed

---

## Troubleshooting

**Q: I'm not receiving email notifications**  
A: Check email service configuration in environment variables. In development, emails are logged to console instead of being sent.

**Q: Too many alerts being generated**  
A: Adjust thresholds via environment variables to reduce noise while maintaining security.

**Q: Alerts not showing in dashboard**  
A: Check you have admin role permissions. Only admins can view security alerts.

**Q: Can I delete alerts?**  
A: Alerts cannot be deleted to maintain security audit trail. Acknowledge alerts to mark them as reviewed.

