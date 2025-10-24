/**
 * Screen Reader Announcer Utility
 *
 * Provides accessible announcements for dynamic content changes that
 * would otherwise be missed by screen readers.
 *
 * Creates a visually hidden live region that screen readers can detect.
 */

let announcer: HTMLDivElement | null = null;

/**
 * Initialize the screen reader announcer
 * Creates a visually hidden ARIA live region
 */
function getAnnouncer(): HTMLDivElement {
  if (announcer) {
    return announcer;
  }

  // Create announcer element
  announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('role', 'status');
  announcer.className = 'sr-only'; // Visually hidden but accessible to screen readers

  // Add visually hidden styles inline as fallback
  Object.assign(announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(announcer);

  return announcer;
}

/**
 * Announce a message to screen readers
 * @param message - The message to announce
 * @param priority - Priority level ('polite' or 'assertive')
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcerEl = getAnnouncer();

  // Update priority if needed
  announcerEl.setAttribute('aria-live', priority);

  // Clear previous message
  announcerEl.textContent = '';

  // Set new message after a brief delay to ensure screen readers detect the change
  setTimeout((): void => {
    announcerEl.textContent = message;
  }, 100);
}

/**
 * Announce an assertive message (interrupts current screen reader output)
 * Use sparingly - only for critical updates
 */
export function announceAssertive(message: string): void {
  announce(message, 'assertive');
}

/**
 * Clean up the announcer element
 * Should be called when the app unmounts
 */
export function cleanupAnnouncer(): void {
  if (announcer && announcer.parentNode) {
    announcer.parentNode.removeChild(announcer);
    announcer = null;
  }
}

// Timeline-specific announcement helpers
export const timelineAnnouncements = {
  clipAdded: (filename: string, track: number): void =>
    announce(`Clip ${filename} added to track ${track + 1}`),

  clipRemoved: (filename: string): void => announce(`Clip ${filename} removed from timeline`),

  clipMoved: (filename: string, track: number, time: string): void =>
    announce(`Clip ${filename} moved to track ${track + 1} at ${time}`),

  clipLocked: (filename: string): void => announce(`Clip ${filename} locked`),

  clipUnlocked: (filename: string): void => announce(`Clip ${filename} unlocked`),

  clipSplit: (filename: string): void => announce(`Clip ${filename} split at playhead`),

  clipSelected: (count: number): void =>
    announce(count === 1 ? '1 clip selected' : `${count} clips selected`),

  playbackStarted: (): void => announce('Playback started'),

  playbackPaused: (): void => announce('Playback paused'),

  playheadMoved: (time: string): void => announce(`Playhead at ${time}`),

  zoomChanged: (zoomLevel: string): void => announce(`Zoom level: ${zoomLevel}`),

  undoAction: (action: string): void => announce(`Undone: ${action}`),

  redoAction: (action: string): void => announce(`Redone: ${action}`),

  error: (message: string): void => announceAssertive(`Error: ${message}`),
};
