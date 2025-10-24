# Store Migration Guide

## Overview

The original `useEditorStore` (610 lines) has been split into 5 focused, domain-specific stores:

1. **useTimelineStore** - Timeline data and clip management
2. **usePlaybackStore** - Playback controls and UI state
3. **useSelectionStore** - Clip selection management
4. **useHistoryStore** - Undo/redo functionality
5. **useClipboardStore** - Copy/paste operations

## Why Split?

### Performance Benefits

- **Reduced re-renders**: Components only re-render when their specific domain changes
- **Smaller state updates**: Each store manages a focused slice of state
- **Better optimization**: Easier to apply React.memo and selective subscriptions

### Maintainability Benefits

- **Single Responsibility**: Each store has one clear purpose
- **Easier testing**: Test each domain independently
- **Better organization**: Code is grouped by concern
- **Clearer API**: Smaller, focused interfaces

### File Size Reduction

- **useTimelineStore**: ~280 lines (timeline operations)
- **usePlaybackStore**: ~60 lines (playback state)
- **useSelectionStore**: ~70 lines (selection management)
- **useHistoryStore**: ~120 lines (undo/redo)
- **useClipboardStore**: ~70 lines (clipboard)
- **Total**: ~600 lines across 5 files vs 610 in one file

## Migration Strategies

### Strategy 1: Use the Composite Hook (Easiest)

For components that use multiple store features, use the `useEditor()` composite hook:

```typescript
// Before
import { useEditorStore } from '@/state/useEditorStore';

const Component = () => {
  const timeline = useEditorStore((s) => s.timeline);
  const currentTime = useEditorStore((s) => s.currentTime);
  const addClip = useEditorStore((s) => s.addClip);
  const undo = useEditorStore((s) => s.undo);

  // ...
};

// After (easiest migration)
import { useEditor } from '@/state';

const Component = () => {
  const { timeline, currentTime, addClip, undo } = useEditor();

  // Everything works the same!
};
```

### Strategy 2: Use Individual Stores (Best Performance)

For components that only need specific functionality, use individual stores:

```typescript
// Before
import { useEditorStore } from '@/state/useEditorStore';

const PlaybackControls = () => {
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  // ...
};

// After (best performance)
import { usePlaybackStore } from '@/state';

const PlaybackControls = () => {
  const { currentTime, setCurrentTime, zoom, setZoom } = usePlaybackStore();

  // Component only re-renders when playback state changes!
};
```

### Strategy 3: Selective Subscriptions (Advanced)

For maximum performance, subscribe only to specific values:

```typescript
// Before
import { useEditorStore } from '@/state/useEditorStore';

const TimeDisplay = () => {
  const currentTime = useEditorStore((s) => s.currentTime);

  return <div>{currentTime.toFixed(2)}s</div>;
};

// After (selective subscription)
import { usePlaybackStore } from '@/state';

const TimeDisplay = () => {
  // Only re-renders when currentTime changes
  const currentTime = usePlaybackStore((s) => s.currentTime);

  return <div>{currentTime.toFixed(2)}s</div>;
};
```

## Store Usage Guide

### useTimelineStore

**Use for**: Timeline data, clips, markers, tracks, text overlays

```typescript
import { useTimelineStore } from '@/state';

// Get timeline
const timeline = useTimelineStore((s) => s.timeline);

// Clip operations
const { addClip, updateClip, removeClip, reorderClips, splitClipAtTime } = useTimelineStore();

// Marker operations
const { addMarker, removeMarker, updateMarker } = useTimelineStore();

// Track operations
const { updateTrack } = useTimelineStore();

// Text overlay operations
const { addTextOverlay, removeTextOverlay, updateTextOverlay } = useTimelineStore();

// Transition operations
const { addTransitionToClips } = useTimelineStore();
```

### usePlaybackStore

**Use for**: Playback controls, zoom, current time

```typescript
import { usePlaybackStore } from '@/state';

// Playback state
const { currentTime, zoom, isPlaying } = usePlaybackStore();

// Playback controls
const { setCurrentTime, setZoom, play, pause, togglePlayPause } = usePlaybackStore();
```

### useSelectionStore

**Use for**: Clip selection management

```typescript
import { useSelectionStore } from '@/state';

// Selection state
const selectedClipIds = useSelectionStore((s) => s.selectedClipIds);

// Selection operations
const { selectClip, deselectClip, clearSelection } = useSelectionStore();

// Selection queries
const { isSelected, getSelectedCount, getSelectedIds } = useSelectionStore();
```

### useHistoryStore

**Use for**: Undo/redo functionality

```typescript
import { useHistoryStore } from '@/state';

// History operations
const { saveToHistory, undo, redo, canUndo, canRedo } = useHistoryStore();

// Initialize history with timeline
const { initializeHistory } = useHistoryStore();

// Example: Save to history after timeline change
const handleClipUpdate = (id: string, patch: Partial<Clip>) => {
  updateClip(id, patch);
  const timeline = useTimelineStore.getState().timeline;
  saveToHistory(timeline, `update-${id}`); // Debounced by clip ID
};
```

### useClipboardStore

**Use for**: Copy/paste operations

```typescript
import { useClipboardStore } from '@/state';

// Clipboard operations
const { copyClips, pasteClips, hasClips } = useClipboardStore();

// Example: Copy selected clips
const handleCopy = () => {
  const timeline = useTimelineStore.getState().timeline;
  const selectedIds = useSelectionStore.getState().getSelectedIds();
  const selectedClips = timeline?.clips.filter((c) => selectedIds.includes(c.id)) || [];
  copyClips(selectedClips);
};

// Example: Paste clips
const handlePaste = () => {
  const currentTime = usePlaybackStore.getState().currentTime;
  const pastedClips = pasteClips(currentTime);
  pastedClips.forEach((clip) => addClip(clip));
};
```

