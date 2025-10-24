'use client';

import React from 'react';
import type { TextOverlay } from '@/types/timeline';
import { calculateTextAnimationState } from '@/lib/utils/textAnimations';

// Constants
const Z_INDEX = {
  OVERLAY_TEXT: 20,
};

/**
 * TextOverlayRenderer
 *
 * Renders text overlays on the video preview player with animation support.
 * Displays text at specified positions with customizable styling and animations.
 * Supports various animation types: fade, slide, scale, rotate, bounce, typewriter.
 * Memoized for performance optimization.
 */

interface TextOverlayRendererProps {
  textOverlays: TextOverlay[];
  currentTime: number;
}

const TextOverlayRenderer = React.memo<TextOverlayRendererProps>(
  ({ textOverlays, currentTime }): JSX.Element | null => {
    // Filter overlays that should be visible at the current time
    const visibleOverlays = textOverlays.filter(
      (overlay): boolean =>
        currentTime >= overlay.timelinePosition &&
        currentTime <= overlay.timelinePosition + overlay.duration
    );

    if (visibleOverlays.length === 0) {
      return null;
    }

    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: Z_INDEX.OVERLAY_TEXT }}
      >
        {visibleOverlays.map((overlay): JSX.Element | null => {
          // Calculate time elapsed since overlay became visible
          const elapsedTime = currentTime - overlay.timelinePosition;

          // Calculate animation state
          const animationState = calculateTextAnimationState(
            overlay.duration,
            elapsedTime,
            overlay.animation,
            overlay.text
          );

          // Skip rendering if not visible
          if (!animationState.visible) {
            return null;
          }

          // Calculate final opacity (base opacity * animation opacity)
          const finalOpacity = (overlay.opacity ?? 1.0) * animationState.opacity;

          return (
            <div
              key={overlay.id}
              className="absolute"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: animationState.transform,
                fontSize: `${overlay.fontSize ?? 24}px`,
                color: overlay.color ?? '#ffffff',
                backgroundColor: overlay.backgroundColor ?? 'transparent',
                fontFamily: overlay.fontFamily ?? 'sans-serif',
                textAlign: overlay.align ?? 'center',
                opacity: finalOpacity,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                padding: overlay.backgroundColor ? '8px 16px' : '0',
                borderRadius: overlay.backgroundColor ? '4px' : '0',
                whiteSpace: overlay.animation?.type === 'typewriter' ? 'pre-wrap' : 'nowrap',
                fontWeight: 600,
                willChange: 'transform, opacity',
              }}
            >
              {animationState.visibleText ?? overlay.text}
            </div>
          );
        })}
      </div>
    );
  }
);

TextOverlayRenderer.displayName = 'TextOverlayRenderer';

export { TextOverlayRenderer };
