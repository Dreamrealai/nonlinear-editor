'use client';

import type { TextOverlay } from '@/types/timeline';

/**
 * TextOverlayRenderer
 *
 * Renders text overlays on the video preview player.
 * Displays text at specified positions with customizable styling.
 */

interface TextOverlayRendererProps {
  textOverlays: TextOverlay[];
  currentTime: number;
}

export default function TextOverlayRenderer({
  textOverlays,
  currentTime,
}: TextOverlayRendererProps) {
  // Filter overlays that should be visible at the current time
  const visibleOverlays = textOverlays.filter(
    (overlay) =>
      currentTime >= overlay.timelinePosition &&
      currentTime <= overlay.timelinePosition + overlay.duration
  );

  if (visibleOverlays.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {visibleOverlays.map((overlay) => {
        // Calculate opacity based on fade in/out if needed
        const elapsed = currentTime - overlay.timelinePosition;
        const remaining = overlay.timelinePosition + overlay.duration - currentTime;
        const fadeInDuration = 0.3; // 300ms fade in
        const fadeOutDuration = 0.3; // 300ms fade out

        let computedOpacity = overlay.opacity ?? 1.0;
        if (elapsed < fadeInDuration) {
          computedOpacity *= elapsed / fadeInDuration;
        } else if (remaining < fadeOutDuration) {
          computedOpacity *= remaining / fadeOutDuration;
        }

        return (
          <div
            key={overlay.id}
            className="absolute"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${overlay.fontSize ?? 24}px`,
              color: overlay.color ?? '#ffffff',
              backgroundColor: overlay.backgroundColor ?? 'transparent',
              fontFamily: overlay.fontFamily ?? 'sans-serif',
              textAlign: overlay.align ?? 'center',
              opacity: computedOpacity,
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              padding: overlay.backgroundColor ? '8px 16px' : '0',
              borderRadius: overlay.backgroundColor ? '4px' : '0',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            {overlay.text}
          </div>
        );
      })}
    </div>
  );
}
