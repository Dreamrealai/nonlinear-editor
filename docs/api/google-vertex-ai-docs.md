# Google Vertex AI API Documentation

Comprehensive documentation for Google Vertex AI services including Veo video generation, Imagen image generation, Video Intelligence API, Gemini API, and authentication methods.

**Last Updated:** 2025-10-23
**Documentation Source:** Google Cloud Official Documentation

---

## Table of Contents

1. [Authentication](#authentication)
2. [Veo Video Generation API](#veo-video-generation-api)
3. [Imagen Image Generation API](#imagen-image-generation-api)
4. [Video Intelligence API](#video-intelligence-api)
5. [Gemini API (Vertex AI)](#gemini-api-vertex-ai)
6. [Rate Limits and Quotas](#rate-limits-and-quotas)
7. [Error Codes](#error-codes)

---

## Authentication

### Application Default Credentials (ADC)

Application Default Credentials (ADC) is a strategy used by the authentication libraries to automatically find credentials based on the application environment.

#### Search Order

ADC searches for credentials in the following order:

1. **GOOGLE_APPLICATION_CREDENTIALS environment variable**
2. **User credentials from gcloud CLI** (`gcloud auth application-default login`)
3. **Attached service account** (from metadata server)

#### GOOGLE_APPLICATION_CREDENTIALS Environment Variable

You can use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to provide the location of a credential JSON file. This JSON file can be:

- **Workforce Identity Federation credential configuration file**
- **Workload Identity Federation credential configuration file**
- **Service account key** (not recommended due to security risks)

#### User Credentials Location

When using `gcloud auth application-default login`, credentials are stored at:

- **Linux/macOS:** `$HOME/.config/gcloud/application_default_credentials.json`
- **Windows:** `%APPDATA%\gcloud\application_default_credentials.json`

#### Service Account Authentication

Using credentials from the attached service account is the preferred method for production environments on Google Cloud:

1. Create a user-managed service account
2. Grant the service account least privileged IAM roles
3. Attach the service account to the resource where your code runs

#### OAuth Scopes

By default, ADC tokens include the cloud-wide scope:

- `https://www.googleapis.com/auth/cloud-platform`

For services outside of Google Cloud (like Google Drive), create an OAuth Client ID and specify custom scopes.

#### Required Authorization Scope

Most Vertex AI services require:

```
https://www.googleapis.com/auth/cloud-platform
```

---

## Veo Video Generation API

Veo is Google's video generation model that creates videos from text prompts or image prompts.

### Base Endpoint

```
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:predictLongRunning
```

### Supported Models

- `veo-2.0-generate-001`
- `veo-2.0-generate-exp`
- `veo-2.0-generate-preview`
- `veo-3.0-generate-001`
- `veo-3.0-fast-generate-001`
- `veo-3.1-generate-preview` (Preview)
- `veo-3.1-fast-generate-preview` (Preview)

### HTTP Request Method

```
POST
```

### Request Structure

```json
{
  "instances": [
    {
      "prompt": string,
      "image": {
        "bytesBase64Encoded": string,
        "gcsUri": string,
        "mimeType": string
      },
      "lastFrame": {
        "bytesBase64Encoded": string,
        "gcsUri": string,
        "mimeType": string
      },
      "video": {
        "bytesBase64Encoded": string,
        "gcsUri": string,
        "mimeType": string
      },
      "mask": {
        "bytesBase64Encoded": string,
        "gcsUri": string,
        "mimeType": string,
        "maskMode": string
      },
      "referenceImages": [
        {
          "image": {
            "bytesBase64Encoded": string,
            "gcsUri": string,
            "mimeType": string
          },
          "referenceType": string
        }
      ]
    }
  ],
  "parameters": {
    "aspectRatio": string,
    "compressionQuality": string,
    "durationSeconds": integer,
    "enhancePrompt": boolean,
    "generateAudio": boolean,
    "negativePrompt": string,
    "personGeneration": string,
    "resizeMode": string,
    "resolution": string,
    "sampleCount": integer,
    "seed": uint32,
    "storageUri": string
  }
}
```

### Instances Parameters

| Parameter                       | Type   | Required                    | Description                                                                                                                                           |
| ------------------------------- | ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`                        | string | Required for text-to-video  | Text string to guide video generation                                                                                                                 |
| `image`                         | object | Optional                    | Input image for image-to-video generation                                                                                                             |
| `lastFrame`                     | object | Optional                    | Image of the last frame for video fill (Preview: veo-2.0-generate-001, veo-3.0-generate-exp, veo-3.1-generate-preview, veo-3.1-fast-generate-preview) |
| `video`                         | object | Optional                    | Veo generated video to extend in length (Preview: veo-2.0-generate-001, veo-3.0-generate-exp)                                                         |
| `mask`                          | object | Optional                    | Mask image to add/remove objects from video (Preview: veo-2.0-generate-preview)                                                                       |
| `referenceImages`               | array  | Optional                    | List of up to 3 asset images or 1 style image (Preview: veo-2.0-generate-exp, veo-3.1-generate-preview)                                               |
| `referenceImages.image`         | object | Optional                    | Contains reference images for subject matter input                                                                                                    |
| `referenceImages.referenceType` | string | Required in referenceImages | Type of reference: "asset" or "style"                                                                                                                 |
| `bytesBase64Encoded`            | string | Union field                 | Base64-encoded string of image or video                                                                                                               |
| `gcsUri`                        | string | Union field                 | Cloud Storage bucket URI                                                                                                                              |
| `mimeType`                      | string | Required                    | MIME type of the image or video                                                                                                                       |

### Parameters

| Parameter            | Type    | Default            | Description                                                                     |
| -------------------- | ------- | ------------------ | ------------------------------------------------------------------------------- |
| `aspectRatio`        | string  | "16:9"             | Aspect ratio: "16:9" or "9:16"                                                  |
| `compressionQuality` | string  | "optimized"        | Compression quality: "optimized" or "lossless"                                  |
| `durationSeconds`    | integer | 8                  | Video length in seconds. Veo 2: 5-8, Veo 3: 4, 6, or 8. With referenceImages: 8 |
| `enhancePrompt`      | boolean | true               | Use Gemini to enhance prompts                                                   |
| `generateAudio`      | boolean | Required for Veo 3 | Generate audio for the video                                                    |
| `negativePrompt`     | string  | -                  | Text describing what to discourage in generation                                |
| `personGeneration`   | string  | "allow_adult"      | Safety setting: "allow_adult" or "dont_allow"                                   |
| `resizeMode`         | string  | "pad"              | Veo 3 image-to-video only: "pad" or "crop"                                      |
| `resolution`         | string  | "720p"             | Veo 3 only: "720p" or "1080p"                                                   |
| `sampleCount`        | integer | 1                  | Number of output videos: 1-4                                                    |
| `seed`               | uint32  | -                  | Random seed for deterministic output: 0-4,294,967,295                           |
| `storageUri`         | string  | -                  | Cloud Storage bucket URI for output (gs://BUCKET_NAME/SUBDIRECTORY)             |

### Supported MIME Types

**Images:**

- `image/jpeg`
- `image/png`
- `image/webp`

**Videos:**

- `video/mov`
- `video/mpeg`
- `video/mp4`
- `video/mpg`
- `video/avi`
- `video/wmv`
- `video/mpegps`
- `video/flv`

### Response Body (Generate Video Request)

```json
{
  "name": string
}
```

| Field  | Description                                       |
| ------ | ------------------------------------------------- |
| `name` | Full operation name of the long-running operation |

### Long-Running Operation Polling

#### Endpoint

```
POST https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation
```

#### Request Body

```json
{
  "operationName": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
}
```

#### Response Body

```json
{
  "name": string,
  "done": boolean,
  "response": {
    "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
    "raiMediaFilteredCount": integer,
    "videos": [
      {
        "gcsUri": string,
        "mimeType": string
      }
    ]
  }
}
```

| Field                   | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `name`                  | Full operation name                                     |
| `done`                  | Boolean indicating if operation is complete             |
| `raiMediaFilteredCount` | Count of videos filtered due to responsible AI policies |
| `videos`                | Array of generated video objects                        |
| `gcsUri`                | Cloud Storage URI of generated video                    |
| `mimeType`              | MIME type of generated video                            |

### Example Request (Text-to-Video)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001:predictLongRunning \
  -d '{
    "instances": [
      {
        "prompt": "A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting"
      }
    ],
    "parameters": {
      "storageUri": "gs://video-bucket/output/",
      "sampleCount": 2,
      "durationSeconds": 8,
      "aspectRatio": "16:9"
    }
  }'
```

### Example Request (Image-to-Video)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001:predictLongRunning \
  -d '{
    "instances": [
      {
        "prompt": "Camera zooms into the city skyline",
        "image": {
          "bytesBase64Encoded": "BASE64_ENCODED_IMAGE",
          "mimeType": "image/jpeg"
        }
      }
    ],
    "parameters": {
      "storageUri": "gs://video-bucket/output/",
      "sampleCount": 1,
      "resizeMode": "pad"
    }
  }'
```

---

## Imagen Image Generation API

Imagen is Google's image generation model that creates high-quality images from text prompts.

### Base Endpoint

```
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_VERSION:predict
```

### Supported Models

- `imagen-4.0-generate-001`
- `imagen-4.0-fast-generate-001`
- `imagen-4.0-ultra-generate-001`
- `imagen-3.0-generate-002`
- `imagen-3.0-generate-001`
- `imagen-3.0-fast-generate-001`
- `imagen-3.0-capability-001`
- `imagegeneration@006`
- `imagegeneration@005`
- `imagegeneration@002`

### HTTP Request Method

```
POST
```

### Request Structure (Generate Images)

```json
{
  "instances": [
    {
      "prompt": string
    }
  ],
  "parameters": {
    "sampleCount": integer,
    "addWatermark": boolean,
    "aspectRatio": string,
    "enhancePrompt": boolean,
    "language": string,
    "negativePrompt": string,
    "outputOptions": {
      "mimeType": string,
      "compressionQuality": integer
    },
    "personGeneration": string,
    "safetySetting": string,
    "sampleImageSize": string,
    "seed": uint32,
    "storageUri": string
  }
}
```

### Parameters

| Parameter                          | Type    | Default                  | Description                                                                                     |
| ---------------------------------- | ------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| `prompt`                           | string  | Required                 | Text prompt for the image                                                                       |
| `addWatermark`                     | boolean | true                     | Add invisible SynthID watermark (except imagegeneration@002, @005)                              |
| `aspectRatio`                      | string  | "1:1"                    | Aspect ratio: "1:1", "3:4", "4:3", "16:9", "9:16"                                               |
| `enhancePrompt`                    | boolean | true                     | Use LLM-based prompt rewriting for higher quality                                               |
| `language`                         | string  | "en"                     | Language code: "auto", "en", "zh", "zh-CN", "zh-TW", "hi", "ja", "ko", "pt", "es"               |
| `negativePrompt`                   | string  | -                        | Description to discourage in images (not supported by imagen-3.0-generate-002+)                 |
| `outputOptions.mimeType`           | string  | "image/png"              | Output format: "image/png" or "image/jpeg"                                                      |
| `outputOptions.compressionQuality` | integer | 75                       | JPEG compression level: 0-100                                                                   |
| `personGeneration`                 | string  | "allow_adult"            | Person safety: "dont_allow", "allow_adult", "allow_all"                                         |
| `safetySetting`                    | string  | "block_medium_and_above" | Safety filter: "block_low_and_above", "block_medium_and_above", "block_only_high", "block_none" |
| `sampleCount`                      | integer | 4                        | Number of images to generate: 1-8 (imagegeneration@002), 1-4 (others)                           |
| `sampleImageSize`                  | string  | "1K"                     | Output resolution: "1K" or "2K"                                                                 |
| `seed`                             | uint32  | -                        | Random seed for deterministic output (not available with addWatermark=true)                     |
| `storageUri`                       | string  | -                        | Cloud Storage URI to store output images                                                        |

### Request Structure (Upscale Images)

```json
{
  "instances": [
    {
      "prompt": "",
      "image": {
        "bytesBase64Encoded": string,
        "gcsUri": string
      }
    }
  ],
  "parameters": {
    "sampleCount": 1,
    "mode": "upscale",
    "upscaleConfig": {
      "upscaleFactor": string
    },
    "outputOptions": {
      "mimeType": string,
      "compressionQuality": integer
    },
    "storageUri": string
  }
}
```

### Upscale Parameters

| Parameter                     | Type   | Required | Description                  |
| ----------------------------- | ------ | -------- | ---------------------------- |
| `mode`                        | string | Required | Must be "upscale"            |
| `upscaleConfig.upscaleFactor` | string | Required | Upscale factor: "x2" or "x4" |

### Response Body

```json
{
  "predictions": [
    {
      "bytesBase64Encoded": string,
      "mimeType": string,
      "raiFilteredReason": string,
      "safetyAttributes": {
        "categories": [string],
        "scores": [number]
      }
    }
  ]
}
```

| Field                         | Description                                |
| ----------------------------- | ------------------------------------------ |
| `bytesBase64Encoded`          | Base64 encoded generated image             |
| `mimeType`                    | MIME type of generated image               |
| `raiFilteredReason`           | Responsible AI filter reason (if filtered) |
| `safetyAttributes.categories` | Safety attribute names                     |
| `safetyAttributes.scores`     | Safety attribute scores                    |

### Example Request (Generate Images)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict \
  -d '{
    "instances": [
      {
        "prompt": "A serene mountain landscape at sunset with vibrant colors"
      }
    ],
    "parameters": {
      "sampleCount": 2,
      "aspectRatio": "16:9",
      "safetySetting": "block_medium_and_above",
      "personGeneration": "allow_adult"
    }
  }'
```

### Example Request (Upscale Image)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/imagegeneration@002:predict \
  -d '{
    "instances": [
      {
        "prompt": "",
        "image": {
          "gcsUri": "gs://my-bucket/input-image.png"
        }
      }
    ],
    "parameters": {
      "sampleCount": 1,
      "mode": "upscale",
      "upscaleConfig": {
        "upscaleFactor": "x4"
      }
    }
  }'
```

---

## Video Intelligence API

The Video Intelligence API detects objects, explicit content, and scene changes in videos. It also specifies the region for annotation and transcribes speech to text.

### Service Endpoint

```
https://videointelligence.googleapis.com
```

### Discovery Document

```
https://videointelligence.googleapis.com/$discovery/rest?version=v1
```

### Main Method: videos.annotate

Performs asynchronous video annotation. Progress and results can be retrieved through the `google.longrunning.Operations` interface.

#### HTTP Request

```
POST https://videointelligence.googleapis.com/v1/videos:annotate
```

#### Request Body

```json
{
  "inputUri": string,
  "inputContent": string,
  "features": [
    enum (Feature)
  ],
  "videoContext": {
    object (VideoContext)
  },
  "outputUri": string,
  "locationId": string
}
```

#### Request Parameters

| Parameter      | Type           | Required | Description                                                                     |
| -------------- | -------------- | -------- | ------------------------------------------------------------------------------- |
| `inputUri`     | string         | Optional | Cloud Storage URI: `gs://bucket-id/object-id`. Supports wildcards: '\*' and '?' |
| `inputContent` | string (bytes) | Optional | Base64-encoded video data bytes. Use if inputUri not set                        |
| `features`     | array(enum)    | Required | Requested video annotation features                                             |
| `videoContext` | object         | Optional | Additional context and feature-specific parameters                              |
| `outputUri`    | string         | Optional | Cloud Storage URI for JSON output: `gs://bucket-id/object-id`                   |
| `locationId`   | string         | Optional | Cloud region: `us-east1`, `us-west1`, `europe-west1`, `asia-east1`              |

### Features

| Feature                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `FEATURE_UNSPECIFIED`        | Unspecified                                         |
| `LABEL_DETECTION`            | Label detection (detect objects like dog or flower) |
| `SHOT_CHANGE_DETECTION`      | Shot change detection                               |
| `EXPLICIT_CONTENT_DETECTION` | Explicit content detection                          |
| `FACE_DETECTION`             | Human face detection                                |
| `SPEECH_TRANSCRIPTION`       | Speech transcription                                |
| `TEXT_DETECTION`             | OCR text detection and tracking                     |
| `OBJECT_TRACKING`            | Object detection and tracking                       |
| `LOGO_RECOGNITION`           | Logo detection, tracking, and recognition           |
| `PERSON_DETECTION`           | Person detection                                    |

### VideoContext Object

```json
{
  "segments": [
    {
      "startTimeOffset": string,
      "endTimeOffset": string
    }
  ],
  "labelDetectionConfig": {
    "labelDetectionMode": enum,
    "stationaryCamera": boolean,
    "model": string,
    "frameConfidenceThreshold": number,
    "videoConfidenceThreshold": number
  },
  "shotChangeDetectionConfig": {
    "model": string
  },
  "explicitContentDetectionConfig": {
    "model": string
  },
  "faceDetectionConfig": {
    "model": string,
    "includeBoundingBoxes": boolean,
    "includeAttributes": boolean
  },
  "speechTranscriptionConfig": {
    "languageCode": string,
    "maxAlternatives": integer,
    "filterProfanity": boolean,
    "speechContexts": [
      {
        "phrases": [string]
      }
    ],
    "enableAutomaticPunctuation": boolean,
    "audioTracks": [integer],
    "enableSpeakerDiarization": boolean,
    "diarizationSpeakerCount": integer,
    "enableWordConfidence": boolean
  },
  "textDetectionConfig": {
    "languageHints": [string],
    "model": string
  },
  "personDetectionConfig": {
    "includeBoundingBoxes": boolean,
    "includePoseLandmarks": boolean,
    "includeAttributes": boolean
  },
  "objectTrackingConfig": {
    "model": string
  }
}
```

### LabelDetectionConfig

| Parameter                  | Type    | Default          | Description                                                     |
| -------------------------- | ------- | ---------------- | --------------------------------------------------------------- |
| `labelDetectionMode`       | enum    | SHOT_MODE        | Mode: SHOT_MODE, FRAME_MODE, SHOT_AND_FRAME_MODE                |
| `stationaryCamera`         | boolean | false            | Whether camera is stationary (improves moving object detection) |
| `model`                    | string  | "builtin/stable" | Model: "builtin/stable" or "builtin/latest"                     |
| `frameConfidenceThreshold` | number  | 0.4              | Frame-level filtering threshold: 0.1-0.9                        |
| `videoConfidenceThreshold` | number  | 0.3              | Video-level filtering threshold: 0.1-0.9                        |

### SpeechTranscriptionConfig

| Parameter                    | Type           | Required | Description                                     |
| ---------------------------- | -------------- | -------- | ----------------------------------------------- |
| `languageCode`               | string         | Required | BCP-47 language tag (e.g., "en-US")             |
| `maxAlternatives`            | integer        | Optional | Max recognition hypotheses: 0-30                |
| `filterProfanity`            | boolean        | Optional | Filter profanities with asterisks               |
| `speechContexts`             | array          | Optional | Context hints for speech recognition            |
| `enableAutomaticPunctuation` | boolean        | Optional | Add punctuation to results                      |
| `audioTracks`                | array(integer) | Optional | Specify up to 2 audio tracks (default: track 0) |
| `enableSpeakerDiarization`   | boolean        | Optional | Detect speakers in conversation                 |
| `diarizationSpeakerCount`    | integer        | Optional | Estimated number of speakers (default: 2)       |
| `enableWordConfidence`       | boolean        | Optional | Include word-level confidence                   |

### FaceDetectionConfig

| Parameter              | Type    | Description                                        |
| ---------------------- | ------- | -------------------------------------------------- |
| `model`                | string  | Model: "builtin/stable" or "builtin/latest"        |
| `includeBoundingBoxes` | boolean | Include bounding boxes in output                   |
| `includeAttributes`    | boolean | Detect face attributes (glasses, mouth_open, etc.) |

### PersonDetectionConfig

| Parameter              | Type    | Description                                                       |
| ---------------------- | ------- | ----------------------------------------------------------------- |
| `includeBoundingBoxes` | boolean | Include bounding boxes in output                                  |
| `includePoseLandmarks` | boolean | Enable pose landmarks detection                                   |
| `includeAttributes`    | boolean | Detect person attributes (cloth color, type, pattern, hair, etc.) |

### TextDetectionConfig

| Parameter       | Type          | Description                                 |
| --------------- | ------------- | ------------------------------------------- |
| `languageHints` | array(string) | BCP-47 language hints for better detection  |
| `model`         | string        | Model: "builtin/stable" or "builtin/latest" |

### ObjectTrackingConfig

| Parameter | Type   | Description                                 |
| --------- | ------ | ------------------------------------------- |
| `model`   | string | Model: "builtin/stable" or "builtin/latest" |

### Response Body

If successful, returns an instance of `Operation` with:

- `Operation.metadata`: Contains `AnnotateVideoProgress` (progress)
- `Operation.response`: Contains `AnnotateVideoResponse` (results)

### Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://videointelligence.googleapis.com/v1/videos:annotate \
  -d '{
    "inputUri": "gs://my-bucket/my-video.mp4",
    "features": ["LABEL_DETECTION", "SHOT_CHANGE_DETECTION"],
    "videoContext": {
      "labelDetectionConfig": {
        "labelDetectionMode": "SHOT_AND_FRAME_MODE"
      }
    },
    "locationId": "us-east1"
  }'
```

### Long-Running Operations

#### Get Operation Status

```
GET https://videointelligence.googleapis.com/v1/{name=projects/*/locations/*/operations/*}
```

#### Cancel Operation

```
POST https://videointelligence.googleapis.com/v1/{name=projects/*/locations/*/operations/*}:cancel
```

#### Delete Operation

```
DELETE https://videointelligence.googleapis.com/v1/{name=projects/*/locations/*/operations/*}
```

#### List Operations

```
GET https://videointelligence.googleapis.com/v1/{name=projects/*/locations/*}/operations
```

---

## Gemini API (Vertex AI)

The Gemini API in Vertex AI provides multimodal content generation capabilities supporting text, audio, video, and images.

### Base Endpoint

```
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:generateContent
```

### Streaming Endpoint

```
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:streamGenerateContent
```

### Supported Models

All Gemini models support content generation, including:

- gemini-2.0-flash
- gemini-2.0-flash-lite
- gemini-2.5-flash
- And other Gemini model versions

### HTTP Request Method

```
POST
```

### Request Structure

```json
{
  "cachedContent": string,
  "contents": [
    {
      "role": string,
      "parts": [
        {
          "text": string,
          "inlineData": {
            "mimeType": string,
            "data": string
          },
          "fileData": {
            "mimeType": string,
            "fileUri": string
          },
          "videoMetadata": {
            "startOffset": {
              "seconds": integer,
              "nanos": integer
            },
            "endOffset": {
              "seconds": integer,
              "nanos": integer
            },
            "fps": double
          }
        }
      ]
    }
  ],
  "systemInstruction": {
    "role": string,
    "parts": [
      {
        "text": string
      }
    ]
  },
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": string,
          "description": string,
          "parameters": object
        }
      ]
    }
  ],
  "safetySettings": [
    {
      "category": enum,
      "threshold": enum
    }
  ],
  "generationConfig": {
    "temperature": number,
    "topP": number,
    "topK": number,
    "candidateCount": integer,
    "maxOutputTokens": integer,
    "presencePenalty": float,
    "frequencyPenalty": float,
    "stopSequences": [string],
    "responseMimeType": string,
    "responseSchema": object,
    "seed": integer,
    "responseLogprobs": boolean,
    "logprobs": integer,
    "audioTimestamp": boolean,
    "thinkingConfig": {
      "thinkingBudget": integer
    }
  },
  "labels": {
    string: string
  }
}
```

### Request Parameters

| Parameter           | Type   | Required | Description                                                                                      |
| ------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| `cachedContent`     | string | Optional | Name of cached content: `projects/{project}/locations/{location}/cachedContents/{cachedContent}` |
| `contents`          | array  | Required | Content of current conversation with model                                                       |
| `systemInstruction` | object | Optional | Instructions to steer model performance (gemini-2.0+)                                            |
| `tools`             | array  | Optional | Function calling tools for external system interaction                                           |
| `toolConfig`        | object | Optional | Function calling configuration                                                                   |
| `safetySettings`    | array  | Optional | Safety content blocking settings                                                                 |
| `generationConfig`  | object | Optional | Generation configuration settings                                                                |
| `labels`            | object | Optional | Metadata key-value pairs                                                                         |

### Contents Structure

| Parameter | Type   | Description                                |
| --------- | ------ | ------------------------------------------ |
| `role`    | string | Entity creating message: "user" or "model" |
| `parts`   | array  | Ordered parts making up a single message   |

### Parts Structure

| Parameter             | Type   | Description                                       |
| --------------------- | ------ | ------------------------------------------------- |
| `text`                | string | Text prompt or code snippet                       |
| `inlineData.mimeType` | string | MIME type of inline data                          |
| `inlineData.data`     | string | Base64 encoding of image/PDF/video (max 20MB)     |
| `fileData.mimeType`   | string | MIME type of file                                 |
| `fileData.fileUri`    | string | Cloud Storage URI, HTTP URL, or YouTube video URL |
| `functionCall`        | object | Predicted function call                           |
| `functionResponse`    | object | Result output of function call                    |
| `videoMetadata`       | object | Video input metadata (start/end offset, fps)      |

### Supported MIME Types

**Application:**

- `application/pdf`

**Audio:**

- `audio/mpeg`
- `audio/mp3`
- `audio/wav`
- Max length: 8.4 hours (gemini-2.0-flash, gemini-2.0-flash-lite)

**Image:**

- `image/png`
- `image/jpeg`
- `image/webp`
- No resolution limit
- Up to 3000 images via inlineData (gemini-2.0-flash, gemini-2.0-flash-lite)

**Text:**

- `text/plain` (UTF-8 encoded, counts toward token limit)

**Video:**

- `video/mov`
- `video/mpeg`
- `video/mp4`
- `video/mpg`
- `video/avi`
- `video/wmv`
- `video/mpegps`
- `video/flv`
- Max length: 1 hour without audio (gemini-2.0-flash, gemini-2.0-flash-lite)

### Safety Settings

| Parameter   | Type | Description                                                                                                                            |
| ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `category`  | enum | Safety category: HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_DANGEROUS_CONTENT |
| `threshold` | enum | Blocking threshold: OFF, BLOCK_NONE, BLOCK_LOW_AND_ABOVE, BLOCK_MEDIUM_AND_ABOVE, BLOCK_ONLY_HIGH                                      |
| `method`    | enum | Threshold method: HARM_BLOCK_METHOD_UNSPECIFIED, SEVERITY, PROBABILITY                                                                 |

### Generation Config

| Parameter                       | Type    | Default      | Range        | Description                                                      |
| ------------------------------- | ------- | ------------ | ------------ | ---------------------------------------------------------------- |
| `temperature`                   | float   | 1.0          | 0.0-2.0      | Randomness in token selection (lower = more deterministic)       |
| `topP`                          | float   | 0.95         | 0.0-1.0      | Nucleus sampling threshold                                       |
| `topK`                          | number  | -            | -            | Top-K sampling parameter                                         |
| `candidateCount`                | integer | 1            | 1-8          | Number of response variations                                    |
| `maxOutputTokens`               | integer | -            | -            | Maximum tokens in response                                       |
| `presencePenalty`               | float   | 0            | -2.0 to <2.0 | Penalty for tokens that already appear                           |
| `frequencyPenalty`              | float   | 0            | -2.0 to <2.0 | Penalty for repeatedly appearing tokens                          |
| `stopSequences`                 | array   | -            | Max 5        | List of strings to stop generation                               |
| `responseMimeType`              | string  | "text/plain" | -            | Response format: "application/json", "text/plain", "text/x.enum" |
| `responseSchema`                | object  | -            | -            | Schema for generated output                                      |
| `seed`                          | integer | random       | -            | Fixed seed for deterministic output                              |
| `responseLogprobs`              | boolean | false        | -            | Return log probabilities of chosen tokens                        |
| `logprobs`                      | integer | -            | 1-20         | Number of top candidate tokens to return log probs for           |
| `audioTimestamp`                | boolean | -            | -            | Enable timestamp understanding for audio (Preview)               |
| `thinkingConfig.thinkingBudget` | integer | auto         | Up to 8,192  | Token budget for model thinking (Gemini 2.5)                     |

### Response Body

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": string
          }
        ]
      },
      "finishReason": enum,
      "safetyRatings": [
        {
          "category": enum,
          "probability": enum,
          "blocked": boolean
        }
      ],
      "citationMetadata": {
        "citations": [
          {
            "startIndex": integer,
            "endIndex": integer,
            "uri": string,
            "title": string,
            "license": string,
            "publicationDate": {
              "year": integer,
              "month": integer,
              "day": integer
            }
          }
        ]
      },
      "avgLogprobs": double,
      "logprobsResult": {
        "topCandidates": [
          {
            "candidates": [
              {
                "token": string,
                "logProbability": float
              }
            ]
          }
        ],
        "chosenCandidates": [
          {
            "token": string,
            "logProbability": float
          }
        ]
      }
    }
  ],
  "usageMetadata": {
    "promptTokenCount": integer,
    "candidatesTokenCount": integer,
    "totalTokenCount": integer
  },
  "modelVersion": string
}
```

