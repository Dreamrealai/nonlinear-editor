# Google Cloud Video Intelligence API - Comprehensive Documentation

**Complete reference for Google Cloud Video Intelligence API**

Last Updated: October 10, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
   - [What is Video Intelligence API?](#what-is-video-intelligence-api)
   - [Authentication Setup](#authentication-setup)
   - [Installation](#installation)
3. [API Overview](#api-overview)
   - [Service Endpoints](#service-endpoints)
   - [API Versions](#api-versions)
4. [Features](#features)
   - [Shot Change Detection](#shot-change-detection)
   - [Label Detection](#label-detection)
   - [Object Tracking](#object-tracking)
   - [Text Detection](#text-detection)
   - [Speech Transcription](#speech-transcription)
   - [Explicit Content Detection](#explicit-content-detection)
   - [Logo Recognition](#logo-recognition)
   - [Face Detection](#face-detection)
   - [Person Detection](#person-detection)
5. [Authentication](#authentication)
   - [Service Account Setup](#service-account-setup)
   - [Environment Variables](#environment-variables)
   - [Node.js Authentication](#nodejs-authentication)
6. [Video Annotation](#video-annotation)
   - [Asynchronous Annotation](#asynchronous-annotation)
   - [Streaming Annotation](#streaming-annotation)
   - [Input Sources](#input-sources)
7. [Operations Management](#operations-management)
8. [Code Examples](#code-examples)
   - [Shot Change Detection](#shot-change-detection-example)
   - [Label Detection](#label-detection-example)
   - [Object Tracking](#object-tracking-example)
   - [Speech Transcription](#speech-transcription-example)
9. [Pricing](#pricing)
   - [Stored Video Annotation](#stored-video-annotation-pricing)
   - [Streaming Video Annotation](#streaming-video-annotation-pricing)
   - [Free Tier](#free-tier)
10. [Rate Limits and Quotas](#rate-limits-and-quotas)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)
13. [Resources](#resources)

---

## Introduction

The **Google Cloud Video Intelligence API** allows developers to use Google's advanced video analysis technology as part of their applications. It provides a powerful suite of features for extracting metadata from video content, detecting objects, recognizing text, transcribing speech, and much more.

### Key Features

- **Comprehensive Video Analysis**: Analyze videos stored locally, in Cloud Storage, or live-streamed
- **Multiple Detection Types**: Shot detection, label detection, object tracking, text detection, and more
- **Contextual Information**: Annotations at video, segment, shot, and frame levels
- **REST and gRPC APIs**: Flexible API access methods
- **Client Libraries**: Support for multiple programming languages
- **Asynchronous & Streaming**: Both batch and real-time processing modes

---

## Getting Started

### What is Video Intelligence API?

The Video Intelligence API allows you to:
- Annotate videos stored locally or in Google Cloud Storage
- Analyze live-streamed videos in real-time
- Extract contextual information at multiple granularity levels:
  - **Entire video**: Overall content classification
  - **Video segments**: Time-based sections
  - **Shots**: Camera shots and scene changes
  - **Individual frames**: Frame-level object detection

### Authentication Setup

#### Prerequisites

1. **Google Cloud Project**: Create or select a project in [Google Cloud Console](https://console.cloud.google.com)
2. **Enable API**: Enable the Video Intelligence API for your project
3. **Service Account**: Create a service account with Video Intelligence API permissions

#### Create Service Account

1. Navigate to **IAM & Admin** > **Service Accounts** in Google Cloud Console
2. Click **Create Service Account**
3. Provide a name and description
4. Grant the **Cloud Video Intelligence API User** role
5. Click **Keys** > **Add Key** > **Create New Key**
6. Select **JSON** format
7. Download the JSON key file (keep it secure!)

### Installation

#### Node.js

```bash
npm install @google-cloud/video-intelligence
```

#### Python

```bash
pip install google-cloud-videointelligence
```

#### PHP

```bash
composer require google/cloud-videointelligence
```

#### Go

```bash
go get cloud.google.com/go/videointelligence/apiv1
```

---

## API Overview

### Service Endpoints

- **Base URL**: `https://videointelligence.googleapis.com`
- **Service**: `videointelligence.googleapis.com`
- **Discovery Document**: `https://videointelligence.googleapis.com/$discovery/rest?version=v1`

### API Versions

- **Stable**: `v1` (Production use)
- **Beta**: `v1p1beta1`, `v1p2beta1`, `v1p3beta1` (Early access to new features)

---

## Features

### Shot Change Detection

Detects transitions between different camera shots or scenes in a video. A shot is a series of frames with visual continuity captured from a single camera perspective.

**Use Cases:**
- Video editing and post-production
- Content indexing and navigation
- Scene-based video segmentation
- Thumbnail generation for scene previews

**Feature Flag**: `SHOT_CHANGE_DETECTION`

**Output**: Array of shot annotations with start and end timestamps

### Label Detection

Automatically categorizes and tags video content with descriptive labels at the video, segment, and shot levels. Labels describe entities, actions, objects, and scenes detected throughout the video.

**Use Cases:**
- Video search and discovery
- Content categorization
- Metadata generation
- Automated tagging systems

**Feature Flag**: `LABEL_DETECTION`

**Output**: Labels with confidence scores, timestamps, and categories

**Example Labels**: "train", "transportation", "railroad crossing", "vehicle", "outdoor"

### Object Tracking

Tracks specific objects as they move through video frames, providing bounding box coordinates and tracking IDs.

**Use Cases:**
- Sports analytics
- Surveillance and security
- Retail analytics
- Traffic monitoring

**Feature Flag**: `OBJECT_TRACKING`

**Output**: Object tracks with frame-by-frame bounding boxes, confidence scores, and entity descriptions

### Text Detection

Identifies and extracts textual content appearing within video frames using OCR (Optical Character Recognition).

**Use Cases:**
- License plate recognition
- Sign reading
- Subtitle extraction
- Document video analysis

**Feature Flag**: `TEXT_DETECTION`

**Output**: Detected text strings with timestamps and bounding boxes

### Speech Transcription

Converts spoken audio in videos into written text with timestamps.

**Use Cases:**
- Closed caption generation
- Content search by spoken words
- Meeting transcriptions
- Accessibility features

**Feature Flag**: `SPEECH_TRANSCRIPTION`

**Output**: Transcribed text with word-level timestamps and confidence scores

**Supported Languages**: 100+ languages including English, Spanish, French, German, Japanese, Chinese, and more

### Explicit Content Detection

Identifies potentially inappropriate or sensitive visual content in videos.

**Use Cases:**
- Content moderation
- Parental controls
- Compliance enforcement
- Safe search filtering

**Feature Flag**: `EXPLICIT_CONTENT_DETECTION`

**Output**: Likelihood ratings (VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY) for each frame

### Logo Recognition

Detects and tracks corporate logos and brand symbols in videos.

**Use Cases:**
- Brand monitoring
- Sponsorship tracking
- Advertising analytics
- Copyright detection

**Feature Flag**: `LOGO_RECOGNITION`

**Output**: Logo entities with timestamps and bounding boxes

### Face Detection

Identifies and analyzes facial features in video frames.

**Use Cases:**
- Person identification
- Emotion analysis
- Audience analytics
- Security applications

**Feature Flag**: `FACE_DETECTION`

**Output**: Face bounding boxes with attributes and timestamps

### Person Detection

Identifies human presence and tracks people throughout the video.

**Use Cases:**
- People counting
- Crowd analysis
- Retail footfall tracking
- Security monitoring

**Feature Flag**: `PERSON_DETECTION`

**Output**: Person tracks with bounding boxes and confidence scores

---

## Authentication

### Service Account Setup

The recommended authentication method is using Application Default Credentials (ADC) with service account JSON keys.

### Environment Variables

Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

For Windows:
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json
```

### Node.js Authentication

#### Option 1: Environment Variable (Recommended)

```javascript
// No additional code needed - client will automatically use credentials
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const client = new VideoIntelligenceServiceClient();
```

#### Option 2: Explicit Credentials in Code

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

const client = new VideoIntelligenceServiceClient({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: credentials,
});
```

#### Option 3: Key File Path

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

const client = new VideoIntelligenceServiceClient({
  keyFilename: '/path/to/service-account-key.json',
});
```

---

## Video Annotation

### Asynchronous Annotation

Most annotation requests are processed asynchronously due to the time required to analyze video content.

#### Basic Workflow

1. **Submit annotation request** with video source and desired features
2. **Receive operation ID** immediately
3. **Poll operation status** periodically
4. **Retrieve results** when operation completes

#### Request Structure

```javascript
const request = {
  inputUri: 'gs://bucket-name/video.mp4', // or use inputContent for local files
  features: ['SHOT_CHANGE_DETECTION', 'LABEL_DETECTION'],
  videoContext: {
    // Optional configuration
  },
};
```

### Streaming Annotation

For real-time analysis of live video streams.

**Supported Features:**
- `STREAMING_LABEL_DETECTION`
- `STREAMING_SHOT_CHANGE_DETECTION`
- `STREAMING_EXPLICIT_CONTENT_DETECTION`
- `STREAMING_OBJECT_TRACKING`

### Input Sources

#### Google Cloud Storage URI

```javascript
{
  inputUri: 'gs://my-bucket/videos/sample.mp4'
}
```

#### HTTP/HTTPS URL

```javascript
{
  inputUri: 'https://example.com/video.mp4'
}
```

#### Base64 Encoded Content (Local Files)

```javascript
const fs = require('fs');
const videoContent = fs.readFileSync('/path/to/video.mp4');

{
  inputContent: videoContent.toString('base64')
}
```

**Note**: For large files (>10MB), use Cloud Storage URIs for better performance.

---

## Operations Management

Video annotation returns a long-running operation. You can manage these operations:

### Get Operation Status

```javascript
const [operation] = await client.annotateVideo(request);
const [result] = await operation.promise();
```

### Cancel Operation

```javascript
await operation.cancel();
```

### Check Operation Metadata

```javascript
const metadata = operation.metadata;
console.log('Progress:', metadata);
```

---

## Code Examples

### Shot Change Detection Example

This example demonstrates how to detect shot changes in a video - the exact use case in your project.

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function detectShots(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  const request = {
    inputUri: videoUri,
    features: ['SHOT_CHANGE_DETECTION'],
  };

  // Execute annotation
  const [operation] = await client.annotateVideo(request);
  console.log('Processing video for shot detection...');

  // Wait for operation to complete
  const [operationResult] = await operation.promise();

  // Get shot annotations
  const shots = operationResult.annotationResults[0].shotAnnotations;

  console.log(`Detected ${shots.length} shots:`);

  shots.forEach((shot, idx) => {
    const startTime =
      Number(shot.startTimeOffset.seconds || 0) +
      (shot.startTimeOffset.nanos || 0) / 1e9;

    const endTime =
      Number(shot.endTimeOffset.seconds || 0) +
      (shot.endTimeOffset.nanos || 0) / 1e9;

    console.log(`Shot ${idx + 1}:`);
    console.log(`  Start: ${startTime.toFixed(2)}s`);
    console.log(`  End: ${endTime.toFixed(2)}s`);
  });

  return shots;
}

// Usage
detectShots('gs://cloud-samples-data/video/cat.mp4');
```

### Shot Detection with Signed URL (Your Project's Pattern)

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const { createClient } = require('@supabase/supabase-js');

async function detectShotsFromSupabase(assetId) {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get asset from database
  const { data: asset } = await supabase
    .from('assets')
    .select('id, storage_url')
    .eq('id', assetId)
    .single();

  // Parse storage URL
  const [bucket, ...keyParts] = asset.storage_url.split('/');
  const key = keyParts.join('/');

  // Create signed URL (valid for 15 minutes)
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, 60 * 15);

  // Initialize Video Intelligence client
  const credentials = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );

  const client = new VideoIntelligenceServiceClient({
    projectId: process.env.GCP_PROJECT_ID,
    credentials,
  });

  // Annotate video
  const [operation] = await client.annotateVideo({
    inputUri: signed.signedUrl,
    features: ['SHOT_CHANGE_DETECTION'],
  });

  const [result] = await operation.promise();
  const shots = result.annotationResults[0].shotAnnotations;

  // Convert to database format
  const rows = shots.map((shot) => ({
    asset_id: assetId,
    start_ms:
      Number(shot.startTimeOffset.seconds || 0) * 1000 +
      Math.round((shot.startTimeOffset.nanos || 0) / 1_000_000),
    end_ms:
      Number(shot.endTimeOffset.seconds || 0) * 1000 +
      Math.round((shot.endTimeOffset.nanos || 0) / 1_000_000),
  }));

  // Store in database
  await supabase.from('scenes').insert(rows);

  return { inserted: rows.length };
}
```

### Label Detection Example

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function detectLabels(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  const request = {
    inputUri: videoUri,
    features: ['LABEL_DETECTION'],
  };

  const [operation] = await client.annotateVideo(request);
  console.log('Analyzing video for labels...');

  const [operationResult] = await operation.promise();

  // Get segment labels (labels for video segments)
  const segmentLabels =
    operationResult.annotationResults[0].segmentLabelAnnotations;

  console.log('Segment labels:');
  segmentLabels.forEach((label) => {
    console.log(`\nLabel: ${label.entity.description}`);
    console.log(`  Confidence: ${(label.categoryEntities[0]?.confidence || 0) * 100}%`);

    label.segments.forEach((segment, idx) => {
      const start =
        Number(segment.segment.startTimeOffset.seconds || 0) +
        (segment.segment.startTimeOffset.nanos || 0) / 1e9;

      const end =
        Number(segment.segment.endTimeOffset.seconds || 0) +
        (segment.segment.endTimeOffset.nanos || 0) / 1e9;

      console.log(`  Segment ${idx + 1}: ${start.toFixed(1)}s - ${end.toFixed(1)}s`);
      console.log(`    Confidence: ${(segment.confidence * 100).toFixed(1)}%`);
    });
  });
}

detectLabels('gs://cloud-samples-data/video/cat.mp4');
```

### Object Tracking Example

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function trackObjects(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  const request = {
    inputUri: videoUri,
    features: ['OBJECT_TRACKING'],
    videoContext: {
      objectTrackingConfig: {
        model: 'builtin/latest', // or 'builtin/stable'
      },
    },
  };

  const [operation] = await client.annotateVideo(request);
  const [operationResult] = await operation.promise();

  const objects = operationResult.annotationResults[0].objectAnnotations;

  console.log(`Detected ${objects.length} objects:`);

  objects.forEach((object) => {
    console.log(`\nObject: ${object.entity.description}`);
    console.log(`  Confidence: ${(object.confidence * 100).toFixed(1)}%`);
    console.log(`  Frames: ${object.frames.length}`);

    // First frame
    const firstFrame = object.frames[0];
    const timeOffset =
      Number(firstFrame.timeOffset.seconds || 0) +
      (firstFrame.timeOffset.nanos || 0) / 1e9;

    console.log(`  First seen at: ${timeOffset.toFixed(2)}s`);
    console.log(`  Bounding box (normalized):`);
    console.log(`    Left: ${firstFrame.normalizedBoundingBox.left.toFixed(3)}`);
    console.log(`    Top: ${firstFrame.normalizedBoundingBox.top.toFixed(3)}`);
    console.log(`    Right: ${firstFrame.normalizedBoundingBox.right.toFixed(3)}`);
    console.log(`    Bottom: ${firstFrame.normalizedBoundingBox.bottom.toFixed(3)}`);
  });
}

trackObjects('gs://cloud-samples-data/video/cat.mp4');
```

### Speech Transcription Example

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function transcribeSpeech(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  const request = {
    inputUri: videoUri,
    features: ['SPEECH_TRANSCRIPTION'],
    videoContext: {
      speechTranscriptionConfig: {
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
      },
    },
  };

  const [operation] = await client.annotateVideo(request);
  console.log('Transcribing audio...');

  const [operationResult] = await operation.promise();
  const transcriptions =
    operationResult.annotationResults[0].speechTranscriptions;

  transcriptions.forEach((transcription, idx) => {
    console.log(`\nTranscription ${idx + 1}:`);

    // Best alternative (highest confidence)
    const alternative = transcription.alternatives[0];
    console.log(`Text: ${alternative.transcript}`);
    console.log(`Confidence: ${(alternative.confidence * 100).toFixed(1)}%`);

    // Word-level details
    console.log('Words:');
    alternative.words.forEach((word) => {
      const startTime =
        Number(word.startTime.seconds || 0) +
        (word.startTime.nanos || 0) / 1e9;

      const endTime =
        Number(word.endTime.seconds || 0) +
        (word.endTime.nanos || 0) / 1e9;

      console.log(`  "${word.word}": ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    });
  });
}

transcribeSpeech('gs://cloud-samples-data/video/chicago.mp4');
```

### Text Detection Example

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function detectText(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  const request = {
    inputUri: videoUri,
    features: ['TEXT_DETECTION'],
  };

  const [operation] = await client.annotateVideo(request);
  const [operationResult] = await operation.promise();

  const textAnnotations =
    operationResult.annotationResults[0].textAnnotations;

  console.log('Detected text:');
  textAnnotations.forEach((text) => {
    console.log(`\nText: "${text.text}"`);

    text.segments.forEach((segment, idx) => {
      const start =
        Number(segment.segment.startTimeOffset.seconds || 0) +
        (segment.segment.startTimeOffset.nanos || 0) / 1e9;

      const end =
        Number(segment.segment.endTimeOffset.seconds || 0) +
        (segment.segment.endTimeOffset.nanos || 0) / 1e9;

      console.log(`  Segment ${idx + 1}: ${start.toFixed(1)}s - ${end.toFixed(1)}s`);
      console.log(`    Confidence: ${(segment.confidence * 100).toFixed(1)}%`);

      // Bounding box for first frame
      if (segment.frames && segment.frames[0]) {
        const box = segment.frames[0].rotatedBoundingBox;
        console.log(`    Bounding box vertices: ${box.vertices.length} points`);
      }
    });
  });
}

detectText('gs://cloud-samples-data/video/sign.mp4');
```

### Local File Analysis

```javascript
const fs = require('fs');
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function analyzeLocalVideo(filePath) {
  const client = new VideoIntelligenceServiceClient();

  // Read file and convert to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString('base64');

  const request = {
    inputContent: base64Content,
    features: ['LABEL_DETECTION'],
  };

  const [operation] = await client.annotateVideo(request);
  console.log('Analyzing local video...');

  const [result] = await operation.promise();
  const labels = result.annotationResults[0].segmentLabelAnnotations;

  labels.forEach((label) => {
    console.log(`Label: ${label.entity.description}`);
  });
}

analyzeLocalVideo('./video.mp4');
```

---

## Pricing

### Stored Video Annotation Pricing

**Free Tier**: First **1,000 minutes per month** are free for all features.

**After Free Tier** (per minute):

| Feature | Price |
|---------|-------|
| Label Detection | $0.10 |
| Shot Detection | $0.05 (FREE when used with Label Detection) |
| Explicit Content Detection | $0.10 |
| Speech Transcription | $0.048 (en-US only) |
| Object Tracking | $0.15 |
| Text Detection | $0.15 |
| Logo Detection | $0.15 |
| Face Detection | $0.10 |
| Person Detection | $0.10 |
| Celebrity Recognition | ~~$0.10~~ **DEPRECATED** (unavailable since Sept 16, 2024) |

### Streaming Video Annotation Pricing

**Free Tier**: First **1,000 minutes per month** are free.

**After Free Tier** (per minute):

| Feature | Price |
|---------|-------|
| Label Detection | $0.12 |
| Shot Detection | $0.07 |
| Explicit Content Detection | $0.12 |
| Object Tracking | $0.17 |

### Free Tier

- **1,000 minutes per month** free for ALL features
- Applies to both stored and streaming video annotation
- Resets monthly
- No credit card required for free tier usage

### Pricing Notes

- Partial minutes are rounded up to the next full minute
- Volume discounts available for over 100,000 minutes/month (contact sales)
- Additional Google Cloud Platform resource costs may apply (e.g., Cloud Storage)

---

## Rate Limits and Quotas

### Default Quotas

- **Annotate Video Requests**: 60 requests per minute per project (default)
- **Backend Time**: 180 seconds per minute per project (allows ~3 parallel video analyses)
- **Video Size Limit**: 50GB maximum
- **Video Duration Limit**: 3 hours maximum
- **Videos Per Request**: 1 video

### Streaming Quotas

- **Streaming Requests**: 60 requests per minute per project
- **Concurrent Streams**: 5 concurrent streams per project

### Request a Quota Increase

If you need higher limits, request a quota increase through the [Google Cloud Console](https://console.cloud.google.com/iam-admin/quotas).

---

## Error Handling

### Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| 400 | INVALID_ARGUMENT | Invalid request parameters | Check request format and feature flags |
| 401 | UNAUTHENTICATED | Authentication failed | Verify credentials and API key |
| 403 | PERMISSION_DENIED | Insufficient permissions | Check service account IAM roles |
| 404 | NOT_FOUND | Video not found | Verify video URI and access permissions |
| 429 | RESOURCE_EXHAUSTED | Quota exceeded | Wait or request quota increase |
| 500 | INTERNAL | Server error | Retry with exponential backoff |
| 503 | UNAVAILABLE | Service unavailable | Retry with exponential backoff |

### Error Handling Example

```javascript
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

async function annotateWithErrorHandling(videoUri) {
  const client = new VideoIntelligenceServiceClient();

  try {
    const request = {
      inputUri: videoUri,
      features: ['LABEL_DETECTION'],
    };

    const [operation] = await client.annotateVideo(request);
    const [result] = await operation.promise();

    return result;
  } catch (error) {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    // Handle specific errors
    if (error.code === 404) {
      console.error('Video not found. Check the URI.');
    } else if (error.code === 403) {
      console.error('Permission denied. Check service account permissions.');
    } else if (error.code === 429) {
      console.error('Quota exceeded. Retry later or request increase.');
    } else if (error.code === 500 || error.code === 503) {
      console.error('Server error. Retry with exponential backoff.');
    }

    throw error;
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
async function annotateWithRetry(videoUri, maxRetries = 3) {
  const client = new VideoIntelligenceServiceClient();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const request = {
        inputUri: videoUri,
        features: ['LABEL_DETECTION'],
      };

      const [operation] = await client.annotateVideo(request);
      const [result] = await operation.promise();

      return result;
    } catch (error) {
      const isRetryable = [500, 503, 429].includes(error.code);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
```

---

## Best Practices

### 1. Use Cloud Storage for Large Files

For files larger than 10MB, upload to Google Cloud Storage and use GCS URIs rather than base64 encoding. This improves performance and reliability.

```javascript
// Good - Cloud Storage URI
{ inputUri: 'gs://my-bucket/large-video.mp4' }

// Avoid for large files - Base64 encoded
{ inputContent: base64EncodedVideoData }
```

### 2. Request Only Needed Features

Only request the features you actually need to minimize processing time and costs.

```javascript
// Good - Specific features
features: ['SHOT_CHANGE_DETECTION']

// Avoid - Unnecessary features
features: ['SHOT_CHANGE_DETECTION', 'LABEL_DETECTION', 'OBJECT_TRACKING']
```

### 3. Use Signed URLs for Temporary Access

When working with private Supabase Storage or Cloud Storage buckets, use signed URLs with appropriate expiration times.

```javascript
// Create 15-minute signed URL
const { data: signed } = await supabase.storage
  .from('bucket')
  .createSignedUrl('path/to/video.mp4', 60 * 15);
```

### 4. Handle Long-Running Operations

Video analysis can take time. Implement proper polling with exponential backoff or use webhooks if available.

```javascript
const [operation] = await client.annotateVideo(request);

// Option 1: Wait for completion
const [result] = await operation.promise();

// Option 2: Poll periodically
while (!operation.done) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  await operation.getMetadata();
}
```

### 5. Optimize Video Configuration

Configure video context parameters to optimize for your use case:

```javascript
const request = {
  inputUri: videoUri,
  features: ['LABEL_DETECTION'],
  videoContext: {
    labelDetectionConfig: {
      model: 'builtin/latest',
      stationaryCamera: false,
      labelDetectionMode: 'SHOT_MODE', // or 'FRAME_MODE', 'SHOT_AND_FRAME_MODE'
    },
  },
};
```

### 6. Monitor Costs

- Track minutes processed per feature
- Set up billing alerts in Google Cloud Console
- Use the free tier efficiently during development
- Consider batching video analysis during off-peak hours

### 7. Cache Results

Store annotation results in your database to avoid re-processing the same video multiple times.

```javascript
// Check if already processed
const existing = await db.getAnnotations(videoId);
if (existing) {
  return existing;
}

// Process and store
const result = await annotateVideo(videoUri);
await db.storeAnnotations(videoId, result);
```

### 8. Security Best Practices

- Never commit service account JSON keys to version control
- Use environment variables for credentials
- Implement least-privilege IAM permissions
- Rotate service account keys periodically
- Use signed URLs with minimal expiration times

---

## Resources

### Official Documentation

- [Video Intelligence API Documentation](https://cloud.google.com/video-intelligence/docs)
- [REST API Reference](https://cloud.google.com/video-intelligence/docs/reference/rest)
- [RPC API Reference](https://cloud.google.com/video-intelligence/docs/reference/rpc)
- [All Code Samples](https://cloud.google.com/video-intelligence/docs/samples)

### Client Libraries

- [Node.js Client Library](https://cloud.google.com/nodejs/docs/reference/video-intelligence/latest)
- [Python Client Library](https://cloud.google.com/python/docs/reference/videointelligence/latest)
- [Go Client Library](https://cloud.google.com/go/docs/reference/cloud.google.com/go/videointelligence/latest)
- [Java Client Library](https://cloud.google.com/java/docs/reference/google-cloud-video-intelligence/latest)

### Quickstart Guides

- [Quickstart: Annotate a video using client libraries](https://cloud.google.com/video-intelligence/docs/annotate-video-client-libraries)
- [Shot Change Detection Tutorial](https://cloud.google.com/video-intelligence/docs/shot-detection)
- [Using Video Intelligence API with Python (Colab)](https://codelabs.developers.google.com/codelabs/cloud-video-intelligence-python3)

### Additional Resources

- [Release Notes](https://cloud.google.com/video-intelligence/docs/release-notes)
- [Supported Video Formats](https://cloud.google.com/video-intelligence/docs/reference/rest/v1/videos/annotate)
- [IAM Permissions](https://cloud.google.com/video-intelligence/docs/access-control)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

### Community & Support

- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-video-intelligence)
- [Google Cloud Community](https://www.googlecloudcommunity.com/)
- [Issue Tracker](https://issuetracker.google.com/issues?q=componentid:187173)
- [Support Plans](https://cloud.google.com/support)

---

## Changelog

### Version 1.0 - October 10, 2025

- Initial comprehensive documentation
- Complete feature coverage for all 9 detection types
- Authentication setup guides
- Code examples for all major features
- Integration patterns for Supabase Storage
- Best practices and error handling
- Pricing and quota information
- Resource links and references

---

**Document Version**: 1.0
**Last Updated**: October 10, 2025
**API Version**: v1

---

This documentation provides comprehensive coverage of the Google Cloud Video Intelligence API, including authentication, all available features, detailed code examples (especially for shot change detection as used in your project), pricing, error handling, best practices, and useful resources.
