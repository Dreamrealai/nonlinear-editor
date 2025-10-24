# =============================================================================
# Google Cloud Storage Buckets - Terraform Configuration
# =============================================================================
#
# This configuration manages GCS buckets for video processing and storage.
#
# Usage:
#   terraform init
#   terraform plan
#   terraform apply
#
# Prerequisites:
#   - Google Cloud CLI installed and authenticated
#   - Project ID configured in terraform.tfvars
#   - Service account with Storage Admin permissions
#
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # RECOMMENDED: Use remote state for team collaboration
  # Uncomment and configure for production use
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "terraform/state"
  # }
}

# =============================================================================
# Variables
# =============================================================================

variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "video_processing_bucket_name" {
  description = "Name for the video processing bucket"
  type        = string
}

variable "lifecycle_age_days" {
  description = "Number of days before objects are automatically deleted"
  type        = number
  default     = 7

  validation {
    condition     = var.lifecycle_age_days > 0 && var.lifecycle_age_days <= 365
    error_message = "Lifecycle age must be between 1 and 365 days."
  }
}

variable "enable_versioning" {
  description = "Enable object versioning on buckets"
  type        = bool
  default     = false
}

variable "enable_uniform_bucket_level_access" {
  description = "Enable uniform bucket-level access (recommended for security)"
  type        = bool
  default     = true
}

variable "allowed_service_accounts" {
  description = "List of service account emails that should have access to buckets"
  type        = list(string)
  default     = []
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Data Sources
# =============================================================================

data "google_project" "project" {
  project_id = var.project_id
}

# =============================================================================
# Video Processing Bucket
# =============================================================================

resource "google_storage_bucket" "video_processing" {
  name          = var.video_processing_bucket_name
  location      = "US"
  storage_class = "STANDARD"

  # Force destroy for non-production environments
  force_destroy = var.environment != "production"

  # Uniform bucket-level access (recommended for security)
  uniform_bucket_level_access = var.enable_uniform_bucket_level_access

  # Enable versioning if specified
  versioning {
    enabled = var.enable_versioning
  }

  # Lifecycle rule: Auto-delete temporary files
  lifecycle_rule {
    condition {
      age = var.lifecycle_age_days
    }
    action {
      type = "Delete"
    }
  }

  # Lifecycle rule: Delete files in test-uploads after 1 day
  lifecycle_rule {
    condition {
      age                = 1
      matches_prefix     = ["test-uploads/"]
    }
    action {
      type = "Delete"
    }
  }

  # CORS configuration for client-side uploads
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Labels for resource management
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "video-processing"
  }
}

# =============================================================================
# IAM Bindings - Video Processing Bucket
# =============================================================================

# Allow service accounts to read/write objects
resource "google_storage_bucket_iam_member" "video_processing_object_admin" {
  for_each = toset(var.allowed_service_accounts)

  bucket = google_storage_bucket.video_processing.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${each.value}"
}

# Allow service accounts to view bucket metadata
resource "google_storage_bucket_iam_member" "video_processing_bucket_reader" {
  for_each = toset(var.allowed_service_accounts)

  bucket = google_storage_bucket.video_processing.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${each.value}"
}

# =============================================================================
# Optional: Additional Buckets for Different Purposes
# =============================================================================

# Uncomment if you need separate buckets for different asset types

# resource "google_storage_bucket" "thumbnails" {
#   name          = "${var.project_id}-thumbnails"
#   location      = "US"
#   storage_class = "STANDARD"
#
#   force_destroy = var.environment != "production"
#   uniform_bucket_level_access = var.enable_uniform_bucket_level_access
#
#   lifecycle_rule {
#     condition {
#       age = 30  # Keep thumbnails longer than processing files
#     }
#     action {
#       type = "Delete"
#     }
#   }
#
#   labels = {
#     environment = var.environment
#     managed_by  = "terraform"
#     purpose     = "thumbnails"
#   }
# }

# resource "google_storage_bucket" "exports" {
#   name          = "${var.project_id}-exports"
#   location      = "US"
#   storage_class = "STANDARD"
#
#   force_destroy = var.environment != "production"
#   uniform_bucket_level_access = var.enable_uniform_bucket_level_access
#
#   lifecycle_rule {
#     condition {
#       age = 14  # Keep exports for 2 weeks
#     }
#     action {
#       type = "Delete"
#     }
#   }
#
#   labels = {
#     environment = var.environment
#     managed_by  = "terraform"
#     purpose     = "exports"
#   }
# }

# =============================================================================
# Outputs
# =============================================================================

output "video_processing_bucket_name" {
  description = "Name of the video processing bucket"
  value       = google_storage_bucket.video_processing.name
}

output "video_processing_bucket_url" {
  description = "URL of the video processing bucket"
  value       = google_storage_bucket.video_processing.url
}

output "video_processing_bucket_self_link" {
  description = "Self link to the video processing bucket"
  value       = google_storage_bucket.video_processing.self_link
}

output "configuration_summary" {
  description = "Summary of bucket configuration"
  value = {
    bucket_name     = google_storage_bucket.video_processing.name
    location        = google_storage_bucket.video_processing.location
    storage_class   = google_storage_bucket.video_processing.storage_class
    lifecycle_days  = var.lifecycle_age_days
    versioning      = var.enable_versioning
    environment     = var.environment
  }
}
