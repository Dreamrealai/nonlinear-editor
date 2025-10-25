/**
 * Comprehensive tests for time formatting utility functions
 */

import {
  formatTimeMMSSCS,
  formatTimecode,
  formatTimecodeFrames,
  formatTimeSeconds,
  formatDuration,
  formatTimeRemaining,
} from '@/lib/utils/timeFormatting';

describe('Time Formatting Utilities', () => {
  describe('formatTimeMMSSCS', () => {
    it('should format whole seconds correctly', () => {
      expect(formatTimeMMSSCS(0)).toBe('0:00.00');
      expect(formatTimeMMSSCS(5)).toBe('0:05.00');
      expect(formatTimeMMSSCS(60)).toBe('1:00.00');
      expect(formatTimeMMSSCS(65)).toBe('1:05.00');
    });

    it('should format fractional seconds correctly', () => {
      expect(formatTimeMMSSCS(0.5)).toBe('0:00.50');
      expect(formatTimeMMSSCS(83.456)).toBe('1:23.45');
      expect(formatTimeMMSSCS(5.99)).toBe('0:05.99');
    });

    it('should handle large values', () => {
      expect(formatTimeMMSSCS(599)).toBe('9:59.00');
      expect(formatTimeMMSSCS(3599.99)).toBe('59:59.99');
    });

    it('should pad zeros correctly', () => {
      expect(formatTimeMMSSCS(61.01)).toBe('1:01.01');
      expect(formatTimeMMSSCS(0.01)).toBe('0:00.01');
    });
  });

  describe('formatTimecode', () => {
    it('should format MM:SS.MS by default for times under 1 hour', () => {
      expect(formatTimecode(0)).toBe('0:00.00');
      expect(formatTimecode(83.456)).toBe('1:23.45');
      expect(formatTimecode(599.99)).toBe('9:59.99');
    });

    it('should auto-include hours for times >= 1 hour', () => {
      expect(formatTimecode(3600)).toBe('01:00:00.00');
      expect(formatTimecode(3683.456)).toBe('01:01:23.45');
      expect(formatTimecode(7383.456)).toBe('02:03:03.45');
    });

    it('should force hours when showHours is true', () => {
      expect(formatTimecode(83.456, true)).toBe('00:01:23.45');
      expect(formatTimecode(5, true)).toBe('00:00:05.00');
    });

    it('should hide hours when showHours is false', () => {
      expect(formatTimecode(3683.456, false)).toBe('61:23.45');
    });

    it('should pad zeros correctly', () => {
      expect(formatTimecode(3661.01, true)).toBe('01:01:01.01');
    });
  });

  describe('formatTimecodeFrames', () => {
    it('should format zero time correctly', () => {
      expect(formatTimecodeFrames(0)).toBe('00:00:00');
    });

    it('should format whole seconds correctly', () => {
      expect(formatTimecodeFrames(1)).toBe('00:01:00');
      expect(formatTimecodeFrames(60)).toBe('01:00:00');
      expect(formatTimecodeFrames(125)).toBe('02:05:00');
    });

    it('should calculate frames at 30fps correctly', () => {
      expect(formatTimecodeFrames(1 / 30)).toBe('00:00:01'); // 1 frame
      expect(formatTimecodeFrames(15 / 30)).toBe('00:00:15'); // 15 frames
      expect(formatTimecodeFrames(83.5)).toBe('01:23:15'); // 83s + 15 frames
    });

    it('should handle floating point precision', () => {
      expect(formatTimecodeFrames(0.1)).toBe('00:00:03'); // ~3 frames at 30fps
    });

    it('should handle invalid values', () => {
      expect(formatTimecodeFrames(NaN)).toBe('00:00:00');
      expect(formatTimecodeFrames(Infinity)).toBe('00:00:00');
      expect(formatTimecodeFrames(-Infinity)).toBe('00:00:00');
    });

    it('should clamp negative values to zero', () => {
      expect(formatTimecodeFrames(-10)).toBe('00:00:00');
    });
  });

  describe('formatTimeSeconds', () => {
    it('should format with default 2 decimal places', () => {
      expect(formatTimeSeconds(1.234)).toBe('1.23s');
      expect(formatTimeSeconds(5.999)).toBe('6.00s');
    });

    it('should respect custom decimal places', () => {
      expect(formatTimeSeconds(1.234, 0)).toBe('1s');
      expect(formatTimeSeconds(1.234, 1)).toBe('1.2s');
      expect(formatTimeSeconds(1.234, 3)).toBe('1.234s');
    });

    it('should handle zero', () => {
      expect(formatTimeSeconds(0)).toBe('0.00s');
      expect(formatTimeSeconds(0, 0)).toBe('0s');
    });

    it('should handle large values', () => {
      expect(formatTimeSeconds(999.99)).toBe('999.99s');
    });
  });

  describe('formatDuration', () => {
    describe('under 60 seconds', () => {
      it('should format in compact mode', () => {
        expect(formatDuration(0)).toBe('0s');
        expect(formatDuration(1)).toBe('1s');
        expect(formatDuration(45)).toBe('45s');
        expect(formatDuration(59)).toBe('59s');
      });

      it('should format in verbose mode', () => {
        expect(formatDuration(1, { verbose: true })).toBe('1 second');
        expect(formatDuration(2, { verbose: true })).toBe('2 seconds');
        expect(formatDuration(45, { verbose: true })).toBe('45 seconds');
      });

      it('should round to nearest second', () => {
        expect(formatDuration(45.4)).toBe('45s');
        expect(formatDuration(45.6)).toBe('46s');
      });
    });

    describe('1-60 minutes', () => {
      it('should format in compact mode', () => {
        expect(formatDuration(60)).toBe('1m 0s');
        expect(formatDuration(90)).toBe('1m 30s');
        expect(formatDuration(150)).toBe('2m 30s');
        expect(formatDuration(3599)).toBe('59m 59s');
      });

      it('should format in verbose mode', () => {
        expect(formatDuration(60, { verbose: true })).toBe('1 minute');
        expect(formatDuration(90, { verbose: true })).toBe('1 minute 30 seconds');
        expect(formatDuration(120, { verbose: true })).toBe('2 minutes');
        expect(formatDuration(121, { verbose: true })).toBe('2 minutes 1 second');
      });
    });

    describe('over 1 hour', () => {
      it('should format in compact mode', () => {
        expect(formatDuration(3600)).toBe('1h');
        expect(formatDuration(3660)).toBe('1h 1m');
        expect(formatDuration(3665)).toBe('1h 1m');
        expect(formatDuration(7200)).toBe('2h');
        expect(formatDuration(7380)).toBe('2h 3m');
      });

      it('should format in verbose mode', () => {
        expect(formatDuration(3600, { verbose: true })).toBe('1 hour');
        expect(formatDuration(3660, { verbose: true })).toBe('1 hour 1 minute');
        expect(formatDuration(7200, { verbose: true })).toBe('2 hours');
        expect(formatDuration(7380, { verbose: true })).toBe('2 hours 3 minutes');
      });
    });

    describe('approximate option', () => {
      it('should add ~ prefix when approximate is true', () => {
        expect(formatDuration(45, { approximate: true })).toBe('~45s');
        expect(formatDuration(90, { approximate: true })).toBe('~2m 0s');
        expect(formatDuration(3665, { approximate: true })).toBe('~1h 1m');
      });

      it('should work with verbose mode', () => {
        expect(formatDuration(45, { approximate: true, verbose: true })).toBe('~45 seconds');
        expect(formatDuration(90, { approximate: true, verbose: true })).toBe('~1 minute 30 seconds');
      });
    });
  });

  describe('formatTimeRemaining', () => {
    it('should be an alias for formatDuration with approximate option', () => {
      expect(formatTimeRemaining(45)).toBe('~45s');
      expect(formatTimeRemaining(90)).toBe('~2m 0s');
      expect(formatTimeRemaining(3665)).toBe('~1h 1m');
    });

    it('should handle edge cases', () => {
      expect(formatTimeRemaining(0)).toBe('~0s');
      expect(formatTimeRemaining(1)).toBe('~1s');
      expect(formatTimeRemaining(3600)).toBe('~1h');
    });
  });

  describe('Edge cases and consistency', () => {
    it('should handle zero consistently across all functions', () => {
      expect(formatTimeMMSSCS(0)).toBe('0:00.00');
      expect(formatTimecode(0)).toBe('0:00.00');
      expect(formatTimecodeFrames(0)).toBe('00:00:00');
      expect(formatTimeSeconds(0)).toBe('0.00s');
      expect(formatDuration(0)).toBe('0s');
      expect(formatTimeRemaining(0)).toBe('~0s');
    });

    it('should handle the same time value consistently', () => {
      const time = 83.456;
      expect(formatTimeMMSSCS(time)).toBe('1:23.45');
      expect(formatTimecode(time)).toBe('1:23.45');
      expect(formatTimeSeconds(time)).toBe('83.46s');
      expect(formatDuration(time)).toBe('1m 23s');
    });

    it('should pad zeros correctly across all functions', () => {
      const time = 1.01;
      expect(formatTimeMMSSCS(time)).toBe('0:01.01');
      expect(formatTimecode(time)).toBe('0:01.01');
      expect(formatTimecode(time, true)).toBe('00:00:01.01');
      expect(formatTimecodeFrames(time)).toBe('00:01:00');
    });
  });
});
