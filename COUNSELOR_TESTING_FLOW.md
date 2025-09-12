# COUNSELOR Feature Testing Flow

## Prerequisites Setup

### 1. Environment Variables
Add these to your `.env.local`:

```bash
# Approved TRF Access Control
APPROVED_TRF_ACCESS_EMAILS=test-user1@foregenomics.com,test-user2@foregenomics.com

# Google Cloud Storage - Approved TRFs
GOOGLE_CLOUD_APPROVED_TRF_BUCKET=fore-genomics-approved-trfs-test

# Optional: Cron Secret for testing notifications
CRON_SECRET=test-cron-secret-123
```

### 2. Google Cloud Storage Setup
- Create a new bucket: `fore-genomics-approved-trfs-test`
- Set appropriate permissions (same as your existing TRF bucket)
- Ensure your service account has access to both buckets

## Testing Flow

### Phase 1: Basic Setup & Access Control

#### 1.1 Test Counselor Role Creation
```bash
# Start your development server
npm run dev
```

**Steps:**
1. Go to `/admin/users`
2. Click "Invite Counselor"
3. Enter email: `counselor@test.com`
4. Send invitation
5. Check email for invitation
6. Complete sign-up process
7. Verify redirect to `/counselor` dashboard

**Expected Results:**
- ✅ Counselor invitation sent successfully
- ✅ User can sign up and access counselor dashboard
- ✅ Non-counselor users redirected away from `/counselor` routes

#### 1.2 Test Approved TRF Access Control
**Steps:**
1. Create a test user with email in `APPROVED_TRF_ACCESS_EMAILS`
2. Try to access `/api/trfs/[kitId]/approved` with this user
3. Try with a user NOT in the whitelist

**Expected Results:**
- ✅ Whitelisted users can access approved TRF endpoint
- ✅ Non-whitelisted users get 403 Forbidden

### Phase 2: TRF Management Workflow

#### 2.1 Create Test Data
**Steps:**
1. Go to `/admin/orders`
2. Create a new order with a kit
3. Complete the onboarding process for this order
4. Verify TRF is created (check `trfFileName` in database)

**Expected Results:**
- ✅ Order created successfully
- ✅ Onboarding completed
- ✅ TRF file generated and stored
- ✅ Kit has `trfApproved = false` by default

#### 2.2 Test Counselor Dashboard
**Steps:**
1. Login as counselor
2. Go to `/counselor`
3. Verify unapproved TRFs are listed
4. Check statistics cards show correct counts

**Expected Results:**
- ✅ Dashboard loads with unapproved TRFs
- ✅ Statistics show correct counts
- ✅ TRF table displays order/kit information

#### 2.3 Test TRF Download (Counselor Review)
**Steps:**
1. In counselor dashboard, click "Download" on a TRF
2. Verify file downloads successfully
3. Check audit log for download activity

**Expected Results:**
- ✅ TRF file downloads successfully
- ✅ Audit log entry created with counselor action
- ✅ File is the original (unapproved) TRF

#### 2.4 Test TRF Approval Process
**Steps:**
1. In counselor dashboard, click "Approve" on a TRF
2. Upload a modified Excel file (you can modify the original)
3. Submit the approval
4. Verify success message

**Expected Results:**
- ✅ Upload dialog opens correctly
- ✅ File validation works (rejects non-Excel files)
- ✅ Approval process completes successfully
- ✅ Kit marked as `trfApproved = true`
- ✅ Approved TRF stored in separate bucket
- ✅ Audit log entry created

#### 2.5 Test Approved TRF Download
**Steps:**
1. Login as whitelisted user (from `APPROVED_TRF_ACCESS_EMAILS`)
2. Try to download approved TRF via `/api/trfs/[kitId]/approved`
3. Verify file downloads successfully
4. Check audit log for download activity

**Expected Results:**
- ✅ Approved TRF downloads successfully
- ✅ File is from approved bucket (different from original)
- ✅ Audit log entry created with download activity
- ✅ Non-whitelisted users cannot access

