/**
 * Clip Color Constants
 *
 * Predefined color palette for clip labeling and visual organization
 */

export const CLIP_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  gray: '#6b7280',
} as const;

export type ClipColorKey = keyof typeof CLIP_COLORS;

/**
 * Get color display name from hex value
 */
export const getColorName = (hex: string): string => {
  const entry = Object.entries(CLIP_COLORS).find(([_, value]) => value === hex);
  return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Custom';
};

/**
 * Check if a color is a predefined clip color
 */
export const isPresetColor = (hex: string): boolean => {
  return Object.values(CLIP_COLORS).includes(hex as any);
};
