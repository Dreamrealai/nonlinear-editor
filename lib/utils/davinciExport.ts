/**
 * DaVinci Resolve Export Utilities
 *
 * Functions to export timeline in DaVinci Resolve compatible formats:
 * - EDL (Edit Decision List - CMX 3600 format)
 * - Final Cut Pro XML (for advanced interchange)
 */

import type { Timeline } from '@/types/timeline';

/**
 * Format timecode from seconds to HH:MM:SS:FF format
 * Uses 30fps as standard frame rate
 *
 * @param seconds - Time in seconds
 * @param fps - Frames per second (default: 30)
 * @returns Formatted timecode string
 */
function formatTimecode(seconds: number, fps: number = 30): string {
  const totalFrames = Math.floor(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const secs = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mins = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * Export timeline to EDL format (CMX 3600)
 * Compatible with DaVinci Resolve, Premiere Pro, Final Cut Pro, etc.
 *
 * @param projectName - Project name
 * @param timeline - Timeline data
 * @param fps - Frame rate (default: 30)
 * @returns EDL formatted string
 */
export function exportTimelineToEDL(
  projectName: string,
  timeline: Timeline,
  fps: number = 30
): string {
  const lines: string[] = [];

  // EDL Header
  lines.push(`TITLE: ${projectName}`);
  lines.push('FCM: NON-DROP FRAME'); // Frame count mode
  lines.push('');

  // Sort clips by timeline position for proper sequence
  const sortedClips = [...timeline.clips].sort((a, b) => a.timelinePosition - b.timelinePosition);

  // Generate EDL entries for each clip
  sortedClips.forEach((clip, index) => {
    const eventNumber = String(index + 1).padStart(3, '0');
    const reelName = 'AX'; // Standard reel name for digital files
    const trackType = 'V'; // V = Video, A = Audio, A1/A2 = Audio channels
    const transitionType = 'C'; // C = Cut, D = Dissolve

    // Source timecodes (from the clip's source file)
    const sourceIn = formatTimecode(clip.start, fps);
    const sourceOut = formatTimecode(clip.end, fps);

    // Record timecodes (position on timeline)
    const recordIn = formatTimecode(clip.timelinePosition, fps);
    const clipDuration = clip.end - clip.start;
    const recordOut = formatTimecode(clip.timelinePosition + clipDuration, fps);

    // EDL event line
    lines.push(
      `${eventNumber}  ${reelName}       ${trackType}     ${transitionType}        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`
    );

    // Clip name comment
    const clipName = clip.filePath.split('/').pop() || clip.filePath;
    lines.push(`* FROM CLIP NAME: ${clipName}`);

    // Add source file path as comment for reference
    lines.push(`* SOURCE FILE: ${clip.filePath}`);

    // If clip has speed changes, add motion effect comment
    if (clip.speed && clip.speed !== 1.0) {
      lines.push(`* SPEED: ${(clip.speed * 100).toFixed(0)}%`);
    }

    lines.push('');
  });

  // Add audio tracks if present
  const audioClips = sortedClips.filter((clip) => clip.hasAudio);
  if (audioClips.length > 0) {
    lines.push('');
    lines.push('* AUDIO TRACKS');
    lines.push('');

    audioClips.forEach((clip, index) => {
      const eventNumber = String(sortedClips.length + index + 1).padStart(3, '0');
      const reelName = 'AX';
      const trackType = 'A'; // Audio track
      const transitionType = 'C';

      const sourceIn = formatTimecode(clip.start, fps);
      const sourceOut = formatTimecode(clip.end, fps);
      const recordIn = formatTimecode(clip.timelinePosition, fps);
      const clipDuration = clip.end - clip.start;
      const recordOut = formatTimecode(clip.timelinePosition + clipDuration, fps);

      lines.push(
        `${eventNumber}  ${reelName}       ${trackType}     ${transitionType}        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`
      );

      const clipName = clip.filePath.split('/').pop() || clip.filePath;
      lines.push(`* FROM CLIP NAME: ${clipName}`);
      lines.push('');
    });
  }

  // Add markers as comments if present
  if (timeline.markers && timeline.markers.length > 0) {
    lines.push('');
    lines.push('* MARKERS');
    lines.push('');

    timeline.markers.forEach((marker) => {
      const markerTimecode = formatTimecode(marker.time, fps);
      lines.push(`* ${markerTimecode} - ${marker.label || 'Marker'}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Download timeline as EDL file
 * Triggers browser download with EDL content
 *
 * @param projectName - Project name
 * @param timeline - Timeline data
 * @param fps - Frame rate (default: 30)
 * @param filename - Optional custom filename
 */
export function downloadTimelineAsEDL(
  projectName: string,
  timeline: Timeline,
  fps: number = 30,
  filename?: string
): void {
  const edl = exportTimelineToEDL(projectName, timeline, fps);
  const blob = new Blob([edl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename
    ? `${filename}.edl`
    : `${projectName}_${new Date().toISOString().split('T')[0]}.edl`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export timeline to Final Cut Pro XML format
 * More advanced format that preserves effects, transitions, and metadata
 *
 * Note: This is a simplified XML export. Full FCP XML is very complex.
 * For production use, consider using a dedicated XML library.
 *
 * @param projectName - Project name
 * @param timeline - Timeline data
 * @returns XML formatted string
 */
export function exportTimelineToFCPXML(projectName: string, timeline: Timeline): string {
  const fps = timeline.output.fps || 30;
  const width = timeline.output.width;
  const height = timeline.output.height;

  const xmlLines: string[] = [];

  // XML Header
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlLines.push('<!DOCTYPE xmeml>');
  xmlLines.push('<xmeml version="5">');
  xmlLines.push('  <sequence>');
  xmlLines.push(`    <name>${projectName}</name>`);
  xmlLines.push('    <rate>');
  xmlLines.push(`      <timebase>${fps}</timebase>`);
  xmlLines.push('      <ntsc>FALSE</ntsc>');
  xmlLines.push('    </rate>');
  xmlLines.push('    <media>');
  xmlLines.push('      <video>');
  xmlLines.push('        <format>');
  xmlLines.push(`          <samplecharacteristics>`);
  xmlLines.push(`            <width>${width}</width>`);
  xmlLines.push(`            <height>${height}</height>`);
  xmlLines.push(`          </samplecharacteristics>`);
  xmlLines.push('        </format>');
  xmlLines.push('        <track>');

  // Add clips
  timeline.clips.forEach((clip, index) => {
    const startFrame = Math.floor(clip.timelinePosition * fps);
    const endFrame = Math.floor((clip.timelinePosition + (clip.end - clip.start)) * fps);
    const clipName = clip.filePath.split('/').pop() || `clip_${index + 1}`;

    xmlLines.push('          <clipitem id="' + clip.id + '">');
    xmlLines.push(`            <name>${clipName}</name>`);
    xmlLines.push(`            <start>${startFrame}</start>`);
    xmlLines.push(`            <end>${endFrame}</end>`);
    xmlLines.push('            <file id="' + clip.assetId + '">');
    xmlLines.push(`              <name>${clipName}</name>`);
    xmlLines.push(`              <pathurl>${clip.filePath}</pathurl>`);
    xmlLines.push('            </file>');
    xmlLines.push('          </clipitem>');
  });

  xmlLines.push('        </track>');
  xmlLines.push('      </video>');
  xmlLines.push('    </media>');
  xmlLines.push('  </sequence>');
  xmlLines.push('</xmeml>');

  return xmlLines.join('\n');
}

/**
 * Download timeline as FCP XML file
 *
 * @param projectName - Project name
 * @param timeline - Timeline data
 * @param filename - Optional custom filename
 */
export function downloadTimelineAsFCPXML(
  projectName: string,
  timeline: Timeline,
  filename?: string
): void {
  const xml = exportTimelineToFCPXML(projectName, timeline);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename
    ? `${filename}.xml`
    : `${projectName}_${new Date().toISOString().split('T')[0]}.xml`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
