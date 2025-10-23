# Netlify Blobs Configuration

## Current Status
The async job system is designed to use Netlify Blobs for persistent storage, but it will work perfectly fine without it using fallback storage methods.

## Storage Hierarchy
The system automatically falls back through these storage methods:
1. **Netlify Blobs** (if enabled) - Persistent across deployments
2. **In-memory cache** - Persists for the lifetime of the function instance
3. **Environment variables** - Limited backup storage

## How It Works Now
Without Netlify Blobs enabled, the system uses in-memory storage which is sufficient for:
- Job processing that completes within the same function instance
- Typical prompt generation workflows (2-5 minutes)
- All current functionality

## Enabling Netlify Blobs (Optional)
If you want to enable Netlify Blobs for more persistent storage:

1. Go to your Netlify dashboard
2. Navigate to Site Settings > Environment Variables
3. Add Blobs to your site (this is a Netlify feature that may require enabling)
4. The system will automatically detect and use it

## Benefits of Current Fallback System
- No configuration required
- Works immediately
- Sufficient for all current use cases
- No additional costs

## When You Might Want Netlify Blobs
- If you need job data to persist across function restarts
- If you're processing extremely long jobs (>10 minutes)
- If you want to implement job history or analytics

For now, the fallback storage is working great and there's no need to change anything!
