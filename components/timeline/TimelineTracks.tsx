'use client';
import React from 'react';

import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import type { Clip } from '@/types/timeline';
import { Button } from '@/components/ui/Button';

const { TRACK_HEIGHT, MIN_TRACKS, MAX_TRACKS } = TIMELINE_CONSTANTS;

type TimelineTracksProps = {
  numTracks: number;
  clips: Clip[];
  onAddTrack: () => void;
  onRemoveTrack: () => void;
};

/**
 * Timeline tracks background component
 * Renders track backgrounds with labels and add/remove buttons
 */
export const TimelineTracks = React.memo<TimelineTracksProps>(function TimelineTracks({
  numTracks,
  clips,
  onAddTrack,
  onRemoveTrack,
}) {
  return (
    <>
      {Array.from({ length: numTracks }).map((_, trackIndex) => (
        <div
          key={trackIndex}
          className="absolute w-full border-b border-neutral-200"
          style={{
            top: trackIndex * TRACK_HEIGHT,
            height: TRACK_HEIGHT,
            backgroundColor: trackIndex % 2 === 0 ? '#fafafa' : '#ffffff',
          }}
        >
          <div className="absolute left-2 top-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400">Track {trackIndex + 1}</span>
            {trackIndex === numTracks - 1 && numTracks < MAX_TRACKS && (
              <Button
                onClick={onAddTrack}
                size="sm"
                className="px-1.5 py-0.5 text-[10px]"
                title="Add new track"
              >
                +
              </Button>
            )}
            {trackIndex === numTracks - 1 &&
              numTracks > MIN_TRACKS &&
              clips.filter((c) => c.trackIndex === trackIndex).length === 0 && (
                <Button
                  onClick={onRemoveTrack}
                  variant="destructive"
                  size="sm"
                  className="px-1.5 py-0.5 text-[10px]"
                  title="Delete this track"
                >
                  −
                </Button>
              )}
          </div>
        </div>
      ))}
    </>
  );
});
