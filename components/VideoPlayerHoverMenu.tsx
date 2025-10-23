'use client';

import { useState } from 'react';
import { Type, Sparkles } from 'lucide-react';

/**
 * VideoPlayerHoverMenu
 *
 * A hover menu that appears when the user hovers over the video player.
 * Provides quick access to add transitions and text overlays.
 */

interface VideoPlayerHoverMenuProps {
  onAddText: (x: number, y: number) => void;
  onAddTransition: () => void;
  currentTime: number;
}

export default function VideoPlayerHoverMenu({
  onAddText,
  onAddTransition,
  currentTime,
}: VideoPlayerHoverMenuProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleAddText = () => {
    onAddText(mousePosition.x, mousePosition.y);
  };

  return (
    <div
      className="absolute inset-0 z-[1050]"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {isVisible && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 rounded-lg bg-black/80 p-2 backdrop-blur-sm">
          <button
            onClick={handleAddText}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
            title="Add text overlay"
          >
            <Type className="h-4 w-4" />
            <span>Add Text</span>
          </button>
          <button
            onClick={onAddTransition}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
            title="Add transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Add Transition</span>
          </button>
          <div className="border-t border-white/20 pt-2 text-xs text-white/60">
            Time: {currentTime.toFixed(2)}s
          </div>
        </div>
      )}
    </div>
  );
}
