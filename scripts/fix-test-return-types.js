#!/usr/bin/env node
/**
 * Script to fix missing return types in test files
 *
 * Fixes:
 * 1. beforeEach(() => ...) -> beforeEach((): void => ...)
 * 2. afterEach(() => ...) -> afterEach((): void => ...)
 * 3. beforeEach(async () => ...) -> beforeEach(async (): Promise<void> => ...)
 * 4. afterEach(async () => ...) -> afterEach(async (): Promise<void> => ...)
 * 5. jest.mock factory functions
 * 6. Mock component functions
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix beforeEach/afterEach sync callbacks
  const syncCallbackPattern = /\b(beforeEach|afterEach)\s*\(\s*\(\s*\)\s*=>/g;
  if (syncCallbackPattern.test(content)) {
    content = content.replace(syncCallbackPattern, '$1((): void =>');
    modified = true;
  }

  // Fix beforeEach/afterEach async callbacks
  const asyncCallbackPattern = /\b(beforeEach|afterEach)\s*\(\s*async\s*\(\s*\)\s*=>/g;
  if (asyncCallbackPattern.test(content)) {
    content = content.replace(asyncCallbackPattern, '$1(async (): Promise<void> =>');
    modified = true;
  }

  // Fix beforeAll/afterAll sync callbacks
  const syncSetupPattern = /\b(beforeAll|afterAll)\s*\(\s*\(\s*\)\s*=>/g;
  if (syncSetupPattern.test(content)) {
    content = content.replace(syncSetupPattern, '$1((): void =>');
    modified = true;
  }

  // Fix beforeAll/afterAll async callbacks
  const asyncSetupPattern = /\b(beforeAll|afterAll)\s*\(\s*async\s*\(\s*\)\s*=>/g;
  if (asyncSetupPattern.test(content)) {
    content = content.replace(asyncSetupPattern, '$1(async (): Promise<void> =>');
    modified = true;
  }

  // Fix mock factory functions: jest.mock('...', () => ({
  const mockFactoryPattern = /jest\.mock\([^,]+,\s*\(\s*\)\s*=>\s*\(/g;
  if (mockFactoryPattern.test(content)) {
    content = content.replace(mockFactoryPattern, (match) => {
      return match.replace('() =>', '(): Record<string, unknown> =>');
    });
    modified = true;
  }

  // Fix component mock functions with props destructuring
  // Pattern: ({ prop1, prop2 }: { prop1: Type; ... }) => (
  // We don't add return type if it already has props with types

  // Fix simple arrow functions in mocks without return types
  // This is more complex and would need AST parsing to do safely
  // For now, we'll handle the most common patterns

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }

  return false;
}

async function main() {
  const testFiles = await glob('__tests__/**/*.test.{ts,tsx}', {
    cwd: process.cwd(),
    absolute: true,
  });

  console.log(`Found ${testFiles.length} test files`);

  let fixedCount = 0;
  for (const file of testFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} files`);
}

main().catch(console.error);
