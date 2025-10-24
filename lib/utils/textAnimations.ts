/**
 * Text Animation Utilities
 *
 * Provides easing functions and animation calculations for text overlays.
 * Supports various animation types including fade, slide, scale, and rotate.
 */

import type { EasingFunction, TextAnimation, TextAnimationType } from '@/types/timeline';

/**
 * Easing Functions
 *
 * Mathematical functions that control animation acceleration/deceleration.
 * All functions accept a normalized time value (0-1) and return a progress value (0-1).
 */
export const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t: number): number => t,

  // Standard easing
  'ease-in': (t: number): number => t * t,
  'ease-out': (t: number): number => t * (2 - t),
  'ease-in-out': (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Quadratic easing
  'ease-in-quad': (t: number): number => t * t,
  'ease-out-quad': (t: number): number => t * (2 - t),
  'ease-in-out-quad': (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic easing
  'ease-in-cubic': (t: number): number => t * t * t,
  'ease-out-cubic': (t: number): number => (--t) * t * t + 1,
  'ease-in-out-cubic': (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Bounce easing
  bounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * Animation State
 *
 * Represents the computed transform and opacity for a text overlay at a given time.
 */
export type AnimationState = {
  opacity: number;
  transform: string;
  visible: boolean;
};

/**
 * Calculate animation progress
 *
 * Determines the current animation progress considering delays, repeats, and direction.
 *
 * @param elapsedTime - Time elapsed since overlay became visible (seconds)
 * @param animation - Animation configuration
 * @returns Normalized progress value (0-1), or null if animation hasn't started
 */
function calculateAnimationProgress(
  elapsedTime: number,
  animation: TextAnimation
): number | null {
  const { duration, delay, repeat, direction } = animation;

  // Check if animation has started
  if (elapsedTime < delay) {
    return null;
  }

  // Calculate time relative to animation start
  const animationTime = elapsedTime - delay;

  // Handle repeat
  let cycleTime = animationTime;
  if (repeat === -1) {
    // Infinite repeat
    cycleTime = animationTime % duration;
  } else if (repeat > 0) {
    const totalDuration = duration * (repeat + 1);
    if (animationTime > totalDuration) {
      // Animation completed
      return 1;
    }
    cycleTime = animationTime % duration;
  } else if (animationTime > duration) {
    // No repeat, animation completed
    return 1;
  }

  // Calculate normalized progress (0-1)
  let progress = cycleTime / duration;

  // Apply direction
  const cycle = Math.floor(animationTime / duration);
  if (direction === 'reverse') {
    progress = 1 - progress;
  } else if (direction === 'alternate') {
    progress = cycle % 2 === 1 ? 1 - progress : progress;
  } else if (direction === 'alternate-reverse') {
    progress = cycle % 2 === 0 ? 1 - progress : progress;
  }

  return Math.max(0, Math.min(1, progress));
}

/**
 * Calculate fade animation
 */
function calculateFadeAnimation(
  type: 'fade-in' | 'fade-out' | 'fade-in-out',
  progress: number
): Partial<AnimationState> {
  if (type === 'fade-in') {
    return { opacity: progress };
  } else if (type === 'fade-out') {
    return { opacity: 1 - progress };
  } else {
    // fade-in-out: fade in first half, fade out second half
    const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    return { opacity };
  }
}

/**
 * Calculate slide animation
 */
function calculateSlideAnimation(
  type: 'slide-in-left' | 'slide-in-right' | 'slide-in-top' | 'slide-in-bottom' |
       'slide-out-left' | 'slide-out-right' | 'slide-out-top' | 'slide-out-bottom',
  progress: number
): Partial<AnimationState> {
  const isIn = type.includes('in');
  const effectiveProgress = isIn ? progress : 1 - progress;

  let translateX = 0;
  let translateY = 0;

  if (type.includes('left')) {
    translateX = (1 - effectiveProgress) * -100;
  } else if (type.includes('right')) {
    translateX = (1 - effectiveProgress) * 100;
  } else if (type.includes('top')) {
    translateY = (1 - effectiveProgress) * -100;
  } else if (type.includes('bottom')) {
    translateY = (1 - effectiveProgress) * 100;
  }

  return {
    transform: `translate(calc(-50% + ${translateX}%), calc(-50% + ${translateY}%))`,
    opacity: effectiveProgress,
  };
}

/**
 * Calculate scale animation
 */
function calculateScaleAnimation(
  type: 'scale-in' | 'scale-out' | 'scale-pulse',
  progress: number
): Partial<AnimationState> {
  if (type === 'scale-in') {
    const scale = progress;
    return {
      transform: `translate(-50%, -50%) scale(${scale})`,
      opacity: progress,
    };
  } else if (type === 'scale-out') {
    const scale = 1 - progress * 0.5; // Scale down to 0.5
    return {
      transform: `translate(-50%, -50%) scale(${scale})`,
      opacity: 1 - progress,
    };
  } else {
    // scale-pulse: scale from 1 to 1.2 and back
    const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
    return {
      transform: `translate(-50%, -50%) scale(${scale})`,
    };
  }
}

/**
 * Calculate rotate animation
 */
function calculateRotateAnimation(
  type: 'rotate-in' | 'rotate-out',
  progress: number
): Partial<AnimationState> {
  if (type === 'rotate-in') {
    const rotation = (1 - progress) * -180; // Rotate from -180 to 0
    return {
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      opacity: progress,
    };
  } else {
    const rotation = progress * 180; // Rotate from 0 to 180
    return {
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      opacity: 1 - progress,
    };
  }
}

/**
 * Calculate bounce-in animation
 */
function calculateBounceInAnimation(progress: number): Partial<AnimationState> {
  // Use bounce easing for scale
  const bounceProgress = easingFunctions.bounce(progress);
  return {
    transform: `translate(-50%, -50%) scale(${bounceProgress})`,
    opacity: progress,
  };
}

/**
 * Calculate typewriter animation
 */
function calculateTypewriterAnimation(
  progress: number,
  text: string
): Partial<AnimationState> & { visibleText: string } {
  const visibleLength = Math.floor(text.length * progress);
  return {
    visibleText: text.slice(0, visibleLength),
  };
}

/**
 * Calculate animation state for a text overlay
 *
 * @param _overlayDuration - Total duration of the text overlay (seconds) - reserved for future use
 * @param elapsedTime - Time elapsed since overlay became visible (seconds)
 * @param animation - Animation configuration
 * @param text - Text content (for typewriter effect)
 * @returns Animation state with opacity and transform
 */
export function calculateTextAnimationState(
  _overlayDuration: number,
  elapsedTime: number,
  animation: TextAnimation | undefined,
  text: string
): AnimationState & { visibleText?: string } {
  // Default state (no animation)
  const defaultState: AnimationState = {
    opacity: 1,
    transform: 'translate(-50%, -50%)',
    visible: true,
  };

  if (!animation || animation.type === 'none') {
    return { ...defaultState, visibleText: text };
  }

  // Calculate animation progress
  const rawProgress = calculateAnimationProgress(elapsedTime, animation);

  // If animation hasn't started yet
  if (rawProgress === null) {
    return {
      ...defaultState,
      opacity: animation.type.includes('fade-in') || animation.type.includes('slide-in') ||
               animation.type.includes('scale-in') || animation.type.includes('rotate-in') ||
               animation.type === 'bounce-in' ? 0 : 1,
      visible: animation.type !== 'typewriter',
      visibleText: animation.type === 'typewriter' ? '' : text,
    };
  }

  // Apply easing function
  const progress = easingFunctions[animation.easing](rawProgress);

  // Calculate animation-specific state
  let animationState: Partial<AnimationState> & { visibleText?: string } = {};

  switch (animation.type) {
    case 'fade-in':
    case 'fade-out':
    case 'fade-in-out':
      animationState = calculateFadeAnimation(animation.type, progress);
      break;

    case 'slide-in-left':
    case 'slide-in-right':
    case 'slide-in-top':
    case 'slide-in-bottom':
    case 'slide-out-left':
    case 'slide-out-right':
    case 'slide-out-top':
    case 'slide-out-bottom':
      animationState = calculateSlideAnimation(animation.type, progress);
      break;

    case 'scale-in':
    case 'scale-out':
    case 'scale-pulse':
      animationState = calculateScaleAnimation(animation.type, progress);
      break;

    case 'rotate-in':
    case 'rotate-out':
      animationState = calculateRotateAnimation(animation.type, progress);
      break;

    case 'bounce-in':
      animationState = calculateBounceInAnimation(progress);
      break;

    case 'typewriter':
      animationState = calculateTypewriterAnimation(progress, text);
      break;
  }

  return {
    ...defaultState,
    ...animationState,
    visibleText: animationState.visibleText ?? text,
  };
}

/**
 * Animation Presets
 *
 * Common animation configurations for quick selection.
 */
export const animationPresets: Record<string, TextAnimation> = {
  none: {
    type: 'none',
    duration: 0,
    delay: 0,
    easing: 'linear',
    repeat: 0,
    direction: 'normal',
  },
  fadeIn: {
    type: 'fade-in',
    duration: 0.5,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  fadeOut: {
    type: 'fade-out',
    duration: 0.5,
    delay: 0,
    easing: 'ease-in',
    repeat: 0,
    direction: 'normal',
  },
  fadeInOut: {
    type: 'fade-in-out',
    duration: 1.0,
    delay: 0,
    easing: 'ease-in-out',
    repeat: 0,
    direction: 'normal',
  },
  slideInLeft: {
    type: 'slide-in-left',
    duration: 0.6,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  slideInRight: {
    type: 'slide-in-right',
    duration: 0.6,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  slideInTop: {
    type: 'slide-in-top',
    duration: 0.6,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  slideInBottom: {
    type: 'slide-in-bottom',
    duration: 0.6,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  scaleIn: {
    type: 'scale-in',
    duration: 0.5,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  scalePulse: {
    type: 'scale-pulse',
    duration: 1.0,
    delay: 0,
    easing: 'ease-in-out',
    repeat: -1,
    direction: 'normal',
  },
  bounceIn: {
    type: 'bounce-in',
    duration: 0.8,
    delay: 0,
    easing: 'linear',
    repeat: 0,
    direction: 'normal',
  },
  rotateIn: {
    type: 'rotate-in',
    duration: 0.6,
    delay: 0,
    easing: 'ease-out',
    repeat: 0,
    direction: 'normal',
  },
  typewriter: {
    type: 'typewriter',
    duration: 2.0,
    delay: 0,
    easing: 'linear',
    repeat: 0,
    direction: 'normal',
  },
};

/**
 * Get animation display name
 */
export function getAnimationDisplayName(type: TextAnimationType): string {
  const names: Record<TextAnimationType, string> = {
    'none': 'None',
    'fade-in': 'Fade In',
    'fade-out': 'Fade Out',
    'fade-in-out': 'Fade In/Out',
    'slide-in-left': 'Slide In (Left)',
    'slide-in-right': 'Slide In (Right)',
    'slide-in-top': 'Slide In (Top)',
    'slide-in-bottom': 'Slide In (Bottom)',
    'slide-out-left': 'Slide Out (Left)',
    'slide-out-right': 'Slide Out (Right)',
    'slide-out-top': 'Slide Out (Top)',
    'slide-out-bottom': 'Slide Out (Bottom)',
    'scale-in': 'Scale In',
    'scale-out': 'Scale Out',
    'scale-pulse': 'Scale Pulse',
    'rotate-in': 'Rotate In',
    'rotate-out': 'Rotate Out',
    'bounce-in': 'Bounce In',
    'typewriter': 'Typewriter',
  };

  return names[type];
}