### Phase 3: Daily Notifications Testing

#### 3.1 Test Notification Endpoint
**Steps:**
1. Ensure you have counselor users in database
2. Ensure you have unapproved TRFs
3. Call the notification endpoint:

```bash
curl -X POST http://localhost:3000/api/public/cron/daily-counselor-notifications \
  -H "Authorization: Bearer test-cron-secret-123" \
  -H "Content-Type: application/json"
```

**Expected Results:**
- ✅ Endpoint returns success response
- ✅ Counselors receive email notifications
- ✅ Audit log entry created for notification activity
- ✅ Email contains correct unapproved TRF count

#### 3.2 Test Email Content
**Steps:**
1. Check received email
2. Verify email content and styling
3. Test email links (should go to counselor dashboard)

**Expected Results:**
- ✅ Email has professional styling
- ✅ Contains correct statistics
- ✅ Links work correctly
- ✅ Call-to-action button functional

### Phase 4: Admin Interface Testing

#### 4.1 Test Counselor Management
**Steps:**
1. Go to `/admin/users`
2. Verify counselor invitation button is present
3. Test counselor invitation process
4. Check user role management

**Expected Results:**
- ✅ Counselor invitation modal works
- ✅ Invitations sent successfully
- ✅ User roles displayed correctly

#### 4.2 Test Role Validation
**Steps:**
1. Try accessing counselor routes as admin
2. Try accessing admin routes as counselor
3. Test middleware protection

**Expected Results:**
- ✅ Admins cannot access counselor routes
- ✅ Counselors cannot access admin routes
- ✅ Proper redirects occur

### Phase 5: Error Handling & Edge Cases

#### 5.1 Test Error Scenarios
**Steps:**
1. Try uploading non-Excel files for TRF approval
2. Try accessing approved TRF endpoint without authentication
3. Try accessing approved TRF for kit without approved TRF
4. Test with empty counselor email list

**Expected Results:**
- ✅ Proper error messages displayed
- ✅ File validation works correctly
- ✅ Graceful handling of missing data
- ✅ Appropriate HTTP status codes

#### 5.2 Test Database Consistency
**Steps:**
1. Check database after TRF approval
2. Verify all fields are updated correctly
3. Test with multiple kits per order

**Expected Results:**
- ✅ Database fields updated correctly
- ✅ Relationships maintained
- ✅ Multi-kit orders handled properly

## Validation Checklist

### ✅ Core Functionality
- [ ] Counselor role creation and access
- [ ] TRF listing and download
- [ ] TRF approval workflow
- [ ] Approved TRF access control
- [ ] Daily notifications
- [ ] Admin interface updates

### ✅ Security
- [ ] Role-based access control
- [ ] Email-based whitelist
- [ ] File upload validation
- [ ] Audit logging

### ✅ Data Integrity
- [ ] Database migrations applied
- [ ] TRF approval tracking
- [ ] File storage separation
- [ ] Audit trail completeness

### ✅ User Experience
- [ ] Intuitive counselor interface
- [ ] Clear error messages
- [ ] Professional email notifications
- [ ] Responsive design

## Test Data Cleanup

After testing, you may want to clean up:

```sql
-- Remove test counselor users
DELETE FROM "User" WHERE email LIKE '%test%';

-- Reset TRF approval status for testing
UPDATE "Kit" SET 
  "trfApproved" = false,
  "trfApprovedAt" = NULL,
  "trfApprovedBy" = NULL,
  "trfApprovedFileName" = NULL;

-- Clean up audit logs (optional)
DELETE FROM "AuditLog" WHERE "userEmail" LIKE '%test%';
```

## Deployment Checklist

Before deploying to staging:

- [ ] All tests pass locally
- [ ] Environment variables configured
- [ ] Google Cloud buckets created
- [ ] Cron job configured
- [ ] Database migrations ready
- [ ] Documentation updated

This testing flow will ensure the COUNSELOR feature works correctly before deployment!
