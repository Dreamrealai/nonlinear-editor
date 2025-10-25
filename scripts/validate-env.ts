#!/usr/bin/env tsx
/**
 * Standalone Environment Variable Validation Script
 *
 * This script validates all environment variables before deployment or build.
 * Can be run independently from the main application.
 *
 * Usage:
 *   npm run validate:env
 *   npx tsx scripts/validate-env.ts
 *   ./scripts/validate-env.ts
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failed (missing or invalid variables)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { validateEnvSafe, printEnvStatus } from '../lib/validateEnv';

// =============================================================================
// Load Environment Variables
// =============================================================================

/**
 * Loads environment variables from .env.local file
 */
function loadEnvFile() {
  const envPaths = [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from: ${envPath}\n`);
      dotenv.config({ path: envPath });
      return true;
    }
  }

  console.warn('No .env.local or .env file found. Using system environment variables.\n');
  return false;
}

// =============================================================================
// Main Validation
// =============================================================================

async function main() {
  console.log('🔍 DreamReal AI - Environment Variable Validation\n');
  console.log('='.repeat(60));
  console.log('');

  // Load environment file
  loadEnvFile();

  // Print current environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`Environment: ${nodeEnv}\n`);

  // Show environment status
  printEnvStatus();

  // Validate all variables
  console.log('='.repeat(60));
  console.log('\n🔍 Running Validation...\n');

  const result = validateEnvSafe();

  // Print warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');
    result.warnings.forEach((warning, i) => {
      console.warn(`${i + 1}. ${warning}\n`);
    });
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error('❌ Errors:\n');
    result.errors.forEach((error, i) => {
      console.error(`${i + 1}. ${error}\n`);
    });
    console.error('='.repeat(60));
    console.error('\n❌ Validation FAILED\n');
    process.exit(1);
  }

  // Success
  console.log('='.repeat(60));
  console.log('\n✅ Validation PASSED\n');
  console.log('All required environment variables are configured correctly.\n');

  // Production-specific checks
  if (nodeEnv === 'production') {
    console.log('🔒 Production Environment Detected:\n');
    console.log('  ✓ Ensure all secrets are properly secured');
    console.log('  ✓ Verify webhook endpoints are configured');
    console.log('  ✓ Confirm API keys are production keys (not test keys)\n');
  }

  process.exit(0);
}

// =============================================================================
// Execute
// =============================================================================

main().catch((error) => {
  console.error('❌ Unexpected error during validation:\n');
  console.error(error);
  process.exit(1);
});
