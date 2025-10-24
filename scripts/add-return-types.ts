#!/usr/bin/env tsx

import { Project, Node, SourceFile } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

interface ScriptOptions {
  dryRun: boolean;
  backup: boolean;
  verbose: boolean;
}

interface ProcessingStats {
  filesProcessed: number;
  filesModified: number;
  functionsFixed: number;
  filesWithErrors: number;
  startTime: number;
  endTime?: number;
}

interface FileResult {
  filePath: string;
  functionsFixed: number;
  error?: string;
}

const TARGET_DIRECTORIES = ['lib', 'components', 'app/api', 'state'];
const EXCLUDE_PATTERNS = [
  '__tests__',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx',
  '.next',
  'node_modules',
  'dist',
  'build',
];

class ReturnTypeFixer {
  private project: Project;
  private options: ScriptOptions;
  private stats: ProcessingStats;
  private results: FileResult[] = [];

  constructor(options: ScriptOptions) {
    this.options = options;
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      functionsFixed: 0,
      filesWithErrors: 0,
      startTime: Date.now(),
    };

    // Initialize ts-morph project
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });
  }

  private shouldExcludeFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of EXCLUDE_PATTERNS) {
      if (pattern.includes('*')) {
        // Handle wildcard patterns
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(normalizedPath)) {
          return true;
        }
      } else if (normalizedPath.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  private getSourceFiles(): SourceFile[] {
    const files: SourceFile[] = [];
    const projectRoot = process.cwd();

    for (const dir of TARGET_DIRECTORIES) {
      const dirPath = path.join(projectRoot, dir);

      if (!fs.existsSync(dirPath)) {
        console.warn(`Warning: Directory not found: ${dirPath}`);
        continue;
      }

      const sourceFiles = this.project.getSourceFiles(`${dirPath}/**/*.{ts,tsx}`);

      for (const file of sourceFiles) {
        if (!this.shouldExcludeFile(file.getFilePath())) {
          files.push(file);
        }
      }
    }

    return files;
  }

  private backupFile(filePath: string): void {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    if (this.options.verbose) {
      console.log(`  Backed up: ${backupPath}`);
    }
  }

  private shouldAddReturnType(node: Node): boolean {
    // Check if it's a function-like node
    if (
      !Node.isFunctionDeclaration(node) &&
      !Node.isFunctionExpression(node) &&
      !Node.isArrowFunction(node) &&
      !Node.isMethodDeclaration(node)
    ) {
      return false;
    }

    // Skip if it already has a return type
    if (node.getReturnTypeNode()) {
      return false;
    }

    // Skip type predicates and type guards
    const returnType = node.getReturnType();
    const returnTypeText = returnType.getText();
    if (returnTypeText.includes(' is ') || returnTypeText.includes('asserts ')) {
      return false;
    }

    // Skip constructors
    if (Node.isConstructorDeclaration(node)) {
      return false;
    }

    // Skip abstract methods without implementation
    if (Node.isMethodDeclaration(node) && node.isAbstract() && !node.getBody()) {
      return false;
    }

    return true;
  }

  private getInferredReturnType(node: Node): string | null {
    try {
      const signature = node.getType().getCallSignatures()[0];
      if (!signature) {
        return null;
      }

      const returnType = signature.getReturnType();

      // Skip if return type is any (usually means we couldn't infer)
      if (returnType.isAny()) {
        return null;
      }

      // Get the type text, preferring the source file for better import resolution
      const sourceFile = node.getSourceFile();
      let typeText = returnType.getText(node, sourceFile);

      // Clean up the type text
      typeText = this.cleanTypeText(typeText);

      // Skip if the type is too complex or contains 'typeof import'
      if (
        typeText.includes('typeof import') ||
        typeText.length > 500 ||
        typeText.includes('...') ||
        typeText === 'void' && this.isGeneratorFunction(node)
      ) {
        return null;
      }

      return typeText;
    } catch (error) {
      if (this.options.verbose) {
        console.error(`  Error inferring return type: ${error}`);
      }
      return null;
    }
  }

  private cleanTypeText(typeText: string): string {
    // Remove import type references that can't be resolved
    typeText = typeText.replace(/import\([^)]+\)\./g, '');

    // Simplify Promise types
    typeText = typeText.replace(/Promise<([^>]+)>/g, (_, inner) => `Promise<${inner.trim()}>`);

    return typeText.trim();
  }

  private isGeneratorFunction(node: Node): boolean {
    if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node)) {
      return node.isGenerator();
    }
    return false;
  }

  private addReturnTypeToNode(node: Node): boolean {
    const inferredType = this.getInferredReturnType(node);

    if (!inferredType) {
      return false;
    }

    try {
      if (Node.isFunctionDeclaration(node)) {
        node.setReturnType(inferredType);
      } else if (Node.isMethodDeclaration(node)) {
        node.setReturnType(inferredType);
      } else if (Node.isFunctionExpression(node) || Node.isArrowFunction(node)) {
        node.setReturnType(inferredType);
      }

      return true;
    } catch (error) {
      if (this.options.verbose) {
        console.error(`  Error adding return type: ${error}`);
      }
      return false;
    }
  }

  private processFile(sourceFile: SourceFile): FileResult {
    const filePath = sourceFile.getFilePath();
    let functionsFixed = 0;

    try {
      const nodes = sourceFile.getDescendants();

      for (const node of nodes) {
        if (this.shouldAddReturnType(node)) {
          if (this.addReturnTypeToNode(node)) {
            functionsFixed++;
          }
        }
      }

      return { filePath, functionsFixed };
    } catch (error) {
      return {
        filePath,
        functionsFixed: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private saveChanges(): void {
    const modifiedFiles = this.project
      .getSourceFiles()
      .filter((file) => !file.isSaved());

    for (const file of modifiedFiles) {
      if (this.options.backup && !this.options.dryRun) {
        this.backupFile(file.getFilePath());
      }

      if (!this.options.dryRun) {
        file.saveSync();
      }
    }
  }

  private printProgress(current: number, total: number, filePath: string): void {
    const percentage = ((current / total) * 100).toFixed(1);
    const bar = '='.repeat(Math.floor((current / total) * 30));
    const space = ' '.repeat(30 - bar.length);
    const relativePath = path.relative(process.cwd(), filePath);

    process.stdout.write(`\r[${bar}${space}] ${percentage}% (${current}/${total}) ${relativePath.substring(0, 50)}`);
  }

  public async run(): Promise<void> {
    console.log('🔍 Scanning for TypeScript files...\n');

    const sourceFiles = this.getSourceFiles();
    console.log(`Found ${sourceFiles.length} files to process\n`);

    if (sourceFiles.length === 0) {
      console.log('No files to process.');
      return;
    }

    console.log(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Backup: ${this.options.backup ? 'ENABLED' : 'DISABLED'}\n`);

    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i];

      if (!this.options.verbose) {
        this.printProgress(i + 1, sourceFiles.length, file.getFilePath());
      } else {
        console.log(`\nProcessing: ${path.relative(process.cwd(), file.getFilePath())}`);
      }

      this.stats.filesProcessed++;
      const result = this.processFile(file);
      this.results.push(result);

      if (result.error) {
        this.stats.filesWithErrors++;
        if (this.options.verbose) {
          console.error(`  Error: ${result.error}`);
        }
      } else if (result.functionsFixed > 0) {
        this.stats.filesModified++;
        this.stats.functionsFixed += result.functionsFixed;
        if (this.options.verbose) {
          console.log(`  Fixed ${result.functionsFixed} function(s)`);
        }
      }
    }

    if (!this.options.verbose) {
      console.log('\n'); // New line after progress bar
    }

    // Save all changes
    if (this.stats.functionsFixed > 0) {
      console.log('\n💾 Saving changes...');
      this.saveChanges();
    }

    this.stats.endTime = Date.now();
    this.printSummary();
  }

  private printSummary(): void {
    const duration = ((this.stats.endTime! - this.stats.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary Report');
    console.log('='.repeat(60));
    console.log(`Mode:                 ${this.options.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`Files Processed:      ${this.stats.filesProcessed}`);
    console.log(`Files Modified:       ${this.stats.filesModified}`);
    console.log(`Functions Fixed:      ${this.stats.functionsFixed}`);
    console.log(`Files with Errors:    ${this.stats.filesWithErrors}`);
    console.log(`Processing Time:      ${duration}s`);
    console.log('='.repeat(60));

    if (this.stats.filesModified > 0) {
      console.log('\n📝 Top Modified Files:');
      const topFiles = this.results
        .filter((r) => r.functionsFixed > 0)
        .sort((a, b) => b.functionsFixed - a.functionsFixed)
        .slice(0, 10);

      for (const file of topFiles) {
        const relativePath = path.relative(process.cwd(), file.filePath);
        console.log(`  ${file.functionsFixed.toString().padStart(3)} functions - ${relativePath}`);
      }
    }

    if (this.stats.filesWithErrors > 0) {
      console.log('\n❌ Files with Errors:');
      const errorFiles = this.results.filter((r) => r.error);
      for (const file of errorFiles) {
        const relativePath = path.relative(process.cwd(), file.filePath);
        console.log(`  ${relativePath}: ${file.error}`);
      }
    }

    if (this.options.dryRun) {
      console.log('\n💡 This was a dry run. No files were modified.');
      console.log('   Run without --dry-run to apply changes.');
    } else if (this.stats.functionsFixed > 0) {
      console.log('\n✅ Changes saved successfully!');
      if (this.options.backup) {
        console.log('   Backup files created with .backup extension');
      }
    }
  }
}

// Parse command line arguments
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    backup: args.includes('--backup') || args.includes('-b'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

// Main execution
async function main(): Promise<void> {
  console.log('🚀 TypeScript Return Type Fixer\n');

  const options = parseArgs();
  const fixer = new ReturnTypeFixer(options);

  try {
    await fixer.run();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
