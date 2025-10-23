#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Netlify Blobs Setup Status Check\n');
console.log('==================================\n');

// Function to check if a command exists
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Function to execute command silently
function execSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

// 1. Check Dependencies
console.log('📦 Dependencies:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasBlobsDep = packageJson.dependencies && packageJson.dependencies['@netlify/blobs'];
const hasFunctionsDep = packageJson.dependencies && packageJson.dependencies['@netlify/functions'];

console.log(`  ✅ @netlify/blobs: ${hasBlobsDep ? packageJson.dependencies['@netlify/blobs'] : 'Not found'}`);
console.log(`  ✅ @netlify/functions: ${hasFunctionsDep ? packageJson.dependencies['@netlify/functions'] : 'Not found'}`);

// Check if actually installed
const blobsInstalled = fs.existsSync('node_modules/@netlify/blobs');
const functionsInstalled = fs.existsSync('node_modules/@netlify/functions');

console.log(`  ${blobsInstalled ? '✅' : '❌'} @netlify/blobs installed in node_modules`);
console.log(`  ${functionsInstalled ? '✅' : '❌'} @netlify/functions installed in node_modules`);

// 2. Check Netlify CLI
console.log('\n🔧 Netlify CLI:');
const netlifyVersion = execSilent('npx netlify --version');
if (netlifyVersion) {
  console.log(`  ✅ Version: ${netlifyVersion.trim()}`);
} else {
  console.log('  ❌ Not installed');
}

// 3. Check Authentication
console.log('\n🔐 Authentication:');
const authStatus = execSilent('npx netlify status 2>&1');
if (authStatus && !authStatus.includes('Not logged in')) {
  console.log('  ✅ Logged in to Netlify');
  const lines = authStatus.split('\n');
  const emailLine = lines.find(line => line.includes('Email:'));
  if (emailLine) {
    console.log(`  ${emailLine.trim()}`);
  }
} else {
  console.log('  ❌ Not logged in');
}

// 4. Check Site Linkage
console.log('\n🔗 Site Configuration:');
if (fs.existsSync('.netlify/state.json')) {
  const state = JSON.parse(fs.readFileSync('.netlify/state.json', 'utf8'));
  if (state.siteId) {
    console.log(`  ✅ Site ID: ${state.siteId}`);
    console.log(`  ✅ Site URL: https://${state.siteId}.netlify.app`);
  } else {
    console.log('  ❌ Site ID not found');
  }
} else {
  console.log('  ❌ Site not linked (.netlify/state.json missing)');
}

// 5. Check Environment Variables
console.log('\n🔑 Environment Variables:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasGeminiKey = envContent.includes('GEMINI_KEY');
  console.log(`  ${hasGeminiKey ? '✅' : '❌'} GEMINI_KEY in .env`);
} else {
  console.log('  ❌ .env file not found');
}

// 6. Check Netlify Functions
console.log('\n⚡ Netlify Functions:');
if (fs.existsSync('netlify/functions')) {
  const functions = fs.readdirSync('netlify/functions').filter(f => f.endsWith('.js'));
  console.log(`  ✅ ${functions.length} function(s) found:`);
  functions.forEach(f => console.log(`     - ${f}`));
} else {
  console.log('  ❌ netlify/functions directory not found');
}

// 7. Summary
console.log('\n📊 Summary:');
console.log('===========');

const allChecks = {
  'Netlify Blobs dependency': hasBlobsDep && blobsInstalled,
  'Netlify Functions dependency': hasFunctionsDep && functionsInstalled,
  'Netlify CLI': !!netlifyVersion,
  'Authentication': authStatus && !authStatus.includes('Not logged in'),
  'Site linked': fs.existsSync('.netlify/state.json') && JSON.parse(fs.readFileSync('.netlify/state.json', 'utf8')).siteId,
  'Environment configured': fs.existsSync('.env'),
};

let allPassed = true;
Object.entries(allChecks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  if (!passed) allPassed = false;
});

// Instructions
console.log('\n📝 How Netlify Blobs Works:');
console.log('===========================');
console.log('1. LOCAL DEVELOPMENT:');
console.log('   - Run: npx netlify dev');
console.log('   - Blobs will work automatically in the Netlify Dev environment');
console.log('   - Test with: curl http://localhost:8888/.netlify/functions/test-blobs-status');
console.log('\n2. PRODUCTION:');
console.log('   - Deploy to Netlify: git push origin main');
console.log('   - Blobs are automatically available on Netlify\'s servers');
console.log('   - Test with: https://imagestoryboard.netlify.app/.netlify/functions/test-blobs-status');
console.log('\n3. IMPORTANT NOTES:');
console.log('   - Blobs ONLY work in Netlify environments (netlify dev or deployed)');
console.log('   - Running "node test-netlify-blobs.js" directly will fail');
console.log('   - Your app has fallback storage for when Blobs isn\'t available');

if (!allPassed) {
  console.log('\n⚠️  Some checks failed. To fix:');
  
  if (!hasBlobsDep || !blobsInstalled) {
    console.log('\n1. Install dependencies:');
    console.log('   npm install');
  }
  
  if (!authStatus || authStatus.includes('Not logged in')) {
    console.log('\n2. Login to Netlify:');
    console.log('   npx netlify login');
  }
  
  if (!fs.existsSync('.netlify/state.json') || !JSON.parse(fs.readFileSync('.netlify/state.json', 'utf8')).siteId) {
    console.log('\n3. Link your site:');
    console.log('   npx netlify link');
  }
} else {
  console.log('\n✅ Everything is set up correctly!');
  console.log('\n🚀 Ready to use Netlify Blobs:');
  console.log('   npx netlify dev');
}
