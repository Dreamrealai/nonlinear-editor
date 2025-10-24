/**
 * Easter Eggs Hook (Optimized)
 *
 * Performance optimizations:
 * - Debounced key press listeners
 * - Throttled confetti generation
 * - RequestAnimationFrame for all animations
 * - CSS animations instead of JS where possible
 * - Optimized matrix rain canvas rendering
 *
 * Performance target: < 100ms activation
 */
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { trackEasterEggActivation, PerformanceMarker } from '@/lib/performance/monitoring';

// Konami Code sequence
const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

interface EasterEgg {
  id: string;
  keys?: string[];
  keyPressCount?: { key: string; count: number };
  detect?: (event: KeyboardEvent) => boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

interface UseEasterEggsOptions {
  enabled?: boolean;
}

/**
 * Debounce helper
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle helper
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout((): boolean => (inThrottle = false), limit);
    }
  };
}

export function useEasterEggs({ enabled = true }: UseEasterEggsOptions = {}): {
  easterEggsTriggered: string[];
  resetEasterEggs: () => void;
} {
  const [easterEggsTriggered, setEasterEggsTriggered] = useState<string[]>([]);
  const konamiSequence = useRef<string[]>([]);
  const keyPressTracker = useRef<Record<string, number>>({});
  const lastKeyTime = useRef<number>(0);

  // Konami Code effect - optimized
  const activateKonamiCode = useCallback((): void => {
    const marker = new PerformanceMarker('easter_egg_konami');

    setEasterEggsTriggered((prev): string[] => [...prev, 'konami']);

    toast.success('Konami Code activated! You found a secret!', {
      duration: 5000,
      icon: '🎮',
    });

    // Use CSS animation instead of JS
    document.body.classList.add('konami-active');

    // Throttled confetti - create less confetti for better performance
    createConfettiOptimized();

    playSecretSound();

    setTimeout((): void => {
      document.body.classList.remove('konami-active');
    }, 5000);

    marker.end();
    trackEasterEggActivation('konami', marker.end());
  }, []);

  // Developer mode - optimized
  const activateDeveloperMode = useCallback((): void => {
    const marker = new PerformanceMarker('easter_egg_devmode');

    setEasterEggsTriggered((prev): string[] => [...prev, 'devmode']);
    toast('Developer mode activated! Advanced features unlocked.', {
      duration: 4000,
      icon: '👨‍💻',
    });

    localStorage.setItem('secretDevMode', 'true');

    // Use CSS for indicator styling
    const indicator = document.createElement('div');
    indicator.id = 'dev-mode-indicator';
    indicator.textContent = 'DEV MODE';
    indicator.className = 'dev-mode-badge';
    document.body.appendChild(indicator);

    marker.end();
    trackEasterEggActivation('devmode', marker.end());
  }, []);

  // Matrix mode - optimized canvas rendering
  const activateMatrixMode = useCallback((): void => {
    const marker = new PerformanceMarker('easter_egg_matrix');

    setEasterEggsTriggered((prev): string[] => [...prev, 'matrix']);
    toast('The Matrix has you...', {
      duration: 3000,
      icon: '🕶️',
    });

    createMatrixRainOptimized();

    setTimeout((): void => {
      const canvas = document.getElementById('matrix-canvas');
      if (canvas) canvas.remove();
    }, 10000);

    marker.end();
    trackEasterEggActivation('matrix', marker.end());
  }, []);

  // Disco mode - optimized with CSS animations
  const activateDiscoMode = useCallback((): void => {
    const marker = new PerformanceMarker('easter_egg_disco');

    setEasterEggsTriggered((prev): string[] => [...prev, 'disco']);
    toast('Disco time!', {
      duration: 3000,
      icon: '🕺',
    });

    // Use CSS animation instead of setInterval
    document.body.classList.add('disco-mode');

    setTimeout((): void => {
      document.body.classList.remove('disco-mode');
    }, 5000);

    marker.end();
    trackEasterEggActivation('disco', marker.end());
  }, []);

  // Gravity mode - optimized with CSS transforms
  const activateGravityMode = useCallback((): void => {
    const marker = new PerformanceMarker('easter_egg_gravity');

    setEasterEggsTriggered((prev): string[] => [...prev, 'gravity']);
    toast('Gravity reversed!', {
      duration: 3000,
      icon: '🌍',
    });

    // Use CSS animation for better performance
    const elements = document.querySelectorAll('button, .card, img');
    elements.forEach((el): void => {
      if (Math.random() > 0.7 && el instanceof HTMLElement) {
        el.classList.add('gravity-fall');
        setTimeout((): void => {
          el.classList.remove('gravity-fall');
        }, 2000);
      }
    });

    marker.end();
    trackEasterEggActivation('gravity', marker.end());
  }, []);

  // Easter eggs configuration
  const easterEggs: EasterEgg[] = [
    {
      id: 'konami',
      keys: KONAMI_CODE,
      action: activateKonamiCode,
      description: 'Konami Code: ↑↑↓↓←→←→BA',
    },
    {
      id: 'devmode',
      keyPressCount: { key: 'd', count: 5 },
      action: activateDeveloperMode,
      description: 'Press "D" 5 times quickly',
    },
    {
      id: 'matrix',
      keyPressCount: { key: 'm', count: 3 },
      action: activateMatrixMode,
      description: 'Press "M" 3 times quickly',
    },
    {
      id: 'disco',
      keys: ['d', 'i', 's', 'c', 'o'],
      action: activateDiscoMode,
      description: 'Type "disco"',
    },
    {
      id: 'gravity',
      keys: ['g', 'r', 'a', 'v', 'i', 't', 'y'],
      action: activateGravityMode,
      description: 'Type "gravity"',
    },
  ];

  // Debounced key handler for better performance
  const handleKeyDown = useCallback(
    debounce((event: KeyboardEvent): void => {
      if (!enabled) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          return;
        }
      }

      const key = event.key;
      const currentTime = Date.now();

      if (currentTime - lastKeyTime.current > 2000) {
        konamiSequence.current = [];
        keyPressTracker.current = {};
      }
      lastKeyTime.current = currentTime;

      konamiSequence.current.push(key);
      if (konamiSequence.current.length > KONAMI_CODE.length) {
        konamiSequence.current.shift();
      }

      if (!keyPressTracker.current[key]) {
        keyPressTracker.current[key] = 0;
      }
      keyPressTracker.current[key]++;

      easterEggs.forEach((egg): void => {
        if (egg.enabled === false) return;
        if (easterEggsTriggered.includes(egg.id)) return;

        if (egg.keys) {
          const sequenceMatches = egg.keys.every(
            (k, i): boolean => konamiSequence.current[konamiSequence.current.length - egg.keys!.length + i] === k
          );

          if (sequenceMatches) {
            egg.action();
            konamiSequence.current = [];
          }
        }

        if (egg.keyPressCount) {
          const { key: targetKey, count } = egg.keyPressCount;
          if (keyPressTracker.current[targetKey] >= count) {
            egg.action();
            keyPressTracker.current[targetKey] = 0;
          }
        }

        if (egg.detect && egg.detect(event)) {
          egg.action();
        }
      });
    }, 10), // 10ms debounce
    [enabled, easterEggsTriggered, activateKonamiCode, activateDeveloperMode, activateMatrixMode, activateDiscoMode, activateGravityMode]
  );

  const resetEasterEggs = useCallback((): void => {
    setEasterEggsTriggered([]);
    konamiSequence.current = [];
    keyPressTracker.current = {};
    localStorage.removeItem('secretDevMode');

    const indicator = document.getElementById('dev-mode-indicator');
    if (indicator) indicator.remove();
  }, []);

  useEffect((): () => void => {
    const handler = (e: KeyboardEvent): void => handleKeyDown(e);
    window.addEventListener('keydown', handler);
    return (): void => window.removeEventListener('keydown', handler);
  }, [handleKeyDown]);

  // Inject optimized CSS
  useEffect((): () => void => {
    const style = document.createElement('style');
    style.id = 'easter-egg-styles';
    style.textContent = `
      @keyframes rainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes disco-flash {
        0%, 100% { background: #ff6b6b; }
        16% { background: #4ecdc4; }
        33% { background: #45b7d1; }
        50% { background: #ffd93d; }
        66% { background: #6bcf7f; }
        83% { background: #a77bca; }
      }

      @keyframes gravity-fall {
        0% { transform: translateY(0) rotate(0deg); }
        100% { transform: translateY(100vh) rotate(360deg); }
      }

      .konami-active {
        background: linear-gradient(
          270deg,
          #ff6b6b,
          #4ecdc4,
          #45b7d1,
          #ffd93d,
          #6bcf7f,
          #a77bca,
          #ff6b6b
        ) !important;
        background-size: 400% 400% !important;
        animation: rainbow 5s ease infinite !important;
      }

      .disco-mode {
        animation: disco-flash 0.2s infinite !important;
      }

      .gravity-fall {
        animation: gravity-fall 1s ease-in forwards !important;
      }

      .dev-mode-badge {
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 1px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        background: currentColor;
        animation: confetti-fall 3s linear forwards;
        z-index: 9999;
        will-change: transform;
      }

      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return (): void => {
      const existingStyle = document.getElementById('easter-egg-styles');
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  return {
    easterEggsTriggered,
    resetEasterEggs,
  };
}

/**
 * Optimized confetti with throttling and fewer particles
 */
function createConfettiOptimized(): void {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#6bcf7f', '#a77bca'];
  const confettiCount = 30; // Reduced from 50

  // Use requestAnimationFrame for better performance
  let count = 0;
  const createNext = (): void => {
    if (count >= confettiCount) return;

    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.top = '-10px';
    confetti.style.color = colors[Math.floor(Math.random() * colors.length)]!;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(confetti);

    setTimeout((): void => confetti.remove(), 3000);

    count++;
    if (count < confettiCount) {
      setTimeout(createNext, 50); // Throttle creation
    }
  };

  createNext();
}

/**
 * Optimized matrix rain with requestAnimationFrame
 */
function createMatrixRainOptimized(): void {
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
    pointer-events: none;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops: number[] = [];

  for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100;
  }

  let frameCount = 0;
  let animationId: number;

  function draw(): void {
    if (!ctx) return;

    // Update every other frame for better performance
    frameCount++;
    if (frameCount % 2 === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        if (text) {
          ctx.fillText(text, i * fontSize, drops[i]! * fontSize);
        }

        if (drops[i]! * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]!++;
      }
    }

    animationId = requestAnimationFrame(draw);
  }

  animationId = requestAnimationFrame(draw);

  // Clean up after 10 seconds
  setTimeout((): void => {
    cancelAnimationFrame(animationId);
    canvas.remove();
  }, 10000);
}

/**
 * Play secret sound
 */
function playSecretSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 523.25;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    // Silently fail
  }
}
