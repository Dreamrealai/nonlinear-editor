#!/usr/bin/env node

/**
 * Script to fix CORS wildcard configurations across all Netlify functions
 * Replaces 'Access-Control-Allow-Origin': '*' with proper origin validation
 */

const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '../netlify/functions');

// Files to update
const filesToUpdate = [
  'check-video-analysis.js',
  'start-video-analysis.js',
  'generate-summaries.js',
  'search-client-ads.js',
  'generate-prompts-async-handler.js',
  'generate-prompts-async-v2.js',
  'generate-prompts-check.js',
  'generate-prompts-simple.js',
  'generate-prompts-start.js',
  'generate-prompts-streaming.js',
  'generate-prompts-universal.js',
  'generate-prompts-webhook-v2.js',
  'generate-prompts-webhook.js',
  'process-prompt-webhook-v2.js',
  'generate-prompts-async.js',
  'test-blobs-status.js',
  'generate-prompts-stream.js',
  'generate-prompts-original.js',
  'get-tool-instructions.js'
];

const addCorsImport = (content) => {
  // Check if already has the import
  if (content.includes("require('../../lib/cors')")) {
    return content;
  }

  // Find the first require statement
  const requireMatch = content.match(/^const .* = require\(.*\);/m);

  if (requireMatch) {
    const importStatement = "const { getCorsHeaders } = require('../../lib/cors');\n";
    return content.replace(requireMatch[0], requireMatch[0] + '\n' + importStatement);
  }

  // If no require found, add at the top
  return "const { getCorsHeaders } = require('../../lib/cors');\n\n" + content;
};

const replaceCorsHeaders = (content) => {
  // Pattern 1: Simple wildcard CORS
  const pattern1 = /const headers = \{\s*'Access-Control-Allow-Origin': '\*',\s*'Access-Control-Allow-Headers': '[^']+',\s*'Access-Control-Allow-Methods': '[^']+'\s*\};/g;

  content = content.replace(pattern1, (match) => {
    return `const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };`;
  });

  // Pattern 2: CORS with Content-Type
  const pattern2 = /const headers = \{\s*'Access-Control-Allow-Origin': '\*',\s*'Access-Control-Allow-Headers': '[^']+',\s*'Access-Control-Allow-Methods': '[^']+',\s*'Content-Type': 'application\/json'\s*\};/g;

  content = content.replace(pattern2, (match) => {
    return `const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };`;
  });

  // Pattern 3: Inline header definitions
  const pattern3 = /'Access-Control-Allow-Origin': '\*'/g;

  // Only replace if it's part of a headers object and not already replaced
  if (!content.includes('getCorsHeaders(event')) {
    content = content.replace(pattern3, (match, offset) => {
      // Check context - only replace in object literals
      const beforeContext = content.substring(Math.max(0, offset - 50), offset);
      if (beforeContext.includes('headers') || beforeContext.includes('{')) {
        console.warn('  Warning: Found inline CORS header that may need manual review');
        return match; // Keep as-is, needs manual review
      }
      return match;
    });
  }

  return content;
};

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

console.log('Starting CORS security fix...\n');

filesToUpdate.forEach(filename => {
  const filePath = path.join(functionsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped: ${filename} (file not found)`);
    skippedCount++;
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file needs updating
    if (!content.includes("'Access-Control-Allow-Origin': '*'")) {
      console.log(`✓  Skipped: ${filename} (already fixed)`);
      skippedCount++;
      return;
    }

    // Add CORS import
    content = addCorsImport(content);

    // Replace CORS headers
    content = replaceCorsHeaders(content);

    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`✅ Updated: ${filename}`);
    updatedCount++;
  } catch (error) {
    console.error(`❌ Error updating ${filename}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '='.repeat(50));
console.log('CORS Security Fix Summary:');
console.log('='.repeat(50));
console.log(`✅ Updated: ${updatedCount} files`);
console.log(`⚠️  Skipped: ${skippedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log('='.repeat(50));

if (updatedCount > 0) {
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes in the updated files');
  console.log('2. Update your .env file with ALLOWED_ORIGINS');
  console.log('3. Test the functions to ensure CORS works correctly');
  console.log('4. Build and commit the changes');
}

process.exit(errorCount > 0 ? 1 : 0);
