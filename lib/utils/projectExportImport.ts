/**
 * Project Export/Import Utilities
 *
 * Functions to export and import projects as JSON for backup and transfer
 */

import type { Timeline } from '@/types/timeline';

export type ExportedProject = {
  version: string;
  exportDate: string;
  projectId: string;
  projectName: string;
  timeline: Timeline;
  metadata: {
    clipCount: number;
    duration: number;
    tracks: number;
    hasAudio: boolean;
    hasTextOverlays: boolean;
    hasMarkers: boolean;
  };
};

/**
 * Export project to JSON
 * Creates a complete snapshot of the project timeline
 *
 * @param projectId - Project ID
 * @param projectName - Project name
 * @param timeline - Timeline data
 * @returns Serialized project object
 */
export function exportProjectToJSON(
  projectId: string,
  projectName: string,
  timeline: Timeline
): ExportedProject {
  // Calculate metadata
  const clipCount = timeline.clips.length;
  const duration = Math.max(
    ...timeline.clips.map((clip) => clip.timelinePosition + (clip.end - clip.start)),
    0
  );
  const tracks = Math.max(...timeline.clips.map((clip) => clip.trackIndex), 0) + 1;
  const hasAudio = timeline.clips.some((clip) => clip.hasAudio);
  const hasTextOverlays = (timeline.textOverlays?.length ?? 0) > 0;
  const hasMarkers = (timeline.markers?.length ?? 0) > 0;

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    projectId,
    projectName,
    timeline,
    metadata: {
      clipCount,
      duration,
      tracks,
      hasAudio,
      hasTextOverlays,
      hasMarkers,
    },
  };
}

/**
 * Download project as JSON file
 * Triggers browser download with formatted JSON
 *
 * @param exportedProject - Exported project object
 * @param filename - Download filename (without extension)
 */
export function downloadProjectJSON(exportedProject: ExportedProject, filename?: string): void {
  const json = JSON.stringify(exportedProject, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename
    ? `${filename}.json`
    : `${exportedProject.projectName}_${new Date().toISOString().split('T')[0]}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Validate imported project JSON
 * Checks structure and required fields
 *
 * @param data - Parsed JSON data
 * @returns Validation result with error message if invalid
 */
export function validateImportedProject(data: unknown): {
  valid: boolean;
  error?: string;
  project?: ExportedProject;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON format' };
  }

  const project = data as Partial<ExportedProject>;

  // Check version
  if (!project.version) {
    return { valid: false, error: 'Missing version field' };
  }

  // Check timeline
  if (!project.timeline) {
    return { valid: false, error: 'Missing timeline data' };
  }

  const timeline = project.timeline;

  // Validate timeline structure
  if (!timeline.projectId) {
    return { valid: false, error: 'Invalid timeline: missing projectId' };
  }

  if (!Array.isArray(timeline.clips)) {
    return { valid: false, error: 'Invalid timeline: clips must be an array' };
  }

  if (!timeline.output || !timeline.output.width || !timeline.output.height) {
    return { valid: false, error: 'Invalid timeline: missing output specifications' };
  }

  // Validate clips
  for (let i = 0; i < timeline.clips.length; i++) {
    const clip = timeline.clips[i];
    if (!clip) {
      return {
        valid: false,
        error: `Invalid clip at index ${i}: clip is undefined`,
      };
    }
    if (!clip.id || !clip.assetId || !clip.filePath) {
      return {
        valid: false,
        error: `Invalid clip at index ${i}: missing required fields (id, assetId, filePath)`,
      };
    }
    if (typeof clip.start !== 'number' || typeof clip.end !== 'number') {
      return {
        valid: false,
        error: `Invalid clip at index ${i}: start and end must be numbers`,
      };
    }
    if (typeof clip.timelinePosition !== 'number' || typeof clip.trackIndex !== 'number') {
      return {
        valid: false,
        error: `Invalid clip at index ${i}: timelinePosition and trackIndex must be numbers`,
      };
    }
  }

  return {
    valid: true,
    project: project as ExportedProject,
  };
}

/**
 * Import project from JSON file
 * Reads and validates JSON file
 *
 * @param file - File object from file input
 * @returns Promise with imported project or error
 */
export async function importProjectFromFile(file: File): Promise<{
  success: boolean;
  project?: ExportedProject;
  error?: string;
}> {
  try {
    // Check file type
    if (!file.name.endsWith('.json')) {
      return { success: false, error: 'File must be a JSON file (.json)' };
    }

    // Read file
    const text = await file.text();

    // Parse JSON
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return { success: false, error: 'Invalid JSON format: ' + (parseError as Error).message };
    }

    // Validate project
    const validation = validateImportedProject(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return { success: true, project: validation.project };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to read file: ' + (error as Error).message,
    };
  }
}

/**
 * Merge imported timeline with existing project
 * Useful for importing clips into current project
 *
 * @param currentTimeline - Current project timeline
 * @param importedTimeline - Imported timeline
 * @param options - Merge options
 * @returns Merged timeline
 */
export function mergeTimelines(
  currentTimeline: Timeline,
  importedTimeline: Timeline,
  options: {
    replaceAll?: boolean;
    offsetTime?: number;
    offsetTrack?: number;
  } = {}
): Timeline {
  const { replaceAll = false, offsetTime = 0, offsetTrack = 0 } = options;

  if (replaceAll) {
    // Replace entire timeline
    return {
      ...importedTimeline,
      projectId: currentTimeline.projectId, // Keep current project ID
    };
  }

  // Merge clips with offset
  const mergedClips = [
    ...currentTimeline.clips,
    ...importedTimeline.clips.map((clip) => ({
      ...clip,
      id: `imported-${clip.id}-${Date.now()}`, // Generate new IDs to avoid conflicts
      timelinePosition: clip.timelinePosition + offsetTime,
      trackIndex: clip.trackIndex + offsetTrack,
    })),
  ];

  // Merge text overlays
  const mergedTextOverlays = [
    ...(currentTimeline.textOverlays ?? []),
    ...(importedTimeline.textOverlays ?? []).map((overlay) => ({
      ...overlay,
      id: `imported-${overlay.id}-${Date.now()}`,
      timelinePosition: overlay.timelinePosition + offsetTime,
    })),
  ];

  // Merge markers
  const mergedMarkers = [
    ...(currentTimeline.markers ?? []),
    ...(importedTimeline.markers ?? []).map((marker) => ({
      ...marker,
      id: `imported-${marker.id}-${Date.now()}`,
      time: marker.time + offsetTime,
    })),
  ];

  return {
    ...currentTimeline,
    clips: mergedClips,
    textOverlays: mergedTextOverlays,
    markers: mergedMarkers,
    tracks: currentTimeline.tracks ?? importedTimeline.tracks,
    groups: currentTimeline.groups ?? importedTimeline.groups,
    guides: currentTimeline.guides ?? importedTimeline.guides,
  };
}
