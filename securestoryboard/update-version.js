#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get current NY time
const now = new Date();
const nyTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}).format(now);

console.log(`Current NY time: ${nyTime}`);

// Read the index.html file
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace the version tracker time
const versionRegex = /<div id="versionTracker"[^>]*>v[\d:]+<\/div>/;
const newVersionTag = `<div id="versionTracker" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-family: monospace; z-index: 10000;">v${nyTime}</div>`;

if (versionRegex.test(html)) {
  html = html.replace(versionRegex, newVersionTag);
  console.log(`Updated version tracker to: v${nyTime}`);
} else {
  console.error('Could not find version tracker in index.html');
  process.exit(1);
}

// Write the updated HTML back
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated index.html with current NY time');
