/**
 * useScrambleText — terminal "decode" effect for short copy.
 *
 * Plays a brief scramble animation that reveals characters left-to-right.
 * Used by the Data Discovery Matrix on hover (web) or first-in-view (mobile).
 *
 * Design constraints:
 *   - Pure JS, no deps. Tick interval ~28ms (≈35fps) — plenty smooth for text.
 *   - Bails out instantly if `prefers-reduced-motion: reduce` is set.
 *   - Stops cleanly when the trigger flips off; no setState after unmount.
 *   - Accessibility: the *real* text is always accessible via the original
 *     `targetText` — consumers should keep it in a hidden node for screen
 *     readers and only render `displayText` visually.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const SCRAMBLE_CHARS = '0123ABCDEF#$@%&!?*<>/\\';

type Options = {
  /** Boolean that drives the scramble. true → scramble + reveal; false → instant target */
  trigger: boolean;
  /** Total animation length in ms (default 480). */
  duration?: number;
  /** Tick interval in ms — lower is smoother but more CPU (default 28ms). */
  tickMs?: number;
  /** Override default scramble alphabet. */
  chars?: string;
};

/** Detects reduced-motion preference on web; native always returns false (no API yet). */
function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function pickRandom(chars: string): string {
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

export function useScrambleText(targetText: string, options: Options): {
  displayText: string;
  isScrambling: boolean;
} {
  const { trigger, duration = 480, tickMs = 28, chars = SCRAMBLE_CHARS } = options;
  const [displayText, setDisplayText] = useState(targetText);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    // Cleanup any in-flight tick
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!trigger) {
      // Trigger flipped off → snap to target instantly, no animation.
      setDisplayText(targetText);
      setIsScrambling(false);
      return;
    }

    if (prefersReducedMotion()) {
      // Honor the OS-level preference.
      setDisplayText(targetText);
      setIsScrambling(false);
      return;
    }

    const len = targetText.length;
    if (len === 0) {
      setDisplayText('');
      return;
    }

    setIsScrambling(true);
    startedAtRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Reveal window grows linearly.
      const revealedCount = Math.floor(progress * len);

      let next = '';
      for (let i = 0; i < len; i++) {
        const realChar = targetText.charAt(i);
        if (i < revealedCount || realChar === ' ' || realChar === '\n') {
          next += realChar;
        } else {
          next += pickRandom(chars);
        }
      }
      setDisplayText(next);

      if (progress >= 1) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayText(targetText);
        setIsScrambling(false);
      }
    }, tickMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trigger, targetText, duration, tickMs, chars]);

  return { displayText, isScrambling };
}

export default useScrambleText;
