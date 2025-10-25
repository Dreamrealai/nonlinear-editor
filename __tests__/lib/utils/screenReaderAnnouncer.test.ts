/**
 * Tests for screenReaderAnnouncer utility
 */

import {
  announce,
  announceAssertive,
  cleanupAnnouncer,
  timelineAnnouncements,
} from '@/lib/utils/screenReaderAnnouncer';

describe('Screen Reader Announcer', () => {
  beforeEach(() => {
    // Clean up any existing announcer
    cleanupAnnouncer();
    // Clear the document body
    document.body.innerHTML = '';
    jest.clearAllTimers();
  });

  afterEach(() => {
    cleanupAnnouncer();
    jest.clearAllTimers();
  });

  describe('announce', () => {
    it('should create announcer element on first call', () => {
      announce('Test message');

      const announcer = document.querySelector('[aria-live]');
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');
      expect(announcer?.getAttribute('role')).toBe('status');
    });

    it('should reuse existing announcer element', () => {
      announce('First message');
      const firstAnnouncer = document.querySelector('[aria-live]');

      announce('Second message');
      const secondAnnouncer = document.querySelector('[aria-live]');

      expect(firstAnnouncer).toBe(secondAnnouncer);
    });

    it('should set message after delay', async () => {
      jest.useFakeTimers();
      announce('Test message');

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('');

      jest.advanceTimersByTime(100);
      expect(announcer?.textContent).toBe('Test message');

      jest.useRealTimers();
    });

    it('should clear previous message before setting new one', () => {
      jest.useFakeTimers();
      announce('First message');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('First message');

      announce('Second message');
      expect(announcer?.textContent).toBe('');

      jest.advanceTimersByTime(100);
      expect(announcer?.textContent).toBe('Second message');

      jest.useRealTimers();
    });

    it('should respect polite priority by default', () => {
      announce('Test message');

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
    });

    it('should support assertive priority', () => {
      announce('Test message', 'assertive');

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have visually hidden styles', () => {
      announce('Test message');

      const announcer = document.querySelector('[aria-live]') as HTMLElement;
      expect(announcer.style.position).toBe('absolute');
      expect(announcer.style.width).toBe('1px');
      expect(announcer.style.height).toBe('1px');
      expect(announcer.style.overflow).toBe('hidden');
    });
  });

  describe('announceAssertive', () => {
    it('should announce with assertive priority', () => {
      announceAssertive('Critical message');

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should set message content', async () => {
      jest.useFakeTimers();
      announceAssertive('Critical message');

      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Critical message');

      jest.useRealTimers();
    });
  });

  describe('cleanupAnnouncer', () => {
    it('should remove announcer from DOM', () => {
      announce('Test message');
      expect(document.querySelector('[aria-live]')).toBeTruthy();

      cleanupAnnouncer();
      expect(document.querySelector('[aria-live]')).toBeNull();
    });

    it('should handle multiple cleanup calls', () => {
      announce('Test message');
      cleanupAnnouncer();
      cleanupAnnouncer();
      expect(document.querySelector('[aria-live]')).toBeNull();
    });

    it('should allow creating new announcer after cleanup', () => {
      announce('First message');
      cleanupAnnouncer();

      announce('Second message');
      expect(document.querySelector('[aria-live]')).toBeTruthy();
    });
  });

  describe('timelineAnnouncements', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should announce clip added', () => {
      timelineAnnouncements.clipAdded('video.mp4', 0);
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 added to track 1');
    });

    it('should announce clip removed', () => {
      timelineAnnouncements.clipRemoved('video.mp4');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 removed from timeline');
    });

    it('should announce clip moved', () => {
      timelineAnnouncements.clipMoved('video.mp4', 1, '00:05.00');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 moved to track 2 at 00:05.00');
    });

    it('should announce clip locked', () => {
      timelineAnnouncements.clipLocked('video.mp4');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 locked');
    });

    it('should announce clip unlocked', () => {
      timelineAnnouncements.clipUnlocked('video.mp4');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 unlocked');
    });

    it('should announce clip split', () => {
      timelineAnnouncements.clipSplit('video.mp4');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Clip video.mp4 split at playhead');
    });

    it('should announce single clip selected', () => {
      timelineAnnouncements.clipSelected(1);
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('1 clip selected');
    });

    it('should announce multiple clips selected', () => {
      timelineAnnouncements.clipSelected(3);
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('3 clips selected');
    });

    it('should announce playback started', () => {
      timelineAnnouncements.playbackStarted();
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Playback started');
    });

    it('should announce playback paused', () => {
      timelineAnnouncements.playbackPaused();
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Playback paused');
    });

    it('should announce playhead moved', () => {
      timelineAnnouncements.playheadMoved('00:10.50');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Playhead at 00:10.50');
    });

    it('should announce zoom changed', () => {
      timelineAnnouncements.zoomChanged('200%');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Zoom level: 200%');
    });

    it('should announce undo action', () => {
      timelineAnnouncements.undoAction('Delete clip');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Undone: Delete clip');
    });

    it('should announce redo action', () => {
      timelineAnnouncements.redoAction('Delete clip');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.textContent).toBe('Redone: Delete clip');
    });

    it('should announce error assertively', () => {
      timelineAnnouncements.error('Failed to load clip');
      jest.advanceTimersByTime(100);

      const announcer = document.querySelector('[aria-live]');
      expect(announcer?.getAttribute('aria-live')).toBe('assertive');
      expect(announcer?.textContent).toBe('Error: Failed to load clip');
    });
  });
});