### Finish Reasons

| Reason                                  | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| `FINISH_REASON_STOP`                    | Natural stop point or provided stop sequence   |
| `FINISH_REASON_MAX_TOKENS`              | Maximum token limit reached                    |
| `FINISH_REASON_SAFETY`                  | Response flagged for safety reasons            |
| `FINISH_REASON_RECITATION`              | Response flagged for unauthorized citations    |
| `FINISH_REASON_BLOCKLIST`               | Response contains blocked terms                |
| `FINISH_REASON_PROHIBITED_CONTENT`      | Response flagged for prohibited content (CSAM) |
| `FINISH_REASON_SPII`                    | Response flagged for sensitive PII             |
| `FINISH_REASON_MALFORMED_FUNCTION_CALL` | Malformed function call                        |
| `FINISH_REASON_OTHER`                   | Other reasons                                  |
| `FINISH_REASON_UNSPECIFIED`             | Unspecified                                    |

### Example Request (Text Generation)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "How does AI work?"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "topP": 0.95,
      "maxOutputTokens": 1024
    }
  }'
```

### Example Request (Multimodal)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "What is shown in this image?"
          },
          {
            "fileData": {
              "fileUri": "gs://cloud-samples-data/generative-ai/image/scones.jpg",
              "mimeType": "image/jpeg"
            }
          }
        ]
      }
    ]
  }'
```

