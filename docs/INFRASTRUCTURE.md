# Infrastructure Management Guide

This guide covers the infrastructure setup and management for the DreamReal AI video editor, with a focus on Google Cloud Storage (GCS) buckets and Infrastructure as Code (IaC) practices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Terraform Setup](#terraform-setup)
- [Managing Environments](#managing-environments)
- [Application Configuration](#application-configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Overview

### Why Infrastructure as Code?

We use Terraform to manage our Google Cloud Storage buckets instead of auto-creating them in application code for several critical reasons:

1. **Security**: Prevent misconfiguration and unauthorized bucket creation in production
2. **Consistency**: Ensure all environments use the same configuration
3. **Version Control**: Track infrastructure changes alongside code changes
4. **Review Process**: Infrastructure changes go through PR review
5. **Auditability**: Clear history of who changed what and when
6. **Cost Control**: Prevent accidental resource creation
7. **Compliance**: Meet security and compliance requirements

### What This Replaces

Previously, the application would automatically create GCS buckets if they didn't exist:

```typescript
// OLD APPROACH (REMOVED)
const [exists] = await bucket.exists();
if (!exists) {
  await storageClient.createBucket(bucketName, {
    location: 'US',
    storageClass: 'STANDARD',
  });
}
```

Now, buckets must be created via Terraform before deploying the application.

## Architecture

### Current Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Project                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           GCS Bucket: video-processing                 │ │
│  │                                                        │ │
│  │  Purpose: Temporary video files for analysis          │ │
│  │  Lifecycle: Auto-delete after 7 days                  │ │
│  │  Access: Service account only                         │ │
│  │  Location: US (multi-region)                          │ │
│  │                                                        │ │
│  │  Folders:                                             │ │
│  │    - video-analysis/    (API processing files)        │ │
│  │    - test-uploads/      (Test files, 1 day TTL)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Supabase Storage (Separate)               │ │
│  │                                                        │ │
│  │  Purpose: User-uploaded assets (permanent)            │ │
│  │  Management: Managed by Supabase                      │ │
│  │  Buckets: assets, thumbnails, exports                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Storage Strategy

1. **Supabase Storage** (Primary)
   - User-uploaded videos, images, audio
   - Project assets and exports
   - Managed via Supabase migrations
   - Permanent storage with user access control

2. **GCS Buckets** (Temporary Processing)
   - Video Intelligence API processing
   - Temporary files during analysis
   - Auto-deletion after 7 days
   - Service account access only

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.5.0)

   ```bash
   # macOS
   brew install terraform

   # Linux
   curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
   sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
   sudo apt-get update && sudo apt-get install terraform

   # Verify installation
   terraform version
   ```

2. **Google Cloud CLI**

   ```bash
   # macOS
   brew install google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # Verify installation
   gcloud --version
   ```

3. **jq** (for JSON processing)

   ```bash
   # macOS
   brew install jq

   # Linux
   sudo apt-get install jq
   ```

### Google Cloud Setup

1. **Authenticate with Google Cloud**

   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Set Your Project**

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable Required APIs**

   ```bash
   gcloud services enable storage.googleapis.com
   gcloud services enable iam.googleapis.com
   gcloud services enable videointelligence.googleapis.com
   ```

4. **Verify Permissions**

   ```bash
   gcloud projects get-iam-policy YOUR_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:user:YOUR_EMAIL"
   ```

   Required roles:
   - `roles/storage.admin` - Create and manage buckets
   - `roles/iam.serviceAccountAdmin` - Manage service accounts

## Quick Start

### For Development

1. **Clone the repository and navigate to terraform directory**

   ```bash
   cd terraform
   ```

2. **Create your configuration**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. **Edit terraform.tfvars**

   ```hcl
   project_id                   = "your-project-id"
   video_processing_bucket_name = "your-project-dev-video-processing"
   environment                  = "dev"
   lifecycle_age_days           = 3
   ```

4. **Initialize Terraform**

   ```bash
   terraform init
   ```

5. **Preview changes**

   ```bash
   terraform plan
   ```

6. **Apply configuration**

   ```bash
   terraform apply
   ```

7. **Get bucket name and update .env.local**

   ```bash
   # Get the bucket name
   BUCKET_NAME=$(terraform output -raw video_processing_bucket_name)
   echo "Bucket created: $BUCKET_NAME"

   # Update .env.local
   echo "GCS_BUCKET_NAME=$BUCKET_NAME" >> ../.env.local
   ```

8. **Verify setup**
   ```bash
   npm run test:gcs
   ```

### For Production

1. **Use a separate state location**

   Edit `terraform/gcs-buckets.tf` and uncomment the backend configuration:

   ```hcl
   terraform {
     backend "gcs" {
       bucket = "your-terraform-state-bucket"
       prefix = "terraform/state"
     }
   }
   ```

2. **Create production configuration**

   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

3. **Edit with production values**

   ```hcl
   project_id                   = "your-production-project-id"
   video_processing_bucket_name = "your-project-prod-video-processing"
   environment                  = "production"
   lifecycle_age_days           = 7
   enable_versioning            = true
   allowed_service_accounts     = ["your-sa@project.iam.gserviceaccount.com"]
   ```

4. **Initialize and apply**

   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

5. **Set environment variables in Vercel/deployment platform**

   ```bash
   # Get bucket name
   terraform output video_processing_bucket_name

   # Add to Vercel
   vercel env add GCS_BUCKET_NAME production
   # Paste the bucket name when prompted
   ```

## Terraform Setup

### Directory Structure

```
terraform/
├── .gitignore                      # Terraform-specific gitignore
├── README.md                       # Terraform-specific documentation
├── gcs-buckets.tf                  # Main bucket configuration
├── terraform.tfvars.example        # Example variables
└── terraform.tfvars                # Your values (gitignored)
```

### Configuration Files

#### gcs-buckets.tf

Main Terraform configuration that defines:

- Bucket resources
- IAM policies
- Lifecycle rules
- CORS configuration
- Labels and metadata

#### terraform.tfvars

Your environment-specific values (never committed to git):

```hcl
project_id                   = "my-project"
video_processing_bucket_name = "my-project-video-processing"
environment                  = "production"
lifecycle_age_days           = 7
enable_versioning            = false
allowed_service_accounts     = [
  "video-processing@my-project.iam.gserviceaccount.com"
]
```

### Variables Reference

| Variable                             | Type         | Default       | Description                               |
| ------------------------------------ | ------------ | ------------- | ----------------------------------------- |
| `project_id`                         | string       | required      | Google Cloud Project ID                   |
| `region`                             | string       | `us-central1` | Default region                            |
| `environment`                        | string       | `production`  | Environment name (dev/staging/production) |
| `video_processing_bucket_name`       | string       | required      | Bucket name (globally unique)             |
| `lifecycle_age_days`                 | number       | `7`           | Days before auto-deletion (1-365)         |
| `enable_versioning`                  | bool         | `false`       | Enable object versioning                  |
| `enable_uniform_bucket_level_access` | bool         | `true`        | Use uniform IAM (recommended)             |
| `allowed_service_accounts`           | list(string) | `[]`          | Service accounts with access              |

## Managing Environments

### Strategy 1: Separate Directories (Recommended)

Create separate directories for each environment:

```bash
# Setup
mkdir -p terraform/{dev,staging,production}

# Create symlinks to main config
cd terraform/dev
ln -s ../gcs-buckets.tf .

cd ../staging
ln -s ../gcs-buckets.tf .

cd ../production
ln -s ../gcs-buckets.tf .

# Create separate tfvars for each
cd dev
cp ../terraform.tfvars.example terraform.tfvars
# Edit with dev values

cd ../staging
cp ../terraform.tfvars.example terraform.tfvars
# Edit with staging values

cd ../production
cp ../terraform.tfvars.example terraform.tfvars
# Edit with production values
```

Usage:

```bash
# Deploy to dev
cd terraform/dev
terraform init
terraform apply

# Deploy to production
cd terraform/production
terraform init
terraform apply
```

### Strategy 2: Terraform Workspaces

```bash
# Create workspaces
cd terraform
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Use with different tfvars files
terraform workspace select dev
terraform apply -var-file="dev.tfvars"

terraform workspace select production
terraform apply -var-file="production.tfvars"

# List workspaces
terraform workspace list

# Show current workspace
terraform workspace show
```

### Strategy 3: CI/CD Pipeline

Use GitHub Actions or similar:

```yaml
# .github/workflows/terraform-apply.yml
name: Apply Terraform

on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: cd terraform && terraform init

      - name: Terraform Plan
        run: cd terraform && terraform plan
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: cd terraform && terraform apply -auto-approve
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
```

## Application Configuration

### Environment Variables

After creating buckets with Terraform, configure your application:

1. **Get bucket name from Terraform**

   ```bash
   cd terraform
   terraform output video_processing_bucket_name
   ```

2. **Update .env.local**

   ```bash
   # Required
   GCS_BUCKET_NAME=your-bucket-name-from-terraform

   # Required (service account with bucket access)
   GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

3. **Verify configuration**
   ```bash
   npm run validate:env
   ```

### Service Account Setup

1. **Create service account**

   ```bash
   gcloud iam service-accounts create video-processing \
     --display-name="Video Processing Service Account" \
     --description="Service account for video processing and GCS access"
   ```

2. **Get service account email**

   ```bash
   SA_EMAIL=$(gcloud iam service-accounts list \
     --filter="displayName:Video Processing Service Account" \
     --format="value(email)")
   echo "Service Account: $SA_EMAIL"
   ```

3. **Add to Terraform configuration**

   Edit `terraform/terraform.tfvars`:

   ```hcl
   allowed_service_accounts = [
     "video-processing@your-project.iam.gserviceaccount.com"
   ]
   ```

4. **Apply Terraform changes**

   ```bash
   cd terraform
   terraform apply
   ```

5. **Create and download key**

   ```bash
   gcloud iam service-accounts keys create credentials.json \
     --iam-account=$SA_EMAIL

   # Convert to single line for .env.local
   cat credentials.json | jq -c . > credentials-oneline.json
   ```

6. **Add to .env.local**

   ```bash
   echo "GOOGLE_SERVICE_ACCOUNT='$(cat credentials-oneline.json)'" >> .env.local

   # Clean up
   rm credentials.json credentials-oneline.json
   ```

### Application Code Changes

The application now fails gracefully if buckets don't exist:

```typescript
// app/api/video/split-scenes/route.ts

// Get bucket name from environment (REQUIRED)
const bucketName = process.env['GCS_BUCKET_NAME'];
if (!bucketName) {
  return NextResponse.json(
    {
      error: 'GCS bucket not configured',
      message:
        'GCS_BUCKET_NAME environment variable is not set. Configure infrastructure with Terraform.',
      details: 'See /docs/INFRASTRUCTURE.md for setup instructions.',
    },
    { status: 503 }
  );
}

const bucket = storageClient.bucket(bucketName);

// Check if bucket exists (NO AUTO-CREATION)
const [exists] = await bucket.exists();
if (!exists) {
  serverLogger.error({ bucketName, assetId, projectId }, 'GCS bucket does not exist');
  return NextResponse.json(
    {
      error: 'GCS bucket not found',
      message: `Bucket "${bucketName}" does not exist. Create it using Terraform first.`,
      details: 'See /docs/INFRASTRUCTURE.md for setup instructions.',
    },
    { status: 503 }
  );
}
```

## Troubleshooting

### Common Issues

#### 1. Bucket Name Already Taken

**Error:**

```
Error: Error creating bucket: googleapi: Error 409: You already own this bucket.
```

**Solution:**
GCS bucket names are globally unique. Choose a different name:

```hcl
# terraform/terraform.tfvars
video_processing_bucket_name = "your-company-unique-name-video-processing"
```

#### 2. Permission Denied

**Error:**

```
Error: Error creating bucket: googleapi: Error 403: Forbidden
```

**Solution:**
Grant yourself Storage Admin role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/storage.admin"
```

#### 3. Bucket Not Found in Application

**Error in application logs:**

```
GCS bucket not found: my-bucket
```

**Solution:**
Check environment variable is set correctly:

```bash
# Verify Terraform output
cd terraform
terraform output video_processing_bucket_name

# Verify .env.local
grep GCS_BUCKET_NAME .env.local

# Restart application
npm run dev
```

#### 4. Service Account Cannot Access Bucket

**Error:**

```
Error: googleapi: Error 403: Forbidden
```

**Solution:**
Verify service account is in `allowed_service_accounts`:

```bash
cd terraform
terraform state show google_storage_bucket_iam_member.video_processing_object_admin
```

If not present, add to `terraform.tfvars` and reapply:

```hcl
allowed_service_accounts = [
  "your-sa@project.iam.gserviceaccount.com"
]
```

```bash
terraform apply
```

#### 5. Cannot Destroy Bucket (Not Empty)

**Error:**

```
Error: Error destroying bucket: The bucket you tried to delete was not empty.
```

**Solution:**

Option 1: Empty the bucket first

```bash
gsutil -m rm -r gs://your-bucket-name/**
terraform destroy
```

Option 2: Set force_destroy = true (development only)

```hcl
# terraform.tfvars
environment = "dev"  # This sets force_destroy = true
```

```bash
terraform apply
terraform destroy
```

### Debugging

#### Enable Terraform Debug Logging

```bash
export TF_LOG=DEBUG
terraform apply
```

#### Check Bucket Status

```bash
# List all buckets
gsutil ls

# Check specific bucket
gsutil ls gs://your-bucket-name

# Get bucket details
gsutil ls -L -b gs://your-bucket-name

# Check bucket permissions
gsutil iam get gs://your-bucket-name
```

#### Validate Terraform Configuration

```bash
cd terraform
terraform validate
terraform fmt -check
```

## Best Practices

### Security

1. **Never Commit Secrets**
   - Add `terraform.tfvars` to `.gitignore`
   - Use environment variables or secret managers
   - Rotate service account keys regularly

2. **Use Least Privilege**
   - Grant minimal permissions to service accounts
   - Use separate service accounts per environment
   - Review IAM policies regularly

3. **Enable Uniform Bucket-Level Access**

   ```hcl
   uniform_bucket_level_access = true
   ```

   This prevents legacy ACLs and enforces IAM only.

4. **Restrict Public Access**
   - Never make buckets public
   - Use signed URLs for temporary access
   - Audit access logs regularly

### Cost Optimization

1. **Use Lifecycle Rules**

   ```hcl
   lifecycle_age_days = 7  # Auto-delete old files
   ```

2. **Choose Appropriate Storage Class**
   - STANDARD for frequently accessed files
   - NEARLINE for infrequent access (30 day minimum)
   - COLDLINE for archival (90 day minimum)

3. **Monitor Storage Usage**

   ```bash
   # Check bucket size
   gsutil du -sh gs://your-bucket-name

   # List large files
   gsutil du -h gs://your-bucket-name/** | sort -h | tail -20
   ```

4. **Set Up Budget Alerts**
   ```bash
   gcloud billing budgets create \
     --billing-account=BILLING_ACCOUNT_ID \
     --display-name="GCS Budget" \
     --budget-amount=100 \
     --threshold-rule=percent=50 \
     --threshold-rule=percent=90
   ```

### State Management

1. **Use Remote State for Teams**

   ```hcl
   terraform {
     backend "gcs" {
       bucket = "your-terraform-state-bucket"
       prefix = "terraform/state"
     }
   }
   ```

2. **Enable State Locking**
   Remote state in GCS includes locking by default.

3. **Back Up State Files**

   ```bash
   # Manual backup
   terraform state pull > terraform.tfstate.backup

   # Automated via GCS versioning
   gsutil versioning set on gs://your-terraform-state-bucket
   ```

4. **Never Edit State Manually**
   Use Terraform commands:
   ```bash
   terraform state list
   terraform state show RESOURCE
   terraform state mv SOURCE DESTINATION
   terraform state rm RESOURCE
   ```

### Infrastructure Changes

1. **Always Plan Before Apply**

   ```bash
   terraform plan -out=tfplan
   terraform apply tfplan
   ```

2. **Use Version Control**
   - Commit Terraform configuration changes
   - Use PR reviews for infrastructure changes
   - Tag releases with version numbers

3. **Document Changes**
   - Update CHANGELOG.md
   - Add comments to complex configurations
   - Document manual steps in runbooks

4. **Test in Development First**
   - Always test changes in dev environment
   - Use separate projects for dev/staging/prod
   - Validate with automated tests

## Monitoring and Maintenance

### Regular Tasks

#### Daily

- Monitor application logs for GCS errors
- Check for failed uploads/downloads
- Review storage usage metrics

#### Weekly

- Review lifecycle rule effectiveness
- Check for orphaned files
- Audit access patterns

#### Monthly

- Review and optimize storage costs
- Update lifecycle rules if needed
- Review service account permissions
- Check for Terraform updates

### Monitoring Setup

1. **Enable Cloud Monitoring**

   ```bash
   gcloud services enable monitoring.googleapis.com
   ```

2. **Create Alerting Policies**

   ```bash
   # Storage usage alert
   gcloud alpha monitoring policies create \
     --notification-channels=CHANNEL_ID \
     --display-name="GCS High Usage" \
     --condition-display-name="Storage > 100GB" \
     --condition-threshold-value=100 \
     --condition-threshold-duration=300s
   ```

3. **Set Up Log-Based Metrics**
   ```bash
   gcloud logging metrics create gcs_errors \
     --description="GCS access errors" \
     --log-filter='resource.type="gcs_bucket" AND severity>=ERROR'
   ```

### Useful Commands

```bash
# Check bucket lifecycle
gsutil lifecycle get gs://your-bucket-name

# List recent uploads
gsutil ls -l gs://your-bucket-name/** | head -20

# Check storage class distribution
gsutil ls -L gs://your-bucket-name/** | grep "Storage class" | sort | uniq -c

# Get total object count
gsutil ls gs://your-bucket-name/** | wc -l

# Find old files (before cleanup)
gsutil ls -l gs://your-bucket-name/** | awk '$1 ~ /2024-01/'

# Check CORS configuration
gsutil cors get gs://your-bucket-name
```

## Additional Resources

### Documentation

- [Main Project README](/README.md)
- [Environment Variables Guide](/docs/ENVIRONMENT_VARIABLES.md)
- [Security Guide](/docs/security/SECURITY.md)
- [API Documentation](/docs/api/)

### External Resources

- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCS Documentation](https://cloud.google.com/storage/docs)
- [GCS Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices)
- [Google Cloud IAM](https://cloud.google.com/iam/docs)

### Scripts

Useful scripts for infrastructure management:

```bash
# scripts/test-gcs-bucket.js - Test bucket access
npm run test:gcs

# scripts/create-gcs-bucket.js - Legacy manual creation (deprecated)
# Use Terraform instead
```

## Migration Guide

### Migrating from Auto-Created Buckets

If you already have auto-created buckets:

1. **Import existing bucket into Terraform**

   ```bash
   cd terraform
   terraform import google_storage_bucket.video_processing your-existing-bucket-name
   ```

2. **Update terraform.tfvars with existing name**

   ```hcl
   video_processing_bucket_name = "your-existing-bucket-name"
   ```

3. **Plan to verify no changes**

   ```bash
   terraform plan  # Should show no changes
   ```

4. **Update application to remove auto-creation**
   Already done in latest code.

5. **Deploy updated application**
   ```bash
   npm run build
   npm run deploy
   ```

## Support

For issues or questions:

1. Check this documentation first
2. Review Terraform logs with `TF_LOG=DEBUG`
3. Check application logs for GCS errors
4. Consult [TROUBLESHOOTING.md](/docs/TROUBLESHOOTING.md)
5. Open an issue with detailed error messages

---

**Last Updated**: 2025-10-24
**Maintained By**: Infrastructure Team
**Version**: 1.0.0
