#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Netlify Blobs for local development...\n');

// Function to execute command and return output
function exec(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent) console.log(output);
    return output;
  } catch (error) {
    if (!silent) console.error(`Error executing: ${command}`);
    return null;
  }
}

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this from the project root.');
  process.exit(1);
}

console.log('📦 Checking Netlify Blobs installation...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.dependencies || !packageJson.dependencies['@netlify/blobs']) {
  console.log('Installing @netlify/blobs...');
  exec('npm install @netlify/blobs@^7.4.0');
} else {
  console.log('✅ @netlify/blobs is already in package.json');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules/@netlify/blobs')) {
  console.log('\n📥 Installing dependencies...');
  exec('npm install');
} else {
  console.log('✅ @netlify/blobs is installed in node_modules');
}

// Check Netlify CLI
console.log('\n🔧 Checking Netlify CLI...');
const netlifyVersion = exec('npx netlify --version', true);
if (!netlifyVersion) {
  console.log('Installing Netlify CLI...');
  exec('npm install -D netlify-cli@latest');
} else {
  console.log(`✅ Netlify CLI is available: ${netlifyVersion.trim()}`);
}

// Check login status
console.log('\n🔐 Checking Netlify authentication...');
const loginStatus = exec('npx netlify status', true);
if (!loginStatus || loginStatus.includes('Not logged in')) {
  console.log('⚠️  Not logged in to Netlify');
  console.log('Please run: npx netlify login');
} else {
  console.log('✅ Logged in to Netlify');
}

// Check if site is linked
console.log('\n🔗 Checking site linkage...');
if (fs.existsSync('.netlify/state.json')) {
  const state = JSON.parse(fs.readFileSync('.netlify/state.json', 'utf8'));
  if (state.siteId) {
    console.log(`✅ Site is linked: ${state.siteId}`);
  } else {
    console.log('⚠️  Site ID not found in state.json');
    console.log('Please run: npx netlify link');
  }
} else {
  console.log('⚠️  Site is not linked to Netlify');
  console.log('Please run: npx netlify link');
}

// Check environment variables
console.log('\n🔑 Checking environment variables...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('GEMINI_KEY')) {
    console.log('✅ GEMINI_KEY is set in .env');
  } else {
    console.log('⚠️  GEMINI_KEY not found in .env');
  }
} else {
  console.log('⚠️  .env file not found');
  if (fs.existsSync('.env.example')) {
    console.log('Creating .env from .env.example...');
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ Created .env file - Please add your GEMINI_KEY');
  }
}

// Summary
console.log('\n📋 Setup Summary:');
console.log('================');

const checks = {
  '@netlify/blobs installed': fs.existsSync('node_modules/@netlify/blobs'),
  'Netlify CLI available': !!netlifyVersion,
  'Logged in to Netlify': loginStatus && !loginStatus.includes('Not logged in'),
  'Site linked': fs.existsSync('.netlify/state.json'),
  '.env file exists': fs.existsSync('.env'),
};

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});

console.log('\n🎯 Next Steps:');
console.log('=============');

if (!checks['Logged in to Netlify']) {
  console.log('1. Login to Netlify:');
  console.log('   npx netlify login');
}

if (!checks['Site linked']) {
  console.log('2. Link your site:');
  console.log('   npx netlify link');
}

if (!fs.existsSync('.env') || !fs.readFileSync('.env', 'utf8').includes('GEMINI_KEY')) {
  console.log('3. Add your GEMINI_KEY to .env file');
}

console.log('\n🚀 To start local development with Netlify Blobs:');
console.log('   npx netlify dev');

console.log('\n📝 To test Netlify Blobs after setup:');
console.log('   1. Start Netlify Dev: npx netlify dev');
console.log('   2. In a new terminal: node test-netlify-blobs.js');

console.log('\n✨ Netlify Blobs will work automatically when:');
console.log('   - Running with "netlify dev" (local development)');
console.log('   - Deployed to Netlify (production)');
console.log('\n📌 Note: Netlify Blobs requires the Netlify environment to work properly.');
