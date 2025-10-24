/**
 * Easter Eggs Hook
 *
 * Provides fun hidden features that users can discover:
 * - Konami Code: Activates special effects
 * - Secret shortcuts: Hidden functionality
 * - Fun animations and messages
 */
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import toast from 'react-hot-toast';

// Konami Code sequence: ↑ ↑ ↓ ↓ ← → ← → B A
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
  /** Unique identifier */
  id: string;
  /** Keys to trigger the easter egg */
  keys?: string[];
  /** Number of times to press a key */
  keyPressCount?: { key: string; count: number };
  /** Custom detection function */
  detect?: (event: KeyboardEvent) => boolean;
  /** Action to perform when triggered */
  action: () => void;
  /** Description for documentation */
  description: string;
  /** Whether the easter egg is enabled */
  enabled?: boolean;
}

interface UseEasterEggsOptions {
  /** Enable all easter eggs */
  enabled?: boolean;
}

export function useEasterEggs({ enabled = true }: UseEasterEggsOptions = {}): {
  easterEggsTriggered: string[];
  resetEasterEggs: () => void;
} {
  const [easterEggsTriggered, setEasterEggsTriggered] = useState<string[]>([]);
  const konamiSequence = useRef<string[]>([]);
  const keyPressTracker = useRef<Record<string, number>>({});
  const lastKeyTime = useRef<number>(0);

  // Konami Code effect
  const activateKonamiCode = useCallback(() => {
    // Add triggered easter egg
    setEasterEggsTriggered((prev) => [...prev, 'konami']);

    // Show success message
    toast.success('Konami Code activated! You found a secret!', {
      duration: 5000,
      icon: '🎮',
    });

    // Apply rainbow effect to body
    document.body.classList.add('konami-active');

    // Create confetti effect
    createConfetti();

    // Play secret sound (if available)
    playSecretSound();

    // Remove effect after 5 seconds
    setTimeout(() => {
      document.body.classList.remove('konami-active');
    }, 5000);
  }, []);

  // Secret developer mode
  const activateDeveloperMode = useCallback(() => {
    setEasterEggsTriggered((prev) => [...prev, 'devmode']);
    toast('Developer mode activated! Advanced features unlocked.', {
      duration: 4000,
      icon: '👨‍💻',
    });

    // Store in localStorage
    localStorage.setItem('secretDevMode', 'true');

    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.id = 'dev-mode-indicator';
    indicator.textContent = 'DEV MODE';
    indicator.style.cssText = `
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
    `;
    document.body.appendChild(indicator);
  }, []);

  // Secret matrix mode
  const activateMatrixMode = useCallback(() => {
    setEasterEggsTriggered((prev) => [...prev, 'matrix']);
    toast('The Matrix has you...', {
      duration: 3000,
      icon: '🕶️',
    });

    // Create matrix rain effect
    createMatrixRain();

    // Stop after 10 seconds
    setTimeout(() => {
      const canvas = document.getElementById('matrix-canvas');
      if (canvas) {
        canvas.remove();
      }
    }, 10000);
  }, []);

  // Secret disco mode (flashing colors)
  const activateDiscoMode = useCallback(() => {
    setEasterEggsTriggered((prev) => [...prev, 'disco']);
    toast('Disco time!', {
      duration: 3000,
      icon: '🕺',
    });

    let interval: NodeJS.Timeout;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#6bcf7f', '#a77bca'];
    let colorIndex = 0;

    interval = setInterval(() => {
      document.body.style.background = colors[colorIndex % colors.length];
      colorIndex++;
    }, 200);

    // Stop after 5 seconds and restore
    setTimeout(() => {
      clearInterval(interval);
      document.body.style.background = '';
    }, 5000);
  }, []);

  // Secret gravity mode (elements fall)
  const activateGravityMode = useCallback(() => {
    setEasterEggsTriggered((prev) => [...prev, 'gravity']);
    toast('Gravity reversed!', {
      duration: 3000,
      icon: '🌍',
    });

    // Apply gravity animation to random elements
    const elements = document.querySelectorAll('button, .card, img');
    elements.forEach((el, i) => {
      if (Math.random() > 0.7 && el instanceof HTMLElement) {
        el.style.transition = 'transform 1s ease-in';
        el.style.transform = `translateY(${window.innerHeight}px) rotate(${Math.random() * 360}deg)`;

        setTimeout(() => {
          el.style.transition = 'transform 1s ease-out';
          el.style.transform = '';
        }, 2000);
      }
    });
  }, []);

  // Easter eggs configuration
  const easterEggs: EasterEgg[] = [
    {
      id: 'konami',
      keys: KONAMI_CODE,
      action: activateKonamiCode,
      description: 'Konami Code: ↑↑↓↓←→←→BA - Activates rainbow effect and confetti',
    },
    {
      id: 'devmode',
      keyPressCount: { key: 'd', count: 5 },
      action: activateDeveloperMode,
      description: 'Press "D" 5 times quickly - Activates secret developer mode',
    },
    {
      id: 'matrix',
      keyPressCount: { key: 'm', count: 3 },
      action: activateMatrixMode,
      description: 'Press "M" 3 times quickly - Activates Matrix rain effect',
    },
    {
      id: 'disco',
      keys: ['d', 'i', 's', 'c', 'o'],
      action: activateDiscoMode,
      description: 'Type "disco" - Activates disco mode with flashing colors',
    },
    {
      id: 'gravity',
      keys: ['g', 'r', 'a', 'v', 'i', 't', 'y'],
      action: activateGravityMode,
      description: 'Type "gravity" - Elements fall off the screen',
    },
  ];

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in input
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          return;
        }
      }

      const key = event.key;
      const currentTime = Date.now();

      // Reset sequence if too much time has passed (2 seconds)
      if (currentTime - lastKeyTime.current > 2000) {
        konamiSequence.current = [];
        keyPressTracker.current = {};
      }
      lastKeyTime.current = currentTime;

      // Update Konami sequence
      konamiSequence.current.push(key);
      if (konamiSequence.current.length > KONAMI_CODE.length) {
        konamiSequence.current.shift();
      }

      // Update key press tracker
      if (!keyPressTracker.current[key]) {
        keyPressTracker.current[key] = 0;
      }
      keyPressTracker.current[key]++;

      // Check each easter egg
      easterEggs.forEach((egg) => {
        if (egg.enabled === false) return;

        // Already triggered
        if (easterEgsTriggered.includes(egg.id)) return;

        // Check sequence-based easter eggs
        if (egg.keys) {
          const sequenceMatches = egg.keys.every(
            (k, i) => konamiSequence.current[konamiSequence.current.length - egg.keys!.length + i] === k
          );

          if (sequenceMatches) {
            egg.action();
            konamiSequence.current = [];
          }
        }

        // Check key press count easter eggs
        if (egg.keyPressCount) {
          const { key: targetKey, count } = egg.keyPressCount;
          if (keyPressTracker.current[targetKey] >= count) {
            egg.action();
            keyPressTracker.current[targetKey] = 0;
          }
        }

        // Check custom detection
        if (egg.detect && egg.detect(event)) {
          egg.action();
        }
      });
    },
    [enabled, easterEggsTriggered, activateKonamiCode, activateDeveloperMode, activateMatrixMode, activateDiscoMode, activateGravityMode]
  );

  // Reset easter eggs
  const resetEasterEggs = useCallback(() => {
    setEasterEggsTriggered([]);
    konamiSequence.current = [];
    keyPressTracker.current = {};
    localStorage.removeItem('secretDevMode');

    // Remove dev mode indicator
    const indicator = document.getElementById('dev-mode-indicator');
    if (indicator) {
      indicator.remove();
    }
  }, []);

  // Register event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Inject CSS for konami effect
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'easter-egg-styles';
    style.textContent = `
      @keyframes rainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
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

      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        background: currentColor;
        animation: confetti-fall 3s linear forwards;
        z-index: 9999;
      }

      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('easter-egg-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return {
    easterEggsTriggered,
    resetEasterEggs,
  };
}

// Helper: Create confetti effect
function createConfetti(): void {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#6bcf7f', '#a77bca'];

  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = '-10px';
      confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// Helper: Create matrix rain effect
function createMatrixRain(): void {
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

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 14;
  const columns = canvas.width / fontSize;
  const drops: number[] = [];

  for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100;
  }

  function draw(): void {
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  const interval = setInterval(draw, 33);

  // Clean up after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    canvas.remove();
  }, 10000);
}

// Helper: Play secret sound (if audio context available)
function playSecretSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 523.25; // C note
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    // Silently fail if audio not available
  }
}