### Example Request (Streaming)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/gemini-2.5-flash:streamGenerateContent \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Why is the sky blue?"
          }
        ]
      }
    ]
  }'
```

---

## Rate Limits and Quotas

### General Quotas

Rate limits and quotas vary by:

- Model
- Region
- Project quota allocation
- Service tier

### Common Limits

**Veo Video Generation:**

- Request size: Varies by model
- Concurrent long-running operations: Check project quota
- Video generation time: Several minutes depending on duration and quality

**Imagen Image Generation:**

- Request size: 10 MB for base images
- Concurrent requests: Based on project quota
- Image generation time: Seconds

**Video Intelligence API:**

- Video size: Varies by feature
- Concurrent operations: Based on project quota
- Processing time: Proportional to video length

**Gemini API:**

- Requests per minute (RPM): Varies by model
- Tokens per minute (TPM): Varies by model
- Concurrent requests: Based on model tier

### Quota Management

To check and manage quotas:

1. Visit the Google Cloud Console
2. Navigate to IAM & Admin > Quotas
3. Filter by service (Vertex AI, Video Intelligence API)
4. Request quota increases if needed

---

## Error Codes

### Common HTTP Status Codes

| Status Code | Description           | Common Causes                                 |
| ----------- | --------------------- | --------------------------------------------- |
| 200         | Success               | Request completed successfully                |
| 400         | Bad Request           | Invalid request parameters, malformed JSON    |
| 401         | Unauthorized          | Missing or invalid authentication credentials |
| 403         | Forbidden             | Insufficient permissions, service not enabled |
| 404         | Not Found             | Resource or endpoint not found                |
| 429         | Too Many Requests     | Rate limit exceeded, quota exceeded           |
| 500         | Internal Server Error | Server-side error                             |
| 503         | Service Unavailable   | Service temporarily unavailable               |

### Google RPC Error Codes

| Code                  | Description                                      | HTTP Mapping              |
| --------------------- | ------------------------------------------------ | ------------------------- |
| `INVALID_ARGUMENT`    | Invalid request parameters                       | 400 Bad Request           |
| `FAILED_PRECONDITION` | Precondition not met (e.g., service not enabled) | 400 Bad Request           |
| `OUT_OF_RANGE`        | Parameter value out of valid range               | 400 Bad Request           |
| `UNAUTHENTICATED`     | Missing or invalid authentication                | 401 Unauthorized          |
| `PERMISSION_DENIED`   | Insufficient permissions                         | 403 Forbidden             |
| `NOT_FOUND`           | Resource not found                               | 404 Not Found             |
| `ALREADY_EXISTS`      | Resource already exists                          | 409 Conflict              |
| `RESOURCE_EXHAUSTED`  | Quota exceeded                                   | 429 Too Many Requests     |
| `CANCELLED`           | Request cancelled by client                      | 499 Client Closed Request |
| `UNKNOWN`             | Unknown server error                             | 500 Internal Server Error |
| `INTERNAL`            | Internal server error                            | 500 Internal Server Error |
| `UNAVAILABLE`         | Service unavailable                              | 503 Service Unavailable   |
| `DEADLINE_EXCEEDED`   | Request timeout                                  | 504 Gateway Timeout       |

### Veo-Specific Error Codes

| Error                       | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `raiMediaFilteredCount > 0` | Videos filtered due to Responsible AI policies |
| `raiMediaFilteredReasons`   | Lists specific reasons for filtering           |

### Imagen-Specific Error Codes

| Error                    | Description                                   |
| ------------------------ | --------------------------------------------- |
| `raiFilteredReason`      | Image filtered due to Responsible AI policies |
| Safety filter categories | Blocks for specific content types             |

### Video Intelligence Error Codes

| Error               | Description                              |
| ------------------- | ---------------------------------------- |
| `INVALID_ARGUMENT`  | Invalid Cloud Storage URI format         |
| `NOT_FOUND`         | Video file not found                     |
| `PERMISSION_DENIED` | Insufficient permissions to access video |

### Gemini-Specific Error Codes

| Error                              | Description                          |
| ---------------------------------- | ------------------------------------ |
| `FINISH_REASON_SAFETY`             | Content filtered for safety          |
| `FINISH_REASON_RECITATION`         | Content filtered for citations       |
| `FINISH_REASON_PROHIBITED_CONTENT` | Content flagged as prohibited (CSAM) |
| `FINISH_REASON_SPII`               | Content contains sensitive PII       |

### Handling Errors

**Best Practices:**

1. **Implement exponential backoff** for retryable errors (429, 500, 503)
2. **Validate request parameters** before sending
3. **Check authentication tokens** before API calls
4. **Enable appropriate APIs** in Google Cloud Console
5. **Monitor quota usage** proactively
6. **Log error details** for debugging
7. **Handle long-running operations** with proper polling and timeouts

**Example Error Response:**

```json
{
  "error": {
    "code": 400,
    "message": "Invalid request: missing required field 'prompt'",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.BadRequest",
        "fieldViolations": [
          {
            "field": "prompt",
            "description": "Required field is missing"
          }
        ]
      }
    ]
  }
}
```

---

## Additional Resources

### Documentation Links

- **Veo on Vertex AI:** https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
- **Imagen on Vertex AI:** https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview
- **Video Intelligence API:** https://cloud.google.com/video-intelligence/docs
- **Gemini API:** https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
- **Authentication:** https://cloud.google.com/docs/authentication

### Client Libraries

Google provides client libraries for:

- Python
- Java
- Node.js
- Go
- C#
- Ruby
- PHP

### Support

- **Google Cloud Support:** https://cloud.google.com/support
- **Stack Overflow:** Tag questions with `google-cloud-platform`
- **Issue Tracker:** https://issuetracker.google.com/

---

## Changelog

| Date       | Changes                           |
| ---------- | --------------------------------- |
| 2025-10-23 | Initial documentation compilation |

---

**Note:** This documentation is compiled from official Google Cloud documentation. Always refer to the official documentation for the most up-to-date information and changes.
