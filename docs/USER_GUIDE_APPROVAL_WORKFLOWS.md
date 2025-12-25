# User Guide: Approval Workflows

## Overview

The Approval Workflow system allows organizations to require approval for sensitive operations before they are executed. This ensures proper oversight and control over critical business actions.

---

## Key Concepts

### Approval Workflow
A rule that defines when approval is required for a specific resource and action. Workflows can specify:
- Which resource types require approval (e.g., quotes, products, invoices)
- Which actions require approval (e.g., discount_override, price_decrease, delete)
- Who can approve (roles or specific users)
- Threshold conditions (e.g., discounts >20%)

### Approval Request
A request created when an operation requires approval. Contains:
- The resource being modified
- The action being performed
- Who requested it
- Request reason/justification
- Operation data (stored for execution after approval)

### Automatic Execution
When an approval request is approved, the system automatically executes the original operation. No manual retry is needed.

---

## For Administrators

### Creating Approval Workflows

1. Navigate to **Security → Approvals** in the sidebar
2. Click **"Create Workflow"** or **"Workflow Rules"**
3. Fill in the workflow details:
   - **Name**: Descriptive name (e.g., "High Discount Approval")
   - **Resource**: Resource type (quote, invoice, product, etc.)
   - **Action**: Action type (discount_override, price_decrease, delete, etc.)
   - **Requires Approval**: Check to enable
   - **Approver Roles**: Select roles that can approve (admin, finance, etc.)
   - **Approver Users**: Optionally specify individual users who can approve
   - **Threshold Field**: Field to check (e.g., "discountPct")
   - **Threshold Value**: Value that triggers approval (e.g., 20 for 20%)
   - **Active**: Check to enable the workflow

4. Click **"Save"**

**Example Workflow:**
- **Name**: "Discount Over 20%"
- **Resource**: quote
- **Action**: discount_override
- **Threshold Field**: discountPct
- **Threshold Value**: 20
- **Approver Roles**: admin, finance
- **Result**: Any quote update with discount >20% requires approval

---

### Managing Approval Requests

1. Navigate to **Security → Approvals**
2. View pending approvals in the **"Pending Approvals"** tab
3. Click on an approval request to view details
4. Review the change details, metadata, and reason
5. Choose one:
   - **Approve**: Click "Approve" button - the operation will execute automatically
   - **Reject**: Click "Reject" button and provide a rejection reason

**Note:** Once approved, the original operation (e.g., quote update) is automatically executed. The user who requested approval will see their change applied.

---

### Viewing Approval History

1. Navigate to **Security → Approvals**
2. View **"My Requests"** tab to see requests you created
3. View **"All Requests"** tab to see all approval requests
4. Filter by status (pending, approved, rejected) or resource type

---

## For Regular Users

### Requesting Approval

When you perform an action that requires approval:

1. You'll see a message: **"Approval Required"**
2. An approval request is automatically created
3. The operation is temporarily blocked
4. You can add a reason/justification for the request

**What happens next:**
- The approver(s) will be notified (via the approvals dashboard)
- You can track your request status in **Security → Approvals → My Requests**
- Once approved, your change will be automatically applied
- If rejected, you'll need to modify your request and try again

---

### Tracking Your Requests

1. Navigate to **Security → Approvals**
2. Click **"My Requests"** tab
3. View status of all your approval requests:
   - **Pending**: Waiting for approval
   - **Approved**: Approved and executed
   - **Rejected**: Rejected by approver (check reason)

---

## Common Scenarios

### Scenario 1: Applying High Discount to Quote

1. Edit a quote
2. Set discount percentage to 25% (above 20% threshold)
3. Click **"Save"**
4. See message: **"Approval Required - This pricing/discount change requires approval"**
5. Add reason: "Customer requested special pricing for bulk order"
6. Approval request created
7. Finance/Admin reviews and approves
8. Quote automatically updated with 25% discount

---

### Scenario 2: Changing Product Base Price

1. Edit a product
2. Change unit price with >10% decrease
3. Click **"Save"**
4. See message: **"Approval Required"**
5. Approval request created
6. Admin reviews and approves
7. Product price automatically updated

---

### Scenario 3: Deleting a Product

1. Attempt to delete a product
2. See message: **"Approval Required - Product deletion requires approval"**
3. Approval request created
4. Admin reviews and approves
5. Product automatically deleted

---

## Notification Badge

The **"Approvals"** menu item in the sidebar shows a red badge with the count of pending approvals you can approve. The count updates automatically every 30 seconds.

---

## Tips

1. **Always provide a reason** when approval is required - it helps approvers make informed decisions
2. **Check "My Requests"** regularly to track approval status
3. **Contact approvers directly** if urgent approval is needed
4. **Don't retry the operation** after approval - it will execute automatically
5. **Review rejection reasons** if your request is rejected to understand what needs to be changed

---

## FAQ

**Q: How long does approval take?**  
A: It depends on your organization's process. Approvers are notified via the approvals dashboard. The badge count helps them see pending approvals.

**Q: Can I cancel my approval request?**  
A: Currently, approval requests cannot be cancelled once created. Contact an approver if you need to withdraw a request.

**Q: What if I need urgent approval?**  
A: Contact the approver directly (admin or finance) to expedite the approval process.

**Q: What happens if my request is rejected?**  
A: The operation is not executed. Review the rejection reason, modify your request if needed, and submit a new approval request.

**Q: Can I see who approved/rejected my request?**  
A: Yes, in the approval request details, you'll see the approver's name and timestamp.

---

## Security Notes

- Only configured approvers can approve requests
- Approval actions are logged in the audit log
- Approval requests cannot be modified once created
- Rejected requests prevent the operation from executing