## Integration with History

The new store architecture requires manual history integration. Here's the pattern:

```typescript
import { useTimelineStore, useHistoryStore } from '@/state';

const Component = () => {
  const { updateClip } = useTimelineStore();
  const { saveToHistory } = useHistoryStore();

  const handleUpdate = (id: string, patch: Partial<Clip>) => {
    // 1. Update the timeline
    updateClip(id, patch);

    // 2. Save to history (debounced by clip ID)
    const timeline = useTimelineStore.getState().timeline;
    saveToHistory(timeline, `update-${id}`);
  };

  const handleUndo = () => {
    const previousTimeline = useHistoryStore.getState().undo();
    if (previousTimeline) {
      useTimelineStore.getState().setTimeline(previousTimeline);
    }
  };

  const handleRedo = () => {
    const nextTimeline = useHistoryStore.getState().redo();
    if (nextTimeline) {
      useTimelineStore.getState().setTimeline(nextTimeline);
    }
  };

  return (
    <div>
      <button onClick={handleUndo}>Undo</button>
      <button onClick={handleRedo}>Redo</button>
    </div>
  );
};
```

## Migration Checklist

### Phase 1: Preparation

- [ ] Read this migration guide
- [ ] Identify which stores each component needs
- [ ] Plan migration order (start with leaf components)

### Phase 2: Individual Components

- [ ] Replace `useEditorStore` imports with individual store imports
- [ ] Update state subscriptions
- [ ] Test component behavior
- [ ] Verify performance (should see reduced re-renders)

### Phase 3: History Integration

- [ ] Add `saveToHistory` calls after timeline mutations
- [ ] Update undo/redo handlers
- [ ] Test undo/redo functionality

### Phase 4: Cleanup

- [ ] Remove `useEditorStore` imports from migrated files
- [ ] Verify all tests pass
- [ ] Update documentation

### Phase 5: Deprecation (Future)

- [ ] Once all components are migrated, deprecate `useEditorStore`
- [ ] Remove legacy code

## Common Patterns

### Pattern 1: Timeline Initialization

```typescript
import { useTimelineStore, useHistoryStore } from '@/state';

const initializeTimeline = (timeline: Timeline) => {
  useTimelineStore.getState().setTimeline(timeline);
  useHistoryStore.getState().initializeHistory(timeline);
};
```

### Pattern 2: Selection with Copy/Paste

```typescript
import { useSelectionStore, useClipboardStore, useTimelineStore } from '@/state';

const handleCopy = () => {
  const timeline = useTimelineStore.getState().timeline;
  const selectedIds = useSelectionStore.getState().getSelectedIds();
  const clips = timeline?.clips.filter((c) => selectedIds.includes(c.id)) || [];
  useClipboardStore.getState().copyClips(clips);
};

const handlePaste = () => {
  const currentTime = usePlaybackStore.getState().currentTime;
  const clips = useClipboardStore.getState().pasteClips(currentTime);
  clips.forEach((clip) => useTimelineStore.getState().addClip(clip));

  // Save to history
  const timeline = useTimelineStore.getState().timeline;
  useHistoryStore.getState().saveToHistory(timeline);

  // Select pasted clips
  useSelectionStore.getState().clearSelection();
  clips.forEach((clip) => useSelectionStore.getState().selectClip(clip.id, true));
};
```

### Pattern 3: Keyboard Shortcuts

```typescript
import { useTimelineStore, useHistoryStore, usePlaybackStore } from '@/state';

const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if (e.metaKey && e.key === 'z' && !e.shiftKey) {
        const timeline = useHistoryStore.getState().undo();
        if (timeline) {
          useTimelineStore.getState().setTimeline(timeline);
        }
      }

      // Redo
      if (e.metaKey && e.key === 'z' && e.shiftKey) {
        const timeline = useHistoryStore.getState().redo();
        if (timeline) {
          useTimelineStore.getState().setTimeline(timeline);
        }
      }

      // Play/Pause
      if (e.key === ' ') {
        usePlaybackStore.getState().togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## Performance Tips

1. **Use selective subscriptions**: Only subscribe to the specific state you need
2. **Combine reads, separate writes**: Read from multiple stores, but write to one at a time
3. **Debounce history saves**: Use the debounceKey parameter for frequent updates
4. **Use getState() for actions**: Avoid subscribing if you only need to call actions
5. **Memoize selectors**: Use useMemo for derived state

## Testing

Each store can now be tested independently:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTimelineStore } from '@/state';

describe('useTimelineStore', () => {
  it('should add a clip', () => {
    const { result } = renderHook(() => useTimelineStore());

    act(() => {
      result.current.setTimeline({ clips: [], markers: [] });
      result.current.addClip({ id: '1' /* ... */ });
    });

    expect(result.current.timeline?.clips).toHaveLength(1);
  });
});
```

## Backward Compatibility

The `useEditorStore` is still available for backward compatibility. However, we recommend migrating to the new stores for better performance and maintainability.

The composite `useEditor()` hook provides the same API as the original `useEditorStore` for easy migration.

## Support

If you encounter issues during migration:

1. Check this guide for common patterns
2. Review the store source code for implementation details
3. Use the composite `useEditor()` hook as a fallback
4. File an issue with specific migration challenges
