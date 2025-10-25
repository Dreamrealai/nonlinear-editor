#!/usr/bin/env node
/**
 * Script to fix missing return types in mock component definitions
 */

const fs = require('fs');
const { glob } = require('glob');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: function MockComponent() { return <jsx>; }
  // Should be: function MockComponent(): JSX.Element { return <jsx>; }
  const funcPattern = /(\s+)(\w+):\s*function\s+Mock(\w+)\s*\(\s*\)\s*\{/g;
  if (funcPattern.test(content)) {
    content = content.replace(funcPattern, '$1$2: function Mock$3(): JSX.Element {');
    modified = true;
  }

  // Pattern 2: function MockComponent({ ...props }: any) { return <jsx>; }
  // Should be: function MockComponent({ ...props }: any): JSX.Element { return <jsx>; }
  const funcWithPropsPattern = /(\s+)(\w+):\s*function\s+Mock(\w+)\s*\([^)]+\)\s*\{/g;
  if (funcWithPropsPattern.test(content)) {
    content = content.replace(funcWithPropsPattern, (match, indent, key, name) => {
      // Only add return type if it doesn't already have one
      if (!match.includes('): ')) {
        const paramsEnd = match.lastIndexOf(')');
        return match.slice(0, paramsEnd + 1) + ': JSX.Element {';
      }
      return match;
    });
    modified = true;
  }

  // Pattern 3: default: function MockComponent() { ... }
  const defaultFuncPattern = /default:\s*function\s+Mock\w+\s*\([^)]*\)\s*\{/g;
  if (defaultFuncPattern.test(content)) {
    content = content.replace(defaultFuncPattern, (match) => {
      if (!match.includes('): ')) {
        const paramsEnd = match.lastIndexOf(')');
        return match.slice(0, paramsEnd + 1) + ': JSX.Element {';
      }
      return match;
    });
    modified = true;
  }

  // Pattern 4: return function MockComponent() { ... }
  const returnFuncPattern = /return\s+function\s+Mock\w+\s*\([^)]*\)\s*\{/g;
  if (returnFuncPattern.test(content)) {
    content = content.replace(returnFuncPattern, (match) => {
      if (!match.includes('): ')) {
        const paramsEnd = match.lastIndexOf(')');
        return match.slice(0, paramsEnd + 1) + ': JSX.Element {';
      }
      return match;
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }

  return false;
}

async function main() {
  const testFiles = await glob('__tests__/**/*.test.tsx', {
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
