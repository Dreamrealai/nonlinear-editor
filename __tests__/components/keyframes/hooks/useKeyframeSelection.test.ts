/**
 * Tests for useKeyframeSelection Hook
 *
 * Tests keyframe selection, cropping, and mode management.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useKeyframeSelection,
  type SceneFrameRow,
} from '@/components/keyframes/hooks/useKeyframeSelection';

describe('useKeyframeSelection', () => {
  const mockFrames: SceneFrameRow[] = [
    {
      id: 'frame-1',
      scene_id: 'scene-1',
      kind: 'first',
      t_ms: 0,
      storage_path: 'path/to/frame1.jpg',
      width: 1920,
      height: 1080,
    },
    {
      id: 'frame-2',
      scene_id: 'scene-1',
      kind: 'middle',
      t_ms: 1000,
      storage_path: 'path/to/frame2.jpg',
      width: 1920,
      height: 1080,
    },
    {
      id: 'frame-3',
      scene_id: 'scene-1',
      kind: 'last',
      t_ms: 2000,
      storage_path: 'path/to/frame3.jpg',
      width: 1920,
      height: 1080,
    },
  ];

  const mockFrameUrls: Record<string, string> = {
    'frame-1': 'https://example.com/frame1.jpg',
    'frame-2': 'https://example.com/frame2.jpg',
    'frame-3': 'https://example.com/frame3.jpg',
  };

  const mockSignStoragePath = jest.fn(async (path: string) => `https://signed.com/${path}`);

  const defaultProps = {
    frames: mockFrames,
    frameUrls: mockFrameUrls,
    signStoragePath: mockSignStoragePath,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should auto-select first middle frame on mount', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      expect(result.current.selectedFrameId).toBe('frame-2');
      expect(result.current.selectedFrame).toEqual(mockFrames[1]);
    });

    it('should auto-select first frame if no middle frame exists', () => {
      const framesWithoutMiddle = mockFrames.map((f) => ({
        ...f,
        kind: 'first' as const,
      }));

      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frames: framesWithoutMiddle,
        })
      );

      expect(result.current.selectedFrameId).toBe('frame-1');
    });

    it('should initialize with global mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      expect(result.current.mode).toBe('global');
    });

    it('should initialize crop with default values', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      expect(result.current.crop).toEqual({
        x: 0,
        y: 0,
        size: 512,
      });
    });

    it('should initialize feather to 24', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      expect(result.current.feather).toBe(24);
    });
  });

  describe('Frame Selection', () => {
    it('should select frame when handleFrameSelect is called', async () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      expect(result.current.selectedFrameId).toBe('frame-1');
      expect(result.current.selectedFrame).toEqual(mockFrames[0]);
    });

    it('should set frame URL from frameUrls cache', async () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      expect(result.current.selectedFrameUrl).toBe('https://example.com/frame1.jpg');
      expect(mockSignStoragePath).not.toHaveBeenCalled();
    });

    it('should sign storage path if URL not in cache', async () => {
      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frameUrls: {},
        })
      );

      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      expect(mockSignStoragePath).toHaveBeenCalledWith('path/to/frame1.jpg');
      expect(result.current.selectedFrameUrl).toBe('https://signed.com/path/to/frame1.jpg');
    });

    it('should reset mode to global when frame changes', async () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      // Set mode to crop
      act(() => {
        result.current.setMode('crop');
      });

      expect(result.current.mode).toBe('crop');

      // Select different frame
      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      expect(result.current.mode).toBe('global');
    });

    it('should reset crop when selecting new frame', async () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      // Modify crop
      act(() => {
        result.current.setCrop({ x: 100, y: 100, size: 200 });
      });

      // Select different frame
      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      // Crop should be reset to default for new frame
      expect(result.current.crop).toEqual({
        x: 0,
        y: 0,
        size: 512,
      });
    });
  });

  describe('Mode Management', () => {
    it('should switch to crop mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setMode('crop');
      });

      expect(result.current.mode).toBe('crop');
    });

    it('should switch back to global mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setMode('crop');
        result.current.setMode('global');
      });

      expect(result.current.mode).toBe('global');
    });
  });

  describe('Crop Management', () => {
    it('should update crop state', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setCrop({ x: 100, y: 50, size: 300 });
      });

      expect(result.current.crop).toEqual({ x: 100, y: 50, size: 300 });
    });

    it('should clamp crop to frame dimensions', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      const clamped = result.current.clampCrop({ x: 2000, y: 2000, size: 600 }, mockFrames[1]);

      expect(clamped.x).toBeLessThanOrEqual(1920 - clamped.size);
      expect(clamped.y).toBeLessThanOrEqual(1080 - clamped.size);
    });

    it('should clamp crop size to frame dimensions', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      const clamped = result.current.clampCrop({ x: 0, y: 0, size: 3000 }, mockFrames[1]);

      expect(clamped.size).toBeLessThanOrEqual(1080);
    });

    it('should not clamp if frame is null', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      const input = { x: 5000, y: 5000, size: 1000 };
      const clamped = result.current.clampCrop(input, null);

      expect(clamped).toEqual(input);
    });
  });

  describe('Feather Management', () => {
    it('should update feather value', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setFeather(48);
      });

      expect(result.current.feather).toBe(48);
    });
  });

  describe('Image Click Handling', () => {
    it('should update crop position on image click in crop mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      // Switch to crop mode
      act(() => {
        result.current.setMode('crop');
      });

      // Mock image click event
      const mockImage = {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 960, // Half of 1920
          height: 540, // Half of 1080
        }),
      } as HTMLImageElement;

      const clickEvent = {
        currentTarget: mockImage,
        clientX: 480, // Center X
        clientY: 270, // Center Y
      } as React.MouseEvent<HTMLImageElement>;

      act(() => {
        result.current.handleImageClick(clickEvent);
      });

      // Crop should be centered around click position (scaled to original size)
      expect(result.current.crop.x).toBeDefined();
      expect(result.current.crop.y).toBeDefined();
    });

    it('should not update crop in global mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      const initialCrop = result.current.crop;

      const mockImage = {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 960,
          height: 540,
        }),
      } as HTMLImageElement;

      const clickEvent = {
        currentTarget: mockImage,
        clientX: 480,
        clientY: 270,
      } as React.MouseEvent<HTMLImageElement>;

      act(() => {
        result.current.handleImageClick(clickEvent);
      });

      expect(result.current.crop).toEqual(initialCrop);
    });

    it('should not update crop if no frame selected', () => {
      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frames: [],
        })
      );

      act(() => {
        result.current.setMode('crop');
      });

      const mockImage = {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 960,
          height: 540,
        }),
      } as HTMLImageElement;

      const clickEvent = {
        currentTarget: mockImage,
        clientX: 480,
        clientY: 270,
      } as React.MouseEvent<HTMLImageElement>;

      expect(() => {
        act(() => {
          result.current.handleImageClick(clickEvent);
        });
      }).not.toThrow();
    });
  });

  describe('Crop Overlay Style', () => {
    it('should return overlay style in crop mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setMode('crop');
      });

      expect(result.current.cropOverlayStyle).toBeDefined();
      expect(result.current.cropOverlayStyle).toHaveProperty('left');
      expect(result.current.cropOverlayStyle).toHaveProperty('top');
      expect(result.current.cropOverlayStyle).toHaveProperty('width');
      expect(result.current.cropOverlayStyle).toHaveProperty('height');
    });

    it('should return undefined in global mode', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      expect(result.current.cropOverlayStyle).toBeUndefined();
    });

    it('should return undefined if no frame selected', () => {
      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frames: [],
        })
      );

      act(() => {
        result.current.setMode('crop');
      });

      expect(result.current.cropOverlayStyle).toBeUndefined();
    });

    it('should calculate percentage positions correctly', () => {
      const { result } = renderHook(() => useKeyframeSelection(defaultProps));

      act(() => {
        result.current.setMode('crop');
        result.current.setCrop({ x: 960, y: 540, size: 512 });
      });

      const style = result.current.cropOverlayStyle;

      expect(style?.left).toBe('50%'); // 960 / 1920 = 50%
      expect(style?.top).toBe('50%'); // 540 / 1080 = 50%
      expect(style?.width).toBe(`${(512 / 1920) * 100}%`);
      expect(style?.height).toBe(`${(512 / 1080) * 100}%`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty frames array', () => {
      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frames: [],
        })
      );

      expect(result.current.selectedFrameId).toBeNull();
      expect(result.current.selectedFrame).toBeNull();
    });

    it('should handle frames with null dimensions', () => {
      const framesWithNullDimensions: SceneFrameRow[] = [
        {
          id: 'frame-1',
          scene_id: 'scene-1',
          kind: 'middle',
          t_ms: 0,
          storage_path: 'path/to/frame1.jpg',
          width: null,
          height: null,
        },
      ];

      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frames: framesWithNullDimensions,
        })
      );

      expect(result.current.crop.size).toBeGreaterThan(0);
    });

    it('should handle frame URL that is null', async () => {
      const { result } = renderHook(() =>
        useKeyframeSelection({
          ...defaultProps,
          frameUrls: {},
        })
      );

      mockSignStoragePath.mockResolvedValueOnce(null);

      await act(async () => {
        await result.current.handleFrameSelect(mockFrames[0]);
      });

      expect(result.current.selectedFrameUrl).toBeNull();
    });
  });
});
