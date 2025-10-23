# Secure Storyboard - Code Architecture

## Overview
Secure Storyboard is a Netlify-hosted application that generates image prompts for visual storyboards using Google's Gemini AI model.

## Directory Structure

```
SecureStoryboard/
├── public/                    # Static files served directly
│   ├── index.html            # Main application interface
│   ├── login.html            # Login page (authentication currently disabled)
│   ├── service-starting.html # Cold start waiting page
│   ├── style.css             # Application styles
│   └── js/
│       ├── api.js            # API communication layer
│       ├── main.js           # Main application logic
│       └── ui.js             # UI manipulation functions
│
├── netlify/functions/        # Serverless functions
│   ├── generate-prompts.js   # Main prompt generation endpoint
│   ├── generate-prompts-direct.js  # Direct two-step generation
│   ├── generate-prompts-gateway.js # Background job gateway
│   ├── generate-prompts-start.js   # Background job processor
│   ├── generate-prompts-check.js   # Job status checker
│   ├── generate-images.js    # Image generation with Imagen
│   ├── chat.js               # Chat functionality
│   ├── auth.js               # Authentication (currently disabled)
│   ├── get-tool-instructions.js # Tool instructions endpoint
│   └── utils/
│       ├── api-helpers.js    # Common API utilities
│       ├── job-storage.js    # Job persistence layer
│       └── mime-types.js     # MIME type detection
│
├── src/
│   └── tool-instructions.js  # AI prompt instructions
│
└── Configuration files
    ├── netlify.toml          # Netlify configuration
    ├── package.json          # Node.js dependencies
    └── .env                  # Environment variables (local only)
```

## Key Components

### Frontend (public/)
- **index.html**: Main UI with file upload, text input, and results display
- **api.js**: Handles all API calls with retry logic and error handling
- **main.js**: Core application logic, handles user interactions
- **ui.js**: DOM manipulation and UI state management

### Backend (netlify/functions/)

#### Prompt Generation Endpoints
- **generate-prompts.js**: Simple proxy to Gemini API
- **generate-prompts-direct.js**: Two-step generation (initial + refinement)
- **generate-prompts-gateway.js**: Creates background jobs for long operations
- **generate-prompts-start.js**: Background function that processes jobs
- **generate-prompts-check.js**: Checks job status

#### Other Functions
- **generate-images.js**: Generates images using Google's Imagen API
- **chat.js**: Provides chat functionality with Gemini
- **auth.js**: Authentication endpoint (currently disabled)
- **get-tool-instructions.js**: Serves tool instructions to frontend

### Utilities
- **api-helpers.js**: CORS headers, error responses, JSON parsing
- **job-storage.js**: Multi-tier job storage (Netlify Blobs, memory, env vars)
- **mime-types.js**: Intelligent MIME type detection for file uploads

## Environment Variables
Required in Netlify dashboard:
- `GEMINI_KEY`: Google AI API key for Gemini
- `FAL_KEY`: FAL.ai API key for image generation
- `JWT_SECRET`: JWT secret for authentication (not currently used)

## API Flow

### Direct Generation (Fast Path)
1. User uploads files/text → Frontend
2. Frontend calls `/generate-prompts-direct`
3. Function makes two Gemini calls:
   - First: Generate initial prompts
   - Second: Refine prompts
4. Returns final prompts to user

### Background Generation (Slow Path)
1. User uploads files/text → Frontend
2. Frontend calls `/generate-prompts-gateway`
3. Gateway creates job, returns job ID
4. Frontend polls `/generate-prompts-check` with job ID
5. Background function processes job
6. Check endpoint returns results when ready

## Security Notes
- Authentication is currently disabled (verifyAuth always returns true)
- CORS is set to allow all origins (`*`)
- No user data is permanently stored
- API keys are stored as environment variables

## Recent Updates
- Removed test functions (test-blobs.js, test-connection.js, check-env.js)
- Consolidated MIME type detection into utility function
- Updated to use Gemini 2.0 Flash model
- Reduced console logging in production
- Added proper error handling and retry logic
