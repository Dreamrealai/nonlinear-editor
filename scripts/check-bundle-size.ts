/**
 * Bundle Size Checker
 * Analyzes the Next.js build output and reports on bundle sizes
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

interface BundleStat {
  path: string;
  size: number;
  sizeFormatted: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getAllFiles = (dirPath: string, arrayOfFiles: BundleStat[] = []): BundleStat[] => {
  try {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push({
          path: filePath,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
        });
      }
    });

    return arrayOfFiles;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return arrayOfFiles;
  }
};

const checkBundleSize = () => {
  const buildDir = join(process.cwd(), '.next');

  try {
    console.log('📦 Analyzing bundle size...\n');

    const files = getAllFiles(buildDir);
    const sortedFiles = files.sort((a, b) => b.size - a.size);

    // Calculate total size
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    console.log('Top 20 largest files:');
    console.log('─'.repeat(80));

    sortedFiles.slice(0, 20).forEach((file, index) => {
      const relativePath = file.path.replace(buildDir, '.next');
      console.log(
        `${(index + 1).toString().padStart(2)}. ${file.sizeFormatted.padStart(10)} - ${relativePath}`
      );
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 Total bundle size: ${formatBytes(totalSize)}`);

    // Warning thresholds
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

    if (totalSize > MAX_TOTAL_SIZE) {
      console.log(`\n⚠️  Warning: Total bundle size exceeds ${formatBytes(MAX_TOTAL_SIZE)}`);
    }

    const largeFiles = sortedFiles.filter((file) => file.size > MAX_FILE_SIZE);
    if (largeFiles.length > 0) {
      console.log(
        `\n⚠️  Warning: ${largeFiles.length} files exceed ${formatBytes(MAX_FILE_SIZE)}:`
      );
      largeFiles.forEach((file) => {
        const relativePath = file.path.replace(buildDir, '.next');
        console.log(`   - ${file.sizeFormatted.padStart(10)} - ${relativePath}`);
      });
    }

    console.log('\n✅ Bundle size analysis complete');
  } catch (error) {
    console.error('❌ Error analyzing bundle size:', error);
    process.exit(1);
  }
};

checkBundleSize();
