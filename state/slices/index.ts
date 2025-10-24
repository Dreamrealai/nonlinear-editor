/**
 * Slices Index - Central Export for All Store Slices
 *
 * Exports all slice creators and their types for composition in useEditorStore
 */

export { createClipsSlice, type ClipsSlice } from './clips';
export { createTracksSlice, type TracksSlice } from './tracks';
export { createMarkersSlice, type MarkersSlice } from './markers';
export { createGuidesSlice, type GuidesSlice } from './guides';
export { createZoomSlice, type ZoomSlice } from './zoom';
export { createTextOverlaysSlice, type TextOverlaysSlice } from './textOverlays';
export { createTransitionsSlice, type TransitionsSlice } from './transitions';
export { createLockSlice, type LockSlice } from './lock';
export { createGroupsSlice, type GroupsSlice } from './groups';
export { createPlaybackSlice, type PlaybackSlice } from './playback';
