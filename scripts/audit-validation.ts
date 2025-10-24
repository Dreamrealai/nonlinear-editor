/**
 * Validation Migration Audit Script
 *
 * Scans all API routes and identifies which ones need validation migration
 * to use assertion-based validation from /lib/validation.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteInfo {
  path: string;
  relativePath: string;
  hasValidation: boolean;
  usesAssertions: boolean;
  httpMethods: string[];
  hasJsonParsing: boolean;
  priority: 'P1' | 'P2' | 'P3';
  category: string;
}

// Priority classification based on route type
const PRIORITY_PATTERNS = {
  P1: ['/api/admin/', '/api/stripe/', '/api/billing/'],
  P2: ['/api/projects/', '/api/assets/', '/api/auth/', '/api/users/'],
  P3: ['/api/video/', '/api/audio/', '/api/image/', '/api/text/'],
};

// Validation function patterns to look for
const VALIDATION_PATTERNS = {
  assertions: [
    'validateString',
    'validateUUID',
    'validateEmail',
    'validateInteger',
    'validateNumber',
    'validateBoolean',
    'validateEnum',
    'validateRequired',
    'validateUrl',
    'validateStringLength',
    'validateIntegerRange',
    'validateAspectRatio',
    'validateDuration',
    'validateSeed',
    'validateSampleCount',
    'validateImageGenerationRequest',
  ],
  oldValidation: ['if (!', 'if(!', '?.length', 'typeof ', '.test('],
};

function getPriority(routePath: string): 'P1' | 'P2' | 'P3' {
  for (const [priority, patterns] of Object.entries(PRIORITY_PATTERNS)) {
    if (patterns.some((pattern) => routePath.includes(pattern))) {
      return priority as 'P1' | 'P2' | 'P3';
    }
  }
  return 'P3';
}

function getCategory(routePath: string): string {
  if (routePath.includes('/admin/')) return 'Admin';
  if (routePath.includes('/stripe/') || routePath.includes('/billing/')) return 'Payment';
  if (routePath.includes('/projects/')) return 'Projects';
  if (routePath.includes('/assets/')) return 'Assets';
  if (routePath.includes('/auth/')) return 'Auth';
  if (routePath.includes('/users/')) return 'Users';
  if (routePath.includes('/video/')) return 'Video Generation';
  if (routePath.includes('/audio/')) return 'Audio Generation';
  if (routePath.includes('/image/')) return 'Image Generation';
  if (routePath.includes('/text/')) return 'Text Generation';
  return 'Other';
}

function analyzeRoute(filePath: string, baseDir: string): RouteInfo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(baseDir, filePath);

    // Extract HTTP methods
    const httpMethods: string[] = [];
    const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      httpMethods.push(match[1]);
    }

    // Skip if no HTTP methods found (not a route handler)
    if (httpMethods.length === 0) {
      return null;
    }

    // Check for validation patterns
    const usesAssertions = VALIDATION_PATTERNS.assertions.some((pattern) =>
      content.includes(pattern)
    );

    const hasOldValidation = VALIDATION_PATTERNS.oldValidation.some((pattern) =>
      content.includes(pattern)
    );

    const hasJsonParsing =
      content.includes('await req.json()') || content.includes('await request.json()');
    const hasValidation = usesAssertions || hasOldValidation;

    const priority = getPriority(relativePath);
    const category = getCategory(relativePath);

    return {
      path: filePath,
      relativePath,
      hasValidation,
      usesAssertions,
      httpMethods,
      hasJsonParsing,
      priority,
      category,
    };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    return null;
  }
}

function findRoutes(dir: string): string[] {
  const routes: string[] = [];

  function walk(currentPath: string) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walk(filePath);
      } else if (file === 'route.ts') {
        routes.push(filePath);
      }
    }
  }

  walk(dir);
  return routes;
}

function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api');

  console.log('🔍 Scanning API routes for validation patterns...\n');
  console.log(`API Directory: ${apiDir}\n`);

  const routeFiles = findRoutes(apiDir);
  const routes: RouteInfo[] = [];

  for (const routeFile of routeFiles) {
    const routeInfo = analyzeRoute(routeFile, apiDir);
    if (routeInfo) {
      routes.push(routeInfo);
    }
  }

  // Statistics
  const totalRoutes = routes.length;
  const routesWithAssertions = routes.filter((r) => r.usesAssertions).length;
  const routesNeedingMigration = routes.filter((r) => !r.usesAssertions && r.hasJsonParsing).length;
  const routesWithoutValidation = routes.filter((r) => !r.hasValidation && r.hasJsonParsing).length;

  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Routes:                ${totalRoutes}`);
  console.log(
    `Routes with Assertion-based Validation:  ${routesWithAssertions} (${((routesWithAssertions / totalRoutes) * 100).toFixed(1)}%)`
  );
  console.log(
    `Routes Needing Migration:    ${routesNeedingMigration} (${((routesNeedingMigration / totalRoutes) * 100).toFixed(1)}%)`
  );
  console.log(`Routes Without Validation:   ${routesWithoutValidation}`);
  console.log('='.repeat(80));
  console.log();

  // Group by priority
  const priorityGroups = {
    P1: routes.filter((r) => r.priority === 'P1' && !r.usesAssertions && r.hasJsonParsing),
    P2: routes.filter((r) => r.priority === 'P2' && !r.usesAssertions && r.hasJsonParsing),
    P3: routes.filter((r) => r.priority === 'P3' && !r.usesAssertions && r.hasJsonParsing),
  };

  // Group by category
  const categories: Record<string, RouteInfo[]> = {};
  routes.forEach((route) => {
    if (!route.usesAssertions && route.hasJsonParsing) {
      if (!categories[route.category]) {
        categories[route.category] = [];
      }
      categories[route.category].push(route);
    }
  });

  // Print priority groups
  console.log('🎯 MIGRATION PRIORITY BREAKDOWN\n');

  for (const [priority, priorityRoutes] of Object.entries(priorityGroups)) {
    if (priorityRoutes.length > 0) {
      console.log(`\n${priority} - High Priority (${priorityRoutes.length} routes)`);
      console.log('-'.repeat(80));

      const categoryBreakdown: Record<string, RouteInfo[]> = {};
      priorityRoutes.forEach((route) => {
        if (!categoryBreakdown[route.category]) {
          categoryBreakdown[route.category] = [];
        }
        categoryBreakdown[route.category].push(route);
      });

      for (const [cat, catRoutes] of Object.entries(categoryBreakdown)) {
        console.log(`  ${cat}: ${catRoutes.length} routes`);
        catRoutes.forEach((route) => {
          console.log(`    - ${route.relativePath} [${route.httpMethods.join(', ')}]`);
        });
      }
    }
  }

  // Print detailed route list
  console.log('\n\n📋 DETAILED ROUTE LIST\n');
  console.log('Routes needing migration (grouped by category):\n');

  for (const [category, categoryRoutes] of Object.entries(categories).sort()) {
    if (categoryRoutes.length > 0) {
      console.log(`\n${category} (${categoryRoutes.length} routes)`);
      console.log('-'.repeat(80));

      categoryRoutes.forEach((route) => {
        const validationStatus = route.hasValidation ? '⚠️  Old validation' : '❌ No validation';
        console.log(`${validationStatus} - ${route.relativePath}`);
        console.log(`  Methods: ${route.httpMethods.join(', ')}`);
        console.log(`  Priority: ${route.priority}`);
        console.log();
      });
    }
  }

  // Generate migration checklist
  console.log('\n\n✅ MIGRATION CHECKLIST\n');
  console.log('Copy this checklist to track migration progress:\n');
  console.log('```markdown');
  console.log('# Validation Migration Progress\n');

  for (const [priority, priorityRoutes] of Object.entries(priorityGroups)) {
    if (priorityRoutes.length > 0) {
      console.log(`\n## ${priority} Priority (${priorityRoutes.length} routes)\n`);
      priorityRoutes.forEach((route) => {
        console.log(`- [ ] ${route.relativePath} [${route.httpMethods.join(', ')}]`);
      });
    }
  }
  console.log('```');

  // Exit with appropriate code
  process.exit(routesNeedingMigration > 0 ? 1 : 0);
}

main();
