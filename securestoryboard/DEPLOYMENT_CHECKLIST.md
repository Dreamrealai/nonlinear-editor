# Deployment Checklist

## Before Deploying

1. **Install Dependencies Locally**
   ```bash
   npm install
   ```

2. **Test Locally**
   ```bash
   npm run dev
   ```
   - Test prompt generation
   - Test image generation
   - Verify no console errors

3. **Environment Variables**
   Ensure these are set in Netlify Dashboard:
   - `GEMINI_KEY`
   - `FAL_KEY`
   - `SITE_ID` (optional, but helps with Blobs)

## Deploy to Netlify

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Fix job storage persistence issue"
   git push origin main
   ```

2. **In Netlify Dashboard**
   - Go to Site Settings > Environment Variables
   - Add all required API keys
   - Go to Deploys tab
   - Trigger a new deploy if needed

3. **After Deploy**
   - Wait for deploy to complete (2-3 minutes)
   - Visit your site URL
   - Test prompt generation (may fail first time due to cold start)
   - Try again if you see "Job lost" error
   - Subsequent attempts should work

## Monitoring

1. **Check Function Logs**
   - Netlify Dashboard > Functions tab
   - Look for any errors in:
     - `generate-prompts-start`
     - `generate-prompts-check`
     - `generate-images`

2. **Common Issues**
   - **First request fails**: Normal due to cold start
   - **Job lost errors**: Should auto-recover now
   - **Timeout errors**: Check if prompts are too complex
   - **Network errors**: Check API keys are valid

## Rollback if Needed

If the new version has issues:
1. Go to Netlify Dashboard > Deploys
2. Find the last working deploy
3. Click "Publish deploy" on that version

## Success Indicators

✓ Prompt generation completes without "Job lost" errors
✓ Images generate successfully
✓ Chat refinement works
✓ PDF export works
✓ Checkpoint save/load works
