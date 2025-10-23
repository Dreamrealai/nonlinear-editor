#!/bin/bash

# Setup script for Netlify Blobs

echo "Setting up Netlify Blobs for SecureStoryboard..."

# 1. Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# 2. Check if logged in
echo "Checking Netlify login status..."
netlify status || netlify login

# 3. Link the site if not already linked
if [ ! -f ".netlify/state.json" ]; then
    echo "Linking to Netlify site..."
    netlify link
else
    echo "Site already linked to Netlify"
fi

# 4. Install dependencies
echo "Installing dependencies..."
npm install

# 5. Set up environment variables
echo ""
echo "Setting up environment variables..."
echo "Make sure GEMINI_KEY is set in your Netlify dashboard"

# 6. Create a test blob to ensure Blobs is enabled
echo ""
echo "Testing Netlify Blobs..."
cat > test-blobs.js << 'EOF'
const { getStore } = require('@netlify/blobs');

async function testBlobs() {
  try {
    const store = getStore({ name: 'test-store' });
    await store.set('test-key', { message: 'Blobs is working!' });
    const result = await store.get('test-key');
    console.log('✅ Netlify Blobs test successful:', result);
    await store.delete('test-key');
  } catch (error) {
    console.error('❌ Netlify Blobs test failed:', error.message);
    console.log('\nTo enable Blobs:');
    console.log('1. Go to https://app.netlify.com');
    console.log('2. Select your site (imagestoryboard)');
    console.log('3. Go to Site Settings > Environment variables');
    console.log('4. Make sure Blobs is enabled for your site');
  }
}

testBlobs();
EOF

node test-blobs.js
rm test-blobs.js

echo ""
echo "Setup complete! Deploy your site to activate Blobs:"
echo "  git add -A"
echo "  git commit -m 'Enable Netlify Blobs'"
echo "  git push origin main"
echo ""
echo "After deployment, Blobs will be active and the warnings will disappear."
