#!/usr/bin/env node
/**
 * Script to fix missing return types in mock function definitions
 *
 * Handles:
 * 1. withErrorHandling: (handler: any) => handler
 * 2. Mock component functions
 * 3. Inline arrow functions in mocks
 */

const fs = require('fs');
const { glob } = require('glob');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const lines = content.split('\n');
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Pattern 1: withErrorHandling: (handler: any) => handler
    if (line.includes('withErrorHandling:') && line.includes('(handler:') && line.includes(') =>') && !line.includes(': (handler:')) {
      line = line.replace(/withErrorHandling:\s*\(handler:\s*any\)\s*=>/g, 'withErrorHandling: (handler: any): any =>');
      modified = true;
    }

    // Pattern 2: Mock child functions like child: jest.fn(() => ({
    // Match: child: jest.fn(() => ({
    if (line.match(/^\s+child:\s+jest\.fn\(\s*\(\s*\)\s*=>\s*\(\{/)) {
      line = line.replace(/child:\s+jest\.fn\(\s*\(\s*\)\s*=>/g, 'child: jest.fn((): Record<string, unknown> =>');
      modified = true;
    }

    // Pattern 3: Mock functions that return objects: someFn: () => ({
    // But NOT if they already have a return type
    if (line.match(/^\s+\w+:\s*\(\s*\)\s*=>\s*\(\{/) && !line.includes('(): ')) {
      line = line.replace(/(\w+):\s*\(\s*\)\s*=>\s*\(\{/g, '$1: (): Record<string, unknown> => ({');
      modified = true;
    }

    // Pattern 4: Mock React components with props: ({ prop }: { ... }) => (
    // Only add return type if NOT React component pattern (doesn't have React node return)
    // This is complex, skip for now to avoid breaking React components

    // Pattern 5: Test helper functions at module level
    // const createMockX = () => ({ ... })
    if (line.match(/^const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\(\{/) && !line.includes('): ')) {
      line = line.replace(/^(const\s+\w+)\s*=\s*\(\s*\)\s*=>/g, '$1 = (): Record<string, unknown> =>');
      modified = true;
    }

    // Pattern 6: Test helper functions with params
    // const createMockX = (param: Type) => ({ ... })
    if (line.match(/^const\s+\w+\s*=\s*\([^)]+\)\s*=>\s*\(\{/) && !line.includes('): ')) {
      line = line.replace(/^(const\s+\w+\s*=\s*\([^)]+\))\s*=>/g, '$1: Record<string, unknown> =>');
      modified = true;
    }

    // Pattern 7: Inline function expressions in object literals
    // someKey: (param) => value
    // But we need to be careful with jest mocks and React components

    newLines.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
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
