# Ad Analyzer Setup Guide

## Overview
The Ad Analyzer is a powerful tool that analyzes advertisement videos to extract insights about products, visual style, hooks, and messaging patterns. It integrates with Google's Video Intelligence API and Gemini AI to provide comprehensive analysis.

## Features
- **Client Name Search**: Enter a brand name and automatically find their recent YouTube ads
- **YouTube Link Analysis**: Analyze specific YouTube videos by providing their URLs
- **Video Upload**: Upload video files directly for analysis
- **Comprehensive Analysis**: Extract products, offers, hooks, key scenes, dialogue, music, and visual style
- **AI Summaries**: Get AI-generated summaries of key learnings and brand visual style

## Setup Instructions

### 1. Environment Variables
Add these to your Netlify environment variables:

```bash
# Google Cloud Video Intelligence API
GOOGLE_APPLICATION_CREDENTIALS_JSON=<entire JSON content from service account file>

# Google Cloud Storage (for video uploads)
GCS_BUCKET_NAME=<your_gcs_bucket_name_for_video_uploads>

# Gemini API
GEMINI_API_KEY=<your Gemini API key>
```

### 2. Google Cloud Setup
1. Enable the Video Intelligence API in your Google Cloud project.
2. Create a Google Cloud Storage (GCS) bucket. 
   - Choose a globally unique name.
   - Standard storage class is usually fine.
   - Ensure the service account (from step 3) has "Storage Object Admin" or at least "Storage Object Creator" and "Storage Object Viewer" permissions on this bucket.
3. Create a service account with the following roles:
   - "Video Intelligence API User"
   - "Storage Object Admin" (or Creator/Viewer as mentioned above) for the GCS bucket.
4. Download the service account JSON key.
5. Copy the entire JSON content and add it as `GOOGLE_APPLICATION_CREDENTIALS_JSON` in Netlify environment variables.
6. Set `GCS_BUCKET_NAME` in Netlify environment variables to the name of the bucket you created.

### 3. Install Dependencies
```bash
npm install
```

This will install:
- `@google-cloud/video-intelligence` - For video analysis
- `@google/generative-ai` - For Gemini integration
- `@google-cloud/storage` - For Google Cloud Storage uploads

### 4. Deploy to Netlify
```bash
netlify deploy --prod
```

## Usage

### For Developers
The Ad Analyzer consists of:
- **Frontend**: `public/ad-analyze.html` - The UI
- **API Client**: `public/js/ad-analyzer-api.js` - Client-side API integration
- **Netlify Functions**:
  - `netlify/functions/search-client-ads.js` - Searches for client ads using Gemini
  - `netlify/functions/analyze-video.js` - Analyzes videos with Video Intelligence API
  - `netlify/functions/generate-summaries.js` - Generates summaries with Gemini

### For End Users
1. Navigate to `/ad-analyze.html`
2. Choose input method:
   - **Client Name**: Enter a brand name (e.g., "Nike", "Coca-Cola")
   - **YouTube Links**: Paste up to 5 YouTube video URLs
   - **Upload Videos**: Upload up to 5 video files
3. Click "Start Analysis"
4. View detailed analysis results and AI-generated summaries

## API Endpoints

### Search Client Ads
```
POST /.netlify/functions/search-client-ads
Body: { "clientName": "Nike" }
```

### Analyze Videos
```
POST /.netlify/functions/analyze-video
Body: { 
  "videoUrls": ["https://youtube.com/..."], 
  "videoFiles": [] 
}
```

### Generate Summaries
```
POST /.netlify/functions/generate-summaries
Body: { "analyses": [...] }
```

## Troubleshooting

### "Google Cloud credentials not configured"
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set in Netlify environment variables
- The value should be the entire JSON content, not a file path

### "Gemini API key not configured"
- Ensure `GEMINI_API_KEY` is set in Netlify environment variables

### Analysis fails with video files
- Ensure `GCS_BUCKET_NAME` environment variable is set correctly in Netlify.
- Check that the service account has appropriate permissions on the GCS bucket.
- Review Netlify function logs for `analyze-video` for more specific errors.

## Future Enhancements
- Direct video file upload to Google Cloud Storage
- Real-time video analysis progress
- Export analysis results as PDF/CSV
- Batch processing for multiple clients
- Historical analysis comparison

## Security Notes
- All API keys are stored as environment variables
- CORS is enabled for development
- Consider restricting CORS in production
- Video files are not stored permanently 