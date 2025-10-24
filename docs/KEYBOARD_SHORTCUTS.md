# Keyboard Shortcuts Guide

Complete reference for all keyboard shortcuts available in the Non-Linear Video Editor.

## Quick Reference

Press `Cmd+?` (Mac) or `Ctrl+?` (Windows/Linux) to view the keyboard shortcuts help modal at any time.

## General Shortcuts

| Shortcut       | Action     | Description                                 |
| -------------- | ---------- | ------------------------------------------- |
| `Cmd/Ctrl + S` | Save       | Manually save the current project           |
| `Cmd/Ctrl + E` | Export     | Open the export dialog to render your video |
| `Cmd/Ctrl + ?` | Help       | Show this keyboard shortcuts reference      |
| `Cmd/Ctrl + /` | Help (Alt) | Alternative shortcut to show help           |

## Editing Shortcuts

| Shortcut               | Action         | Description                                     |
| ---------------------- | -------------- | ----------------------------------------------- |
| `Cmd/Ctrl + Z`         | Undo           | Undo the last action                            |
| `Cmd/Ctrl + Shift + Z` | Redo (Mac)     | Redo the last undone action                     |
| `Ctrl + Y`             | Redo (Windows) | Redo the last undone action                     |
| `Cmd/Ctrl + C`         | Copy           | Copy selected clips to clipboard                |
| `Cmd/Ctrl + V`         | Paste          | Paste copied clips to timeline                  |
| `Cmd/Ctrl + A`         | Select All     | Select all clips on the timeline                |
| `Delete`               | Delete         | Delete selected clips                           |
| `Backspace`            | Delete (Alt)   | Alternative shortcut to delete selected clips   |
| `S`                    | Split Clip     | Split the clip at the current playhead position |

## Playback Shortcuts

| Shortcut | Action     | Description                          |
| -------- | ---------- | ------------------------------------ |
| `Space`  | Play/Pause | Toggle playback of the video preview |

## Platform Differences

### macOS

- Use `Cmd` (Command/⌘) key for most shortcuts
- Redo: `Cmd + Shift + Z`

### Windows/Linux

- Use `Ctrl` (Control) key for most shortcuts
- Redo: `Ctrl + Y` or `Ctrl + Shift + Z`

## Context-Aware Behavior

Keyboard shortcuts are automatically disabled when you're typing in text fields to prevent accidental actions:

- Input fields
- Text areas
- Select dropdowns
- Content-editable elements

This ensures that shortcuts like `Cmd+A` or `Backspace` work as expected in text contexts.

## Tips for Power Users

1. **Autosave is Active**: The editor automatically saves your work every 2 seconds, but you can manually save anytime with `Cmd/Ctrl+S`.

2. **Workflow Optimization**:
   - Use `Space` to quickly preview changes
   - Use `S` to split clips at exact moments
   - Use `Cmd/Ctrl+C` and `Cmd/Ctrl+V` to duplicate clips
   - Use `Cmd/Ctrl+Z` liberally - the undo system tracks all your changes

3. **Export Workflow**:
   - Press `Cmd/Ctrl+E` to quickly open the export dialog
   - Review your timeline before exporting
   - The export process happens in the background

## Accessibility

All keyboard shortcuts are designed to be:

- Cross-platform compatible (Mac, Windows, Linux)
- Consistent with industry standards
- Non-blocking for text input contexts
- Discoverable through the help modal

## Customization

Currently, keyboard shortcuts are not customizable. All shortcuts follow industry-standard conventions to ensure familiarity for users coming from other video editing software.

## Troubleshooting

### Shortcuts Not Working?

1. **Check if you're in a text field**: Shortcuts are disabled in text input contexts
2. **Verify the correct modifier key**: Use `Cmd` on Mac, `Ctrl` on Windows/Linux
3. **Check for conflicts**: Some browser extensions may intercept keyboard shortcuts
4. **Reload the page**: If shortcuts stop working, try refreshing the editor

### Browser Conflicts

Some browsers may intercept certain shortcuts:

- Chrome: `Cmd/Ctrl+E` may open search in some cases
- Firefox: `Cmd/Ctrl+/` may show page info
- Safari: Generally works well with all shortcuts

If you experience conflicts, try:

1. Using the alternative shortcuts where available
2. Temporarily disabling browser extensions
3. Using the UI buttons as an alternative

## Implementation Details

For developers working on the codebase:

### Hook Usage

```typescript
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

// In your component
useKeyboardShortcuts({
  enabled: true,
  onPlayPause: handlePlayPause,
  onSave: handleSave,
  onExport: handleExport,
  onShowHelp: handleShowHelp,
  onSplitClip: handleSplitClip,
});
```

### Testing

Comprehensive tests are available in:

- `/Users/davidchen/Projects/non-linear-editor/__tests__/lib/hooks/useKeyboardShortcuts.test.ts`

### Files

Key files implementing keyboard shortcuts:

- `/Users/davidchen/Projects/non-linear-editor/lib/hooks/useKeyboardShortcuts.ts` - Main shortcuts hook
- `/Users/davidchen/Projects/non-linear-editor/lib/hooks/useGlobalKeyboardShortcuts.ts` - Advanced shortcuts system
- `/Users/davidchen/Projects/non-linear-editor/lib/hooks/useTimelineKeyboardShortcuts.ts` - Timeline-specific shortcuts
- `/Users/davidchen/Projects/non-linear-editor/components/KeyboardShortcutsHelp.tsx` - Help modal component

## Future Enhancements

Potential future improvements:

- Customizable keyboard shortcuts
- Import/export shortcut preferences
- Additional timeline navigation shortcuts (arrow keys, home/end)
- Zoom in/out shortcuts
- Track selection shortcuts

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
