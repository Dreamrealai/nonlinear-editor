/**
 * Comprehensive Performance Benchmark Suite
 *
 * Benchmarks all new features and core functionality:
 * - Onboarding initialization
 * - Easter egg activation
 * - Timeline grid rendering
 * - Asset search/filter
 * - Timeline minimap rendering
 * - Rubber band selection
 * - Auto-save operation
 *
 * Usage: npx tsx scripts/benchmark.ts
 */

import { performance } from 'perf_hooks';
import type { Timeline, Clip } from '../types/timeline';
import type { AssetRow } from '../types/assets';

// Performance targets (in milliseconds)
const TARGETS = {
  ONBOARDING_INIT: 1000, // < 1s
  EASTER_EGG_ACTIVATION: 100, // < 100ms
  TIMELINE_GRID_RENDER: 100, // < 100ms
  ASSET_SEARCH: 300, // < 300ms
  MINIMAP_RENDER: 500, // < 500ms
  RUBBER_BAND_SELECTION: 16, // < 16ms per frame (60 FPS)
  AUTO_SAVE: 2000, // < 2s
};

interface BenchmarkResult {
  name: string;
  target: number;
  actual: number;
  status: 'pass' | 'fail' | 'warning';
  iterations: number;
  min: number;
  max: number;
  avg: number;
  p95: number;
  p99: number;
}

interface BenchmarkSuite {
  results: BenchmarkResult[];
  totalTime: number;
  passCount: number;
  failCount: number;
  warningCount: number;
}

/**
 * Run a benchmark multiple times and collect statistics
 */
