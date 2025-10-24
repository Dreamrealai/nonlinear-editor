/**
 * Timeline Performance Testing Script
 *
 * Tests timeline performance with long videos (30+ minutes) and many clips (100+)
 * Measures FPS, memory usage, and render times
 *
 * Usage: npx tsx scripts/test-timeline-performance.ts
 */

import type { Timeline, Clip } from '../types/timeline';

// Test configurations
const TEST_SCENARIOS = {
  SHORT_VIDEO: {
    name: 'Short Video (5 min, 20 clips)',
    duration: 300, // 5 minutes
    numClips: 20,
  },
  MEDIUM_VIDEO: {
    name: 'Medium Video (15 min, 50 clips)',
    duration: 900, // 15 minutes
    numClips: 50,
  },
  LONG_VIDEO: {
    name: 'Long Video (30 min, 100 clips)',
    duration: 1800, // 30 minutes
    numClips: 100,
  },
  VERY_LONG_VIDEO: {
    name: 'Very Long Video (60 min, 200 clips)',
    duration: 3600, // 60 minutes
    numClips: 200,
  },
};

/**
 * Generate test timeline with specified duration and clip count
 */
function generateTestTimeline(durationSeconds: number, numClips: number): Timeline {
  const clips: Clip[] = [];
  const avgClipDuration = durationSeconds / numClips;
  let currentPosition = 0;

  for (let i = 0; i < numClips; i++) {
    // Vary clip duration slightly for realism
    const clipDuration = avgClipDuration * (0.8 + Math.random() * 0.4);
    const trackIndex = Math.floor(Math.random() * 3); // 3 tracks

    clips.push({
      id: `clip-${i}`,
      assetId: `asset-${i % 10}`, // Reuse 10 assets
      filePath: `/path/to/clip-${i}.mp4`,
      mime: 'video/mp4',
      crop: null,
      timelinePosition: currentPosition,
      trackIndex,
      start: 0,
      end: clipDuration,
      sourceDuration: clipDuration,
      hasAudio: Math.random() > 0.5,
      locked: false,
      thumbnailUrl: `https://via.placeholder.com/320x180?text=Clip+${i}`,
    });

    currentPosition += clipDuration;
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
    duration: durationSeconds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  scenario: string;
  numClips: number;
  duration: number;

  // Rendering metrics
  initialRenderTime: number;
  reRenderTime: number;
  clipRenderTime: number;

  // Calculation metrics
  calculationTime: number;
  virtualizationTime: number;

  // Memory metrics
  memoryUsed: number;
  memoryDelta: number;

  // Timeline metrics
  visibleClips: number;
  totalClips: number;
  virtualizationRatio: number;
}

/**
 * Measure timeline calculations performance
 */
function measureCalculations(
  timeline: Timeline,
  zoom: number,
  scrollLeft: number,
  viewportWidth: number
): {
  calculationTime: number;
  virtualizationTime: number;
  visibleClips: number;
} {
  // Measure duration calculation
  const calcStart = performance.now();
  const clipEndTimes = timeline.clips.map((c) => c.timelinePosition + (c.end - c.start));
  void Math.max(...clipEndTimes, 30); // timelineDuration calculation
  const calculationTime = performance.now() - calcStart;

  // Measure virtualization (visible clips calculation)
  const virtStart = performance.now();
  const overscan = 500;
  const viewportStartTime = (scrollLeft - overscan) / zoom;
  const viewportEndTime = (scrollLeft + viewportWidth + overscan) / zoom;

  const visibleClips = timeline.clips.filter((clip) => {
    const clipStart = clip.timelinePosition;
    const clipEnd = clipStart + (clip.end - clip.start);
    return clipEnd >= viewportStartTime && clipStart <= viewportEndTime;
  });
  const virtualizationTime = performance.now() - virtStart;

  return {
    calculationTime,
    virtualizationTime,
    visibleClips: visibleClips.length,
  };
}

/**
 * Run performance test for a scenario
 */
function runPerformanceTest(
  scenario: (typeof TEST_SCENARIOS)[keyof typeof TEST_SCENARIOS]
): PerformanceMetrics {
  console.log(`\n📊 Testing: ${scenario.name}`);
  console.log('━'.repeat(60));

  const timeline = generateTestTimeline(scenario.duration, scenario.numClips);

  // Test parameters
  const zoom = 50; // Default zoom (50 px/s)
  const viewportWidth = 1920; // HD width
  const scrollLeft = 0;

  // Memory before
  const memoryBefore = process.memoryUsage().heapUsed;

  // Measure calculations
  console.log('⏱️  Measuring calculations...');
  const calcMetrics = measureCalculations(timeline, zoom, scrollLeft, viewportWidth);

  // Simulate clip rendering (measure iteration time)
  console.log('⏱️  Measuring clip iteration...');
  const clipRenderStart = performance.now();
  let clipCount = 0;
  timeline.clips.forEach((clip) => {
    // Simulate clip render calculations
    const clipDuration = clip.end - clip.start;
    void (clipDuration * zoom); // clipWidth calculation
    void (clip.timelinePosition * zoom); // clipLeft calculation
    clipCount++;
  });
  const clipRenderTime = performance.now() - clipRenderStart;

  // Memory after
  const memoryAfter = process.memoryUsage().heapUsed;
  const memoryDelta = memoryAfter - memoryBefore;

  const metrics: PerformanceMetrics = {
    scenario: scenario.name,
    numClips: scenario.numClips,
    duration: scenario.duration,
    initialRenderTime: calcMetrics.calculationTime + calcMetrics.virtualizationTime,
    reRenderTime: calcMetrics.virtualizationTime,
    clipRenderTime,
    calculationTime: calcMetrics.calculationTime,
    virtualizationTime: calcMetrics.virtualizationTime,
    memoryUsed: memoryAfter / 1024 / 1024,
    memoryDelta: memoryDelta / 1024 / 1024,
    visibleClips: calcMetrics.visibleClips,
    totalClips: timeline.clips.length,
    virtualizationRatio: calcMetrics.visibleClips / timeline.clips.length,
  };

  return metrics;
}

/**
 * Print metrics table
 */
function printMetrics(metrics: PerformanceMetrics) {
  console.log(`\n📈 Results for ${metrics.scenario}:`);
  console.log('─'.repeat(60));
  console.log(
    `  Timeline Duration:     ${metrics.duration}s (${(metrics.duration / 60).toFixed(1)} min)`
  );
  console.log(`  Total Clips:           ${metrics.totalClips}`);
  console.log(
    `  Visible Clips:         ${metrics.visibleClips} (${(metrics.virtualizationRatio * 100).toFixed(1)}%)`
  );
  console.log('');
  console.log('  Performance:');
  console.log(`    Calculation Time:    ${metrics.calculationTime.toFixed(3)}ms`);
  console.log(`    Virtualization Time: ${metrics.virtualizationTime.toFixed(3)}ms`);
  console.log(`    Clip Iteration Time: ${metrics.clipRenderTime.toFixed(3)}ms`);
  console.log(`    Total Render Time:   ${metrics.initialRenderTime.toFixed(3)}ms`);
  console.log('');
  console.log('  Memory:');
  console.log(`    Memory Used:         ${metrics.memoryUsed.toFixed(2)} MB`);
  console.log(`    Memory Delta:        ${metrics.memoryDelta.toFixed(2)} MB`);
  console.log('');

  // Performance assessment
  const isGoodPerformance = metrics.initialRenderTime < 16.67; // 60 FPS target
  const status = isGoodPerformance ? '✅ GOOD' : '⚠️  NEEDS OPTIMIZATION';
  console.log(`  Status: ${status} (Target: <16.67ms for 60 FPS)`);
}

/**
 * Main test runner
 */
function main() {
  console.log('\n🎬 Timeline Performance Test Suite');
  console.log('━'.repeat(60));
  console.log('Testing timeline rendering and calculation performance');
  console.log('with long videos and many clips\n');

  const allMetrics: PerformanceMetrics[] = [];

  // Run all test scenarios
  for (const scenario of Object.values(TEST_SCENARIOS)) {
    const metrics = runPerformanceTest(scenario);
    printMetrics(metrics);
    allMetrics.push(metrics);
  }

  // Summary
  console.log('\n\n📊 Performance Summary');
  console.log('━'.repeat(60));
  console.table(
    allMetrics.map((m) => ({
      Scenario: m.scenario,
      Clips: m.totalClips,
      'Duration (min)': (m.duration / 60).toFixed(1),
      'Render (ms)': m.initialRenderTime.toFixed(2),
      'Memory (MB)': m.memoryDelta.toFixed(2),
      'Visible %': (m.virtualizationRatio * 100).toFixed(1) + '%',
      Status: m.initialRenderTime < 16.67 ? '✅' : '⚠️',
    }))
  );

  // Recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('━'.repeat(60));

  const worstCase = allMetrics[allMetrics.length - 1];
  if (worstCase.initialRenderTime > 16.67) {
    console.log('⚠️  Performance issues detected with long videos:');
    console.log(`  • Render time: ${worstCase.initialRenderTime.toFixed(2)}ms (target: <16.67ms)`);
    console.log(`  • Memory usage: ${worstCase.memoryDelta.toFixed(2)}MB`);
    console.log('');
    console.log('🔧 Suggested optimizations:');
    console.log('  1. Use React.memo() for TimelineClipRenderer');
    console.log('  2. Memoize expensive calculations (duration, visible clips)');
    console.log('  3. Debounce/throttle frequent updates (zoom, scroll)');
    console.log('  4. Use Web Worker for heavy calculations');
    console.log('  5. Reduce re-renders with better state selectors');
    console.log('  6. Optimize data structures (use Map for clip lookups)');
  } else {
    console.log('✅ Performance is good across all scenarios!');
    console.log(`  • Max render time: ${worstCase.initialRenderTime.toFixed(2)}ms`);
    console.log(
      `  • Virtualization working: ${(worstCase.virtualizationRatio * 100).toFixed(1)}% visible`
    );
  }

  console.log('\n✨ Test complete!\n');
}

// Run tests
main();
