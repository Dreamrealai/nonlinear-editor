'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import type { TextOverlay, TextAnimation, TextAnimationType, EasingFunction } from '@/types/timeline';
import { useEditorStore } from '@/state/useEditorStore';
import { animationPresets } from '@/lib/utils/textAnimations';

/**
 * TextOverlayEditor
 *
 * Interactive text overlay editor with draggable text boxes and formatting toolbar.
 * Allows users to click, drag, and format text overlays on the video preview.
 */

interface TextOverlayEditorProps {
  textOverlays: TextOverlay[];
  currentTime: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Font presets
const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

// Font size presets
const FONT_SIZES = [12, 16, 24, 32, 40, 48, 64, 72, 96, 128];

// Color presets
const COLOR_PRESETS = [
  '#ffffff', // White
  '#000000', // Black
  '#ff0000', // Red
  '#00ff00', // Green
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff8800', // Orange
  '#8800ff', // Purple
];

export function TextOverlayEditor({
  textOverlays,
  currentTime,
  containerRef,
}: TextOverlayEditorProps) {
  const updateTextOverlay = useEditorStore((state) => state.updateTextOverlay);
  const removeTextOverlay = useEditorStore((state) => state.removeTextOverlay);

  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Filter overlays visible at current time
  const visibleOverlays = textOverlays.filter(
    (overlay) =>
      currentTime >= overlay.timelinePosition &&
      currentTime <= overlay.timelinePosition + overlay.duration
  );

  const selectedOverlay = visibleOverlays.find((o) => o.id === selectedOverlayId);

  // Handle clicking on an overlay to select it
  const handleOverlayClick = useCallback((e: React.MouseEvent, overlayId: string) => {
    e.stopPropagation();
    setSelectedOverlayId(overlayId);
    setIsEditingText(false);
  }, []);

  // Handle double-click to edit text
  const handleOverlayDoubleClick = useCallback((e: React.MouseEvent, overlayId: string) => {
    e.stopPropagation();
    setSelectedOverlayId(overlayId);
    setIsEditingText(true);
    setTimeout(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }, 0);
  }, []);

  // Start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, overlayId: string) => {
      e.stopPropagation();
      if (!containerRef.current) return;

