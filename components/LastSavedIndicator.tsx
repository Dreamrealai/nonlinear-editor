/**
 * LastSavedIndicator Component
 *
 * Displays the last saved timestamp and saving status.
 * Shows a friendly relative time like "Saved 2 minutes ago" or "Saving..."
 *
 * @module components/LastSavedIndicator
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Check, Clock } from 'lucide-react';

interface LastSavedIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  className?: string;
}

export function LastSavedIndicator({
  lastSaved,
  isSaving,
  className = '',
}: LastSavedIndicatorProps): React.JSX.Element {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) {
      setRelativeTime('Not saved');
      return;
    }

    const updateRelativeTime = (): void => {
      const now = Date.now();
      const diff = now - lastSaved.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 10) {
        setRelativeTime('Saved just now');
      } else if (seconds < 60) {
        setRelativeTime(`Saved ${seconds}s ago`);
      } else if (minutes < 60) {
        setRelativeTime(`Saved ${minutes}m ago`);
      } else if (hours < 24) {
        setRelativeTime(`Saved ${hours}h ago`);
      } else {
        setRelativeTime('Saved');
      }
    };

    // Update immediately
    updateRelativeTime();

    // Update every 10 seconds
    const interval = setInterval(updateRelativeTime, 10000);

    return (): void => clearInterval(interval);
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className={`flex items-center gap-2 text-xs text-neutral-500 ${className}`}>
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"></div>
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-neutral-500 ${className}`}>
      {lastSaved ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span>{relativeTime}</span>
        </>
      ) : (
        <>
          <Clock className="h-3.5 w-3.5" />
          <span>Not saved</span>
        </>
      )}
    </div>
  );
}
