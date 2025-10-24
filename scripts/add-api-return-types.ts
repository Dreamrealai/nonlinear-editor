#!/usr/bin/env ts-node

/**
 * Script to add explicit return types to API route functions
 *
 * This script systematically adds return types following these patterns:
 * - Handler functions wrapped with withAuth: Promise<Response>
 * - Handler functions wrapped with withErrorHandling: Promise<Response>
 * - Handler functions using createStatusCheckHandler: (handled by wrapper)
 * - Exported route handlers (GET, POST, etc.): RouteHandler type from withAuth
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FileUpdate {
  filePath: string;
  functionsUpdated: number;
  changes: string[];
}

const results: FileUpdate[] = [];

async function addReturnTypes() {
  // Find all API route files
  const apiRouteFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  });

  console.log(`Found ${apiRouteFiles.length} API route files to process\n`);

  for (const filePath of apiRouteFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`Processing: ${relativePath}`);

    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let functionsUpdated = 0;
    const changes: string[] = [];

    // Pattern 1: Handler functions without return types (async function handleXxx(...) {)
    const handlerPattern = /^(async function (handle\w+)\([^)]+\))\s*{/gm;
    content = content.replace(handlerPattern, (match, funcDecl, funcName) => {
      if (!match.includes(': Promise<')) {
        functionsUpdated++;
        changes.push(`Added Promise<Response> to ${funcName}`);
        return `${funcDecl}: Promise<Response> {`;
      }
      return match;
    });

    // Pattern 2: Arrow function handlers assigned to const (const handleXxx: AuthenticatedHandler = async ...)
    // These already have types via AuthenticatedHandler, but check for inline definitions without type
    const arrowHandlerPattern = /^(const (handle\w+)\s*=\s*async\s*\([^)]+\))\s*=>/gm;
    content = content.replace(arrowHandlerPattern, (match, funcDecl, funcName) => {
      if (!match.includes(': Promise<') && !funcDecl.includes(': AuthenticatedHandler')) {
        functionsUpdated++;
        changes.push(`Added Promise<Response> to ${funcName}`);
        return `${funcDecl}: Promise<Response> =&gt;`;
      }
      return match;
    });

    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      results.push({
        filePath: relativePath,
        functionsUpdated,
        changes,
      });
      console.log(`  ✓ Updated ${functionsUpdated} function(s)`);
    } else {
      console.log(`  - No changes needed`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files processed: ${apiRouteFiles.length}`);
  console.log(`Files updated: ${results.length}`);
  console.log(`Total functions updated: ${results.reduce((sum, r) => sum + r.functionsUpdated, 0)}`);

  if (results.length > 0) {
    console.log('\nDetailed Changes:');
    results.forEach(result => {
      console.log(`\n${result.filePath}:`);
      result.changes.forEach(change => {
        console.log(`  - ${change}`);
      });
    });
  }
}

addReturnTypes().catch(console.error);