      setSelectedOverlayId(overlayId);
      setIsDragging(true);

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    },
    [containerRef]
  );

  // Handle dragging
  useEffect(() => {
    if (!isDragging || !dragStart || !selectedOverlay || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !selectedOverlay) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Convert pixel delta to percentage
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      // Update position
      const newX = Math.max(0, Math.min(100, selectedOverlay.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, selectedOverlay.y + deltaYPercent));

      updateTextOverlay(selectedOverlay.id, { x: newX, y: newY });

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, selectedOverlay, containerRef, updateTextOverlay]);

  // Handle text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedOverlay) return;
      updateTextOverlay(selectedOverlay.id, { text: e.target.value });
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle font size change
  const handleFontSizeChange = useCallback(
    (fontSize: number) => {
      if (!selectedOverlay) return;
      updateTextOverlay(selectedOverlay.id, { fontSize });
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle color change
  const handleColorChange = useCallback(
    (color: string) => {
      if (!selectedOverlay) return;
      updateTextOverlay(selectedOverlay.id, { color });
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle font family change
  const handleFontFamilyChange = useCallback(
    (fontFamily: string) => {
      if (!selectedOverlay) return;
      updateTextOverlay(selectedOverlay.id, { fontFamily });
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle animation type change
  const handleAnimationTypeChange = useCallback(
    (type: TextAnimationType) => {
      if (!selectedOverlay) return;

      if (type === 'none') {
        updateTextOverlay(selectedOverlay.id, { animation: undefined });
      } else {
        // Use preset for the animation type, or create default
        const preset = animationPresets[type.replace(/-/g, '')] ?? {
          type,
          duration: 0.5,
          delay: 0,
          easing: 'ease-out' as EasingFunction,
          repeat: 0,
          direction: 'normal' as const,
        };
        updateTextOverlay(selectedOverlay.id, { animation: preset });
      }
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle animation property changes
  const handleAnimationPropertyChange = useCallback(
    (property: keyof TextAnimation, value: number | string) => {
      if (!selectedOverlay || !selectedOverlay.animation) return;

      updateTextOverlay(selectedOverlay.id, {
        animation: {
          ...selectedOverlay.animation,
          [property]: value,
        },
      });
    },
    [selectedOverlay, updateTextOverlay]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedOverlay) return;
    removeTextOverlay(selectedOverlay.id);
    setSelectedOverlayId(null);
  }, [selectedOverlay, removeTextOverlay]);

  // Deselect when clicking outside
  const handleContainerClick = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
    // Only deselect if clicking on the container itself, not its children
    if (e && e.target !== e.currentTarget) return;
    setSelectedOverlayId(null);
    setIsEditingText(false);
  }, []);

  // Calculate animation state (import from animation utilities)
  const calculateAnimationState = (overlay: TextOverlay) => {
    const elapsedTime = currentTime - overlay.timelinePosition;

    // Import animation calculation inline to avoid circular dependency
    // For editor view, we want to show static text with basic opacity
    let computedOpacity = overlay.opacity ?? 1.0;

    // Apply animation preview if animation is defined
    if (overlay.animation && overlay.animation.type !== 'none') {
      // Basic animation preview - just fade in/out for editor
      const elapsed = elapsedTime;
      const duration = overlay.animation.duration;
      const delay = overlay.animation.delay;

      if (elapsed < delay) {
        computedOpacity = overlay.animation.type.includes('fade-in') ? 0 : 1;
      } else if (elapsed < delay + duration) {
        const progress = (elapsed - delay) / duration;
        if (overlay.animation.type === 'fade-in') {
          computedOpacity *= progress;
        } else if (overlay.animation.type === 'fade-out') {
          computedOpacity *= (1 - progress);
        }
      }
    }

    return computedOpacity;
  };

  return (
    <>
      {/* Text Overlays Layer */}
      <div
        className="absolute inset-0 z-20"
        onClick={handleContainerClick}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleContainerClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Text overlay workspace"
      >
        {visibleOverlays.map((overlay) => {
          const isSelected = overlay.id === selectedOverlayId;
          const opacity = calculateAnimationState(overlay);

          return (
            <div
              key={overlay.id}
              className={`absolute cursor-move select-none transition-all ${
                isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black/50' : ''
              }`}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${overlay.fontSize ?? 24}px`,
                color: overlay.color ?? '#ffffff',
                backgroundColor: overlay.backgroundColor ?? 'transparent',
                fontFamily: overlay.fontFamily ?? 'sans-serif',
                textAlign: overlay.align ?? 'center',
                opacity,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                padding: overlay.backgroundColor ? '8px 16px' : '4px 8px',
                borderRadius: overlay.backgroundColor ? '4px' : '0',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                pointerEvents: 'auto',
              }}
              onClick={(e) => handleOverlayClick(e, overlay.id)}
              onDoubleClick={(e) => handleOverlayDoubleClick(e, overlay.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleOverlayClick(e as unknown as React.MouseEvent<HTMLDivElement>, overlay.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Text overlay: ${overlay.text}`}
              onMouseDown={(e) => handleMouseDown(e, overlay.id)}
            >
              {isSelected && isEditingText ? (
                <input
                  ref={textInputRef}
                  type="text"
                  value={overlay.text}
                  onChange={handleTextChange}
                  onBlur={() => setIsEditingText(false)}
                  className="bg-transparent outline-none border-b-2 border-blue-500 text-center"
                  style={{
                    fontSize: 'inherit',
                    color: 'inherit',
                    fontFamily: 'inherit',
                    fontWeight: 'inherit',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                overlay.text
              )}
            </div>
          );
        })}
      </div>

      {/* Formatting Toolbar */}
      {selectedOverlay && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-[95vw] overflow-x-auto">
          <div className="flex items-center gap-3 rounded-lg bg-black/90 backdrop-blur-sm px-4 py-3 shadow-xl border border-white/10">
            {/* Font Family */}
            <div className="flex flex-col gap-1">
              <label htmlFor="font-family-select" className="text-xs text-white/60 font-medium">
                Font
              </label>
              <select
                id="font-family-select"
                value={selectedOverlay.fontFamily ?? 'sans-serif'}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value} className="bg-gray-900">
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="flex flex-col gap-1">
              <label htmlFor="font-size-select" className="text-xs text-white/60 font-medium">
                Size
              </label>
              <select
                id="font-size-select"
                value={selectedOverlay.fontSize ?? 48}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none w-20"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size} className="bg-gray-900">
                    {size}px
                  </option>
                ))}
              </select>
            </div>

            {/* Color Picker */}
            <div className="flex flex-col gap-1">
              <div className="text-xs text-white/60 font-medium">Color</div>
              <div className="flex gap-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      selectedOverlay.color === color
                        ? 'border-blue-500 scale-110'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {/* Custom color input */}
                <input
                  type="color"
                  value={selectedOverlay.color ?? '#ffffff'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-6 h-6 rounded border-2 border-white/30 cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/20" />

            {/* Animation Type */}
            <div className="flex flex-col gap-1">
              <label htmlFor="animation-type-select" className="text-xs text-white/60 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Animation
              </label>
              <select
                id="animation-type-select"
                value={selectedOverlay.animation?.type ?? 'none'}
                onChange={(e) => handleAnimationTypeChange(e.target.value as TextAnimationType)}
                className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none min-w-[140px]"
              >
                <option value="none" className="bg-gray-900">None</option>
                <optgroup label="Fade" className="bg-gray-900">
                  <option value="fade-in" className="bg-gray-900">Fade In</option>
                  <option value="fade-out" className="bg-gray-900">Fade Out</option>
                  <option value="fade-in-out" className="bg-gray-900">Fade In/Out</option>
                </optgroup>
                <optgroup label="Slide" className="bg-gray-900">
                  <option value="slide-in-left" className="bg-gray-900">Slide In Left</option>
                  <option value="slide-in-right" className="bg-gray-900">Slide In Right</option>
                  <option value="slide-in-top" className="bg-gray-900">Slide In Top</option>
                  <option value="slide-in-bottom" className="bg-gray-900">Slide In Bottom</option>
                  <option value="slide-out-left" className="bg-gray-900">Slide Out Left</option>
                  <option value="slide-out-right" className="bg-gray-900">Slide Out Right</option>
                  <option value="slide-out-top" className="bg-gray-900">Slide Out Top</option>
                  <option value="slide-out-bottom" className="bg-gray-900">Slide Out Bottom</option>
                </optgroup>
                <optgroup label="Scale" className="bg-gray-900">
                  <option value="scale-in" className="bg-gray-900">Scale In</option>
                  <option value="scale-out" className="bg-gray-900">Scale Out</option>
                  <option value="scale-pulse" className="bg-gray-900">Scale Pulse</option>
                </optgroup>
                <optgroup label="Rotate" className="bg-gray-900">
                  <option value="rotate-in" className="bg-gray-900">Rotate In</option>
                  <option value="rotate-out" className="bg-gray-900">Rotate Out</option>
                </optgroup>
                <optgroup label="Special" className="bg-gray-900">
                  <option value="bounce-in" className="bg-gray-900">Bounce In</option>
                  <option value="typewriter" className="bg-gray-900">Typewriter</option>
                </optgroup>
              </select>
            </div>

            {/* Animation Controls - Show when animation is selected */}
            {selectedOverlay.animation && selectedOverlay.animation.type !== 'none' && (
              <>
                {/* Duration */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="animation-duration" className="text-xs text-white/60 font-medium">
                    Duration
                  </label>
                  <input
                    id="animation-duration"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={selectedOverlay.animation.duration}
                    onChange={(e) => handleAnimationPropertyChange('duration', parseFloat(e.target.value))}
                    className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none w-16"
                  />
                </div>

                {/* Delay */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="animation-delay" className="text-xs text-white/60 font-medium">
                    Delay
                  </label>
                  <input
                    id="animation-delay"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={selectedOverlay.animation.delay}
                    onChange={(e) => handleAnimationPropertyChange('delay', parseFloat(e.target.value))}
                    className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none w-16"
                  />
                </div>

                {/* Easing */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="animation-easing" className="text-xs text-white/60 font-medium">
                    Easing
                  </label>
                  <select
                    id="animation-easing"
                    value={selectedOverlay.animation.easing}
                    onChange={(e) => handleAnimationPropertyChange('easing', e.target.value)}
                    className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="linear" className="bg-gray-900">Linear</option>
                    <option value="ease-in" className="bg-gray-900">Ease In</option>
                    <option value="ease-out" className="bg-gray-900">Ease Out</option>
                    <option value="ease-in-out" className="bg-gray-900">Ease In/Out</option>
                    <option value="ease-in-quad" className="bg-gray-900">Ease In Quad</option>
                    <option value="ease-out-quad" className="bg-gray-900">Ease Out Quad</option>
                    <option value="ease-in-out-quad" className="bg-gray-900">Ease In/Out Quad</option>
                    <option value="ease-in-cubic" className="bg-gray-900">Ease In Cubic</option>
                    <option value="ease-out-cubic" className="bg-gray-900">Ease Out Cubic</option>
                    <option value="ease-in-out-cubic" className="bg-gray-900">Ease In/Out Cubic</option>
                    <option value="bounce" className="bg-gray-900">Bounce</option>
                  </select>
                </div>

                {/* Repeat */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="animation-repeat" className="text-xs text-white/60 font-medium">
                    Repeat
                  </label>
                  <select
                    id="animation-repeat"
                    value={selectedOverlay.animation.repeat}
                    onChange={(e) => handleAnimationPropertyChange('repeat', parseInt(e.target.value))}
                    className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="0" className="bg-gray-900">Once</option>
                    <option value="1" className="bg-gray-900">2x</option>
                    <option value="2" className="bg-gray-900">3x</option>
                    <option value="3" className="bg-gray-900">4x</option>
                    <option value="-1" className="bg-gray-900">Loop</option>
                  </select>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="w-px h-8 bg-white/20" />

            {/* Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
              title="Delete text overlay"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default TextOverlayEditor;
