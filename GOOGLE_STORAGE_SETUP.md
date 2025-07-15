# Google Cloud Storage Setup

This guide explains how to set up Google Cloud Storage for storing onboarding records as CSV files.

## Prerequisites

1. **Google Cloud Project** with Cloud Storage API enabled
2. **Service Account** with Storage permissions
3. **Storage Bucket** created

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Google Cloud Storage Configuration
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json
```

## Setup Steps

### 1. Enable Cloud Storage API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Library"
4. Search for "Cloud Storage"
5. Enable "Cloud Storage API"

### 2. Create a Storage Bucket

1. Go to "Cloud Storage" → "Buckets"
2. Click "Create Bucket"
3. Choose a unique name (e.g., `fore-genomics-onboarding-2024`)
4. Select location (choose closest to your users)
5. Choose "Standard" storage class
6. Set access control to "Uniform"
7. Click "Create"

### 3. Configure Service Account Permissions

1. Go to "IAM & Admin" → "Service Accounts"
2. Find your existing service account or create a new one
3. Add these roles:
   - **Storage Object Admin** (to upload files)
   - **Storage Object Viewer** (to read files)

### 4. Install Dependencies

```bash
npm install @google-cloud/storage
```

## File Structure

Files will be stored in the bucket with this structure:
```
your-bucket/
├── onboarding-records/
│   ├── ORD-1234567890-abc123-2024-01-15.csv
│   ├── ORD-1234567891-def456-2024-01-16.csv
│   └── ...
```

## CSV Format

Each onboarding creates a CSV file with headers:
- Order Number
- Submission Date
- Child Name, DOB, Sex, Ethnicity
- Parent Name, Email, Phone, Address, etc.
- Consent information
- Questionnaire responses
- IP Address, User Agent

## Access Control

- **Public Read**: Files are publicly readable via direct URL
- **Admin Access**: You can manage files through Google Cloud Console
- **Secure**: Only your service account can upload files

## Benefits of Cloud Storage

✅ **No Storage Quotas**: Much higher limits than service account Drive  
✅ **Cost Effective**: Very cheap for small files  
✅ **Reliable**: 99.9% availability  
✅ **Scalable**: Handles unlimited files  
✅ **CSV Format**: Easy to import into databases/spreadsheets  
✅ **Direct URLs**: No authentication needed to download  

## Testing

1. Complete an onboarding flow
2. Check your bucket for the new CSV file
3. Download and verify the CSV content
4. Check that emails contain the correct download link

## Management

### List All Records
```javascript
const files = await googleStorageService.listOnboardingRecords();
console.log(files);
```

### Delete a Record
```javascript
await googleStorageService.deleteOnboardingRecord('filename.csv');
```

## Security Notes

- Files are publicly readable (consider if this meets your privacy requirements)
- Service account has full access to the bucket
- Consider implementing signed URLs for more security
- Monitor bucket access logs for unusual activity

## Cost Estimation

- **Storage**: ~$0.02 per GB per month
- **Operations**: ~$0.004 per 10,000 operations
- **Network**: ~$0.12 per GB (outbound)

For 1000 onboarding records (~1MB each): ~$2-5/month total 