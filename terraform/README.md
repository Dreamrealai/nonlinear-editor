# Terraform Infrastructure Configuration

This directory contains Terraform configuration for managing Google Cloud Storage buckets and related infrastructure.

## Quick Start

### Prerequisites

1. Install Terraform (>= 1.5.0):

   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
   unzip terraform_1.5.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. Install and authenticate Google Cloud CLI:

   ```bash
   # Install gcloud
   # See: https://cloud.google.com/sdk/docs/install

   # Authenticate
   gcloud auth login
   gcloud auth application-default login

   # Set your project
   gcloud config set project YOUR_PROJECT_ID
   ```

3. Enable required APIs:
   ```bash
   gcloud services enable storage.googleapis.com
   gcloud services enable iam.googleapis.com
   ```

### Initial Setup

1. Create your configuration file:

   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:

   ```hcl
   project_id                   = "your-project-id"
   video_processing_bucket_name = "your-project-video-processing"
   environment                  = "production"
   ```

3. Initialize Terraform:

   ```bash
   terraform init
   ```

4. Review the planned changes:

   ```bash
   terraform plan
   ```

5. Apply the configuration:

   ```bash
   terraform apply
   ```

6. Note the outputs (especially the bucket name):

   ```bash
   terraform output
   ```

7. Update your `.env.local` with the bucket name:
   ```bash
   GCS_BUCKET_NAME=your-bucket-name-from-output
   ```

## Configuration Files

- **gcs-buckets.tf** - Main configuration for GCS buckets
- **terraform.tfvars.example** - Example variables file
- **terraform.tfvars** - Your actual values (gitignored)
- **README.md** - This file

## Bucket Configuration

### Video Processing Bucket

The main bucket for temporary video processing:

- **Location**: US (multi-region)
- **Storage Class**: STANDARD
- **Lifecycle**: Auto-delete after 7 days (configurable)
- **CORS**: Enabled for client uploads
- **IAM**: Service account access only

### Lifecycle Rules

1. **Main rule**: Delete all objects after N days (default: 7)
2. **Test uploads**: Delete test files after 1 day
3. Configurable via `lifecycle_age_days` variable

### Security Features

- Uniform bucket-level access enabled
- IAM-based access control
- Service account authentication required
- No public access

## Managing Multiple Environments

### Option 1: Separate State Files

Create separate directories for each environment:

```bash
terraform/
  dev/
    gcs-buckets.tf -> ../gcs-buckets.tf (symlink)
    terraform.tfvars
  staging/
    gcs-buckets.tf -> ../gcs-buckets.tf (symlink)
    terraform.tfvars
  production/
    gcs-buckets.tf -> ../gcs-buckets.tf (symlink)
    terraform.tfvars
```

### Option 2: Terraform Workspaces

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switch between environments
terraform workspace select dev
terraform apply -var-file="dev.tfvars"

terraform workspace select production
terraform apply -var-file="production.tfvars"
```

### Option 3: Different Variable Files

```bash
# Development
terraform apply -var-file="dev.tfvars"

# Staging
terraform apply -var-file="staging.tfvars"

# Production
terraform apply -var-file="production.tfvars"
```

## Common Operations

### View Current State

```bash
terraform show
```

### List All Buckets

```bash
terraform state list
```

### View Bucket Details

```bash
terraform state show google_storage_bucket.video_processing
```

### Update Configuration

1. Edit `terraform.tfvars` or `gcs-buckets.tf`
2. Preview changes: `terraform plan`
3. Apply changes: `terraform apply`

### Add Service Account Access

1. Edit `terraform.tfvars`:

   ```hcl
   allowed_service_accounts = [
     "service-account@your-project.iam.gserviceaccount.com"
   ]
   ```

2. Apply changes:
   ```bash
   terraform apply
   ```

### Destroy Resources

**WARNING**: This will delete all buckets and their contents!

```bash
# Preview what will be destroyed
terraform plan -destroy

# Destroy resources
terraform destroy
```

## Troubleshooting

### Bucket Name Already Exists

GCS bucket names are globally unique. If you get an error:

```
Error: Error creating bucket: googleapi: Error 409: You already own this bucket.
```

Solution: Choose a different bucket name in `terraform.tfvars`

### Authentication Errors

```
Error: google: could not find default credentials
```

Solution:

```bash
gcloud auth application-default login
```

### Permission Denied

```
Error: Error creating bucket: googleapi: Error 403: Forbidden
```

Solution: Ensure your account has the Storage Admin role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/storage.admin"
```

### Bucket Not Empty (Cannot Destroy)

If `force_destroy = false` in production:

```bash
# Option 1: Empty the bucket first
gsutil -m rm -r gs://your-bucket-name/*

# Option 2: Temporarily set force_destroy = true
# Edit terraform.tfvars and set environment = "dev"
terraform apply
terraform destroy
```

## Best Practices

### Security

1. Never commit `terraform.tfvars` to version control
2. Use service accounts with minimal permissions
3. Enable uniform bucket-level access
4. Review IAM policies regularly
5. Use remote state with encryption

### State Management

1. Use remote state for production:

   ```hcl
   terraform {
     backend "gcs" {
       bucket = "your-terraform-state-bucket"
       prefix = "terraform/state"
     }
   }
   ```

2. Enable state locking for team collaboration
3. Back up state files regularly

### Cost Optimization

1. Use lifecycle rules to delete old files
2. Choose appropriate storage class
3. Monitor storage usage:
   ```bash
   gsutil du -sh gs://your-bucket-name
   ```

### Monitoring

1. Enable Cloud Monitoring:

   ```bash
   gcloud services enable monitoring.googleapis.com
   ```

2. Set up alerts for:
   - Storage usage exceeding threshold
   - Unauthorized access attempts
   - Lifecycle rule failures

## Integration with Application

### Environment Variables

After applying Terraform, update your application's environment variables:

```bash
# Copy the bucket name from Terraform output
terraform output video_processing_bucket_name

# Update .env.local
GCS_BUCKET_NAME=your-bucket-name-from-output
```

### Service Account Setup

1. Create a service account:

   ```bash
   gcloud iam service-accounts create video-processing \
     --display-name="Video Processing Service Account"
   ```

2. Grant bucket access:

   ```bash
   # Get the service account email
   SA_EMAIL=$(gcloud iam service-accounts list \
     --filter="displayName:Video Processing Service Account" \
     --format="value(email)")

   # Add to terraform.tfvars
   echo "allowed_service_accounts = [\"${SA_EMAIL}\"]" >> terraform.tfvars

   # Apply changes
   terraform apply
   ```

3. Download credentials:

   ```bash
   gcloud iam service-accounts keys create credentials.json \
     --iam-account=$SA_EMAIL
   ```

4. Add to `.env.local`:
   ```bash
   GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

## Additional Resources

- [Terraform Google Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCS Bucket Resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket)
- [GCS Lifecycle Rules](https://cloud.google.com/storage/docs/lifecycle)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Terraform logs: `TF_LOG=DEBUG terraform apply`
3. Consult the main project documentation in `/docs/INFRASTRUCTURE.md`