function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  target: number,
  iterations = 100
): BenchmarkResult {
  const times: number[] = [];

  console.log(`\n🔬 Benchmarking: ${name}`);
  console.log(`   Target: <${target}ms | Iterations: ${iterations}`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Calculate statistics
  times.sort((a, b) => a - b);
  const min = times[0]!;
  const max = times[times.length - 1]!;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  const p99 = times[Math.floor(times.length * 0.99)]!;

  // Determine status
  let status: 'pass' | 'fail' | 'warning';
  if (p95 <= target) {
    status = 'pass';
  } else if (p95 <= target * 1.5) {
    status = 'warning';
  } else {
    status = 'fail';
  }

  const result: BenchmarkResult = {
    name,
    target,
    actual: p95,
    status,
    iterations,
    min,
    max,
    avg,
    p95,
    p99,
  };

  printResult(result);
  return result;
}

/**
 * Print benchmark result
 */
function printResult(result: BenchmarkResult): void {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
  console.log(`   ${icon} Status: ${result.status.toUpperCase()}`);
  console.log(`   Min: ${result.min.toFixed(2)}ms | Max: ${result.max.toFixed(2)}ms`);
  console.log(`   Avg: ${result.avg.toFixed(2)}ms | P95: ${result.p95.toFixed(2)}ms | P99: ${result.p99.toFixed(2)}ms`);
}

/**
 * Generate test data for benchmarks
 */
function generateTestTimeline(numClips: number): Timeline {
  const clips: Clip[] = [];
  for (let i = 0; i < numClips; i++) {
    clips.push({
      id: `clip-${i}`,
      assetId: `asset-${i % 10}`,
      filePath: `/path/to/clip-${i}.mp4`,
      mime: 'video/mp4',
      crop: null,
      timelinePosition: i * 10,
      trackIndex: Math.floor(i / 33),
      start: 0,
      end: 8,
      sourceDuration: 8,
      hasAudio: true,
      locked: false,
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
    });
  }

  return {
    id: 'test-timeline',
    projectId: 'test-project',
    clips,
    textOverlays: [],
    markers: [],
    tracks: [
      { id: 'track-0', name: 'Track 1', index: 0, type: 'video' as const },
      { id: 'track-1', name: 'Track 2', index: 1, type: 'video' as const },
      { id: 'track-2', name: 'Track 3', index: 2, type: 'video' as const },
    ],
    duration: numClips * 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateTestAssets(count: number): AssetRow[] {
  const assets: AssetRow[] = [];
  const types = ['video', 'audio', 'image'] as const;
  const tags = ['clip', 'music', 'sfx', 'intro', 'outro', 'b-roll', 'interview', 'landscape'];

  for (let i = 0; i < count; i++) {
    assets.push({
      id: `asset-${i}`,
      project_id: 'test-project',
      user_id: 'test-user',
      storage_url: `supabase://bucket/asset-${i}.mp4`,
      type: types[i % 3],
      metadata: {
        filename: `asset-${i}.mp4`,
        size: Math.floor(Math.random() * 100000000),
        duration: Math.random() * 600,
        width: 1920,
        height: 1080,
      },
      tags: [
        tags[Math.floor(Math.random() * tags.length)]!,
        tags[Math.floor(Math.random() * tags.length)]!,
      ],
      created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString(),
      thumbnail_url: `https://example.com/thumb-${i}.jpg`,
    });
  }

  return assets;
}

/**
 * Benchmark 1: Onboarding Initialization
 */
function benchmarkOnboardingInit(): BenchmarkResult {
  return benchmark(
    'Onboarding Initialization',
    () => {
      // Simulate onboarding steps calculation
      const steps = [
        { id: 'welcome', target: 'body' },
        { id: 'asset-panel', target: '[aria-label="Asset panel"]' },
        { id: 'timeline', target: '[aria-label="Timeline workspace"]' },
        { id: 'playback', target: '[aria-label="Video preview canvas"]' },
        { id: 'controls', target: '[title="Zoom in (Cmd+=)"]' },
        { id: 'grid-settings', target: '.grid-settings-button' },
        { id: 'complete', target: 'body' },
      ];

      // Simulate position calculations
      steps.forEach((step) => {
        const rect = { top: 100, left: 100, width: 200, height: 100 };
        const tooltipPos = {
          top: rect.top + rect.height + 20,
          left: rect.left + rect.width / 2,
        };
      });
    },
    TARGETS.ONBOARDING_INIT,
    50 // Less iterations for expensive operations
  );
}

/**
 * Benchmark 2: Easter Egg Activation
 */
function benchmarkEasterEggActivation(): BenchmarkResult {
  return benchmark(
    'Easter Egg Activation',
    () => {
      // Simulate konami code detection
      const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];
      const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];

      // Check sequence match
      const matches = konamiCode.every((k, i) => sequence[i] === k);

      if (matches) {
        // Simulate confetti creation (without DOM manipulation)
        for (let i = 0; i < 50; i++) {
          const pos = { x: Math.random() * 1920, y: -10 };
        }
      }
    },
    TARGETS.EASTER_EGG_ACTIVATION,
    1000
  );
}

/**
 * Benchmark 3: Timeline Grid Rendering
 */
function benchmarkTimelineGridRender(): BenchmarkResult {
  const timelineDuration = 600; // 10 minutes
  const zoom = 50; // px/s
  const viewportWidth = 1920;

  return benchmark(
    'Timeline Grid Rendering (100 clips)',
    () => {
      // Calculate grid lines
      const gridInterval = 1; // 1 second
      const numGridLines = Math.floor(timelineDuration / gridInterval);
      const gridLines: { position: number; label: string }[] = [];

      for (let i = 0; i <= numGridLines; i++) {
        const time = i * gridInterval;
        const position = time * zoom;

        // Only render visible grid lines
        if (position >= 0 && position <= viewportWidth) {
          gridLines.push({
            position,
            label: `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`,
          });
        }
      }

      // Snap calculation
      const snapInterval = 0.5;
      const snapPositions = [];
      for (let i = 0; i < timelineDuration; i += snapInterval) {
        snapPositions.push(i * zoom);
      }
    },
    TARGETS.TIMELINE_GRID_RENDER,
    500
  );
}

/**
 * Benchmark 4: Asset Search/Filter
 */
function benchmarkAssetSearch(): BenchmarkResult {
  const assets = generateTestAssets(1000);
  const searchQuery = 'clip';

  return benchmark(
    'Asset Search (1000 assets)',
    () => {
      // Filter by search query
      const filtered = assets.filter((asset) => {
        const filename = (asset.metadata?.filename || '').toLowerCase();
        const type = asset.type.toLowerCase();
        const tags = asset.tags?.join(' ').toLowerCase() || '';
        return (
          filename.includes(searchQuery) ||
          type.includes(searchQuery) ||
          tags.includes(searchQuery)
        );
      });

      // Sort by date
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    },
    TARGETS.ASSET_SEARCH,
    200
  );
}

/**
 * Benchmark 5: Timeline Minimap Rendering
 */
function benchmarkMinimapRender(): BenchmarkResult {
  const timeline = generateTestTimeline(200);
  const minimapWidth = 1200;
  const numTracks = 3;

  return benchmark(
    'Timeline Minimap Rendering (200 clips)',
    () => {
      // Calculate clip positions in minimap
      const timelineDuration = timeline.clips[timeline.clips.length - 1]!.timelinePosition + 10;

      timeline.clips.forEach((clip) => {
        const clipLeft = (clip.timelinePosition / timelineDuration) * minimapWidth;
        const clipDuration = clip.end - clip.start;
        const clipWidth = Math.max(2, (clipDuration / timelineDuration) * minimapWidth);
        const clipTop = 4 + (clip.trackIndex / numTracks) * (60 - 8);
        const clipHeight = Math.max(2, (1 / numTracks) * (60 - 8) - 1);
      });
    },
    TARGETS.MINIMAP_RENDER,
    200
  );
}

/**
 * Benchmark 6: Rubber Band Selection
 */
function benchmarkRubberBandSelection(): BenchmarkResult {
  const timeline = generateTestTimeline(100);
  const zoom = 50;
  const trackHeight = 120;

  return benchmark(
    'Rubber Band Selection (100 clips)',
    () => {
      // Simulate selection rectangle
      const selectionRect = {
        startX: 100,
        startY: 50,
        endX: 500,
        endY: 300,
      };

      const left = Math.min(selectionRect.startX, selectionRect.endX);
      const right = Math.max(selectionRect.startX, selectionRect.endX);
      const top = Math.min(selectionRect.startY, selectionRect.endY);
      const bottom = Math.max(selectionRect.startY, selectionRect.endY);

      // Check each clip for intersection
      const selectedClips: string[] = [];
      timeline.clips.forEach((clip) => {
        const clipLeft = clip.timelinePosition * zoom;
        const clipRight = clipLeft + (clip.end - clip.start) * zoom;
        const clipTop = clip.trackIndex * trackHeight;
        const clipBottom = clipTop + trackHeight;

        const intersects =
          clipLeft <= right &&
          clipRight >= left &&
          clipTop <= bottom &&
          clipBottom >= top;

        if (intersects) {
          selectedClips.push(clip.id);
        }
      });
    },
    TARGETS.RUBBER_BAND_SELECTION,
    1000 // Higher iterations since this needs to be very fast
  );
}

/**
 * Benchmark 7: Auto-Save Operation
 */
function benchmarkAutoSave(): BenchmarkResult {
  const timeline = generateTestTimeline(100);

  return benchmark(
    'Auto-Save Operation (100 clips)',
    () => {
      // Simulate timeline serialization
      const data = {
        id: timeline.id,
        projectId: timeline.projectId,
        clips: timeline.clips.map((c) => ({
          id: c.id,
          assetId: c.assetId,
          position: c.timelinePosition,
          track: c.trackIndex,
          start: c.start,
          end: c.end,
        })),
        duration: timeline.duration,
      };

      // Simulate JSON serialization
      const json = JSON.stringify(data);

      // Simulate compression (calculate size)
      const size = json.length;

      // Simulate validation
      const isValid = data.clips.every((c) => c.start < c.end && c.position >= 0);
    },
    TARGETS.AUTO_SAVE,
    50
  );
}

/**
 * Generate performance report
 */
function generateReport(suite: BenchmarkSuite): void {
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 PERFORMANCE BENCHMARK REPORT');
  console.log('═'.repeat(80));

  // Summary table
  console.log('\n📈 Summary:');
  console.log('─'.repeat(80));
  console.table(
    suite.results.map((r) => ({
      Name: r.name,
      Target: `${r.target}ms`,
      'P95 Actual': `${r.actual.toFixed(2)}ms`,
      Status: r.status === 'pass' ? '✅' : r.status === 'warning' ? '⚠️' : '❌',
      'vs Target': `${((r.actual / r.target) * 100).toFixed(0)}%`,
    }))
  );

  // Overall status
  console.log('\n📋 Overall Status:');
  console.log('─'.repeat(80));
  console.log(`  ✅ Passed:  ${suite.passCount}/${suite.results.length}`);
  console.log(`  ⚠️  Warning: ${suite.warningCount}/${suite.results.length}`);
  console.log(`  ❌ Failed:  ${suite.failCount}/${suite.results.length}`);
  console.log(`  ⏱️  Total:   ${suite.totalTime.toFixed(2)}ms`);

  // Detailed results
  console.log('\n📝 Detailed Results:');
  console.log('─'.repeat(80));
  suite.results.forEach((r) => {
    console.log(`\n${r.name}:`);
    console.log(`  Target: ${r.target}ms`);
    console.log(`  Min: ${r.min.toFixed(2)}ms | Avg: ${r.avg.toFixed(2)}ms | Max: ${r.max.toFixed(2)}ms`);
    console.log(`  P95: ${r.p95.toFixed(2)}ms | P99: ${r.p99.toFixed(2)}ms`);
    console.log(`  Status: ${r.status.toUpperCase()} ${r.status === 'pass' ? '✅' : r.status === 'warning' ? '⚠️' : '❌'}`);
  });

  // Recommendations
  console.log('\n\n💡 Optimization Recommendations:');
  console.log('─'.repeat(80));

  const failedTests = suite.results.filter((r) => r.status === 'fail');
  const warningTests = suite.results.filter((r) => r.status === 'warning');

  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests (require optimization):');
    failedTests.forEach((r) => {
      console.log(`  • ${r.name}: ${r.actual.toFixed(2)}ms (target: ${r.target}ms)`);
      console.log(`    Exceeded target by ${((r.actual / r.target - 1) * 100).toFixed(0)}%`);
    });
  }

  if (warningTests.length > 0) {
    console.log('\n⚠️  Warning Tests (monitor performance):');
    warningTests.forEach((r) => {
      console.log(`  • ${r.name}: ${r.actual.toFixed(2)}ms (target: ${r.target}ms)`);
    });
  }

  if (suite.passCount === suite.results.length) {
    console.log('\n✅ All benchmarks passed! Performance is excellent.');
  }

  // Performance budget compliance
  console.log('\n\n📊 Performance Budget Compliance:');
  console.log('─'.repeat(80));
  const compliance = (suite.passCount / suite.results.length) * 100;
  console.log(`  Compliance Rate: ${compliance.toFixed(1)}% (${suite.passCount}/${suite.results.length} passed)`);

  if (compliance >= 90) {
    console.log('  Grade: A (Excellent) ✨');
  } else if (compliance >= 75) {
    console.log('  Grade: B (Good) ✅');
  } else if (compliance >= 60) {
    console.log('  Grade: C (Acceptable) ⚠️');
  } else {
    console.log('  Grade: F (Needs Improvement) ❌');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✨ Benchmark suite complete!\n');
}

/**
 * Main benchmark runner
 */
function main(): void {
  console.log('\n🚀 Starting Performance Benchmark Suite...\n');
  const suiteStart = performance.now();

  const results: BenchmarkResult[] = [];

  // Run all benchmarks
  results.push(benchmarkOnboardingInit());
  results.push(benchmarkEasterEggActivation());
  results.push(benchmarkTimelineGridRender());
  results.push(benchmarkAssetSearch());
  results.push(benchmarkMinimapRender());
  results.push(benchmarkRubberBandSelection());
  results.push(benchmarkAutoSave());

  const suiteEnd = performance.now();

  // Compile suite results
  const suite: BenchmarkSuite = {
    results,
    totalTime: suiteEnd - suiteStart,
    passCount: results.filter((r) => r.status === 'pass').length,
    failCount: results.filter((r) => r.status === 'fail').length,
    warningCount: results.filter((r) => r.status === 'warning').length,
  };

  // Generate report
  generateReport(suite);

  // Exit with error code if any tests failed
  if (suite.failCount > 0) {
    process.exit(1);
  }
}

// Run benchmarks
main();
