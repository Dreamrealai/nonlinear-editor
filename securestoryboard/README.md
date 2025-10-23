# Secure Storyboard

Secure Visual Storyboard Tool - Generate AI-powered visual storyboards from advertising briefs.

## Features

- Generate 6-16 scene prompts from ad briefs
- Create visual storyboards with AI-generated images
- Support for style files and ad description files
- Export storyboards as PDF with all scenes
- Save and load checkpoints
- Chat interface for iterative refinement

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your API keys:
   - `GEMINI_KEY`: Google Gemini API key for AI chat and prompt generation
   - `FAL_KEY`: FAL.ai API key for image generation
4. Run locally: `npm run dev`

## Deployment

This project is designed to deploy on Netlify:

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy

## Troubleshooting

### Error: "API call failed with status 499" - FIXED!

**Update (May 2025)**: This error has been fixed with a new polling mechanism.

#### What was causing it:
- Frontend waited exactly 3 minutes before checking if the job was done
- No polling - just one check after 3 minutes
- Jobs could be lost from storage during the wait
- Client timeout (499 = "Client Closed Request")

#### How it's fixed:
1. **Smart Polling**: Instead of waiting 3 minutes, we now:
   - Start checking after 3 seconds
   - Use exponential backoff (up to 15 seconds between checks)
   - Show elapsed time to users
   - Automatically restart lost jobs

2. **Better Timeouts**: 
   - Added 2-minute timeout to Gemini API calls
   - Configured 15-minute timeout for background functions

3. **Improved Error Handling**:
   - Clear error messages for different scenarios
   - Automatic retry with job restart capability
   - Better progress indicators

If you still see this error:
1. **Check your API keys**: Ensure both `GEMINI_KEY` and `FAL_KEY` are set correctly
2. **Monitor the browser console**: You'll see detailed polling status
3. **Check Netlify function logs**: For server-side errors

### Common Issues

- **Rate limits**: The free tier of APIs may have rate limits. Wait a moment between requests
- **Large files**: Uploaded files are converted to base64, so very large files may fail
- **Timeout errors**: Complex prompts may take 1-2 minutes to generate

### Performance Tips

- Keep the service warm by using it regularly
- Use shorter ad briefs for faster processing
- Generate fewer scenes (6-8) for quicker results

## Architecture

- **Frontend**: Vanilla JavaScript with no build step
- **Backend**: Netlify Functions (AWS Lambda)
- **APIs**: Google Gemini for AI, FAL.ai for image generation
- **Storage**: Temporary file-based job storage for async processing

## API Endpoints

- `POST /.netlify/functions/generate-prompts-start` - Start prompt generation job
- `GET /.netlify/functions/generate-prompts-check?jobId={id}` - Check job status
- `POST /.netlify/functions/generate-images` - Generate images from prompts
- `POST /.netlify/functions/chat` - Chat with AI for refinements

## Development

### File Structure

```
/
├── public/              # Static files
│   ├── index.html      # Main app
│   ├── js/             # Client-side JavaScript
│   └── style.css       # Styles
├── netlify/
│   └── functions/      # Serverless functions
│       └── utils/      # Shared utilities
├── src/                # Server-side modules
└── .env                # Environment variables (not in git)
```

### Key Improvements in Latest Version

1. **Enhanced Job Storage**: Multiple persistence strategies to prevent job loss:
   - Netlify Blobs API for distributed persistence
   - Global cache for same-instance access
   - Environment variable fallback for recovery
2. **Automatic Job Recovery**: If a job is lost, the system automatically retries
3. **Better Error Handling**: Comprehensive error messages with user-friendly explanations
4. **Exponential Backoff**: Smart polling with increasing intervals
5. **Timeout Protection**: Functions protected against Netlify's 10-second limit
6. **Centralized Helpers**: Common functionality extracted to utility modules

### Troubleshooting "Job Lost" Errors

If you see "Error generating prompts: Job lost. Please try again.":

1. **This is normal on first use**: Netlify Functions may cold start and lose jobs
2. **The fix is automatic**: Just click "Generate Images" again - it should work
3. **Why it happens**: 
   - Netlify Functions have a 10-second timeout
   - Prompt generation can take 30-60 seconds
   - Jobs continue in background but may be lost if the function restarts
4. **The solution**: 
   - We now use Netlify Blobs for persistent storage
   - Jobs are automatically recovered when possible
   - The system retries failed jobs automatically

## License

Private - All rights reserved
