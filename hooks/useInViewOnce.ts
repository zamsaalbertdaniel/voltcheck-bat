/**
 * useInViewOnce — fires once when an element first becomes visible in the
 * viewport. Web-only via IntersectionObserver; on native it returns true
 * immediately (we don't have a cheap viewport observer there yet).
 *
 * Used by MatrixCard to play the scramble decode reveal on mobile devices
 * that have no hover events.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type Options = {
  /** Visibility threshold in [0, 1]. Default 0.35 — card is mostly in view. */
  threshold?: number;
  /** Margin around the root, e.g. "0px 0px -10% 0px". */
  rootMargin?: string;
  /** Set to false to opt out (e.g. when scramble already triggered via hover). */
  enabled?: boolean;
};

export function useInViewOnce<T extends Element = HTMLElement>(
  options: Options = {},
): { ref: React.RefObject<T | null>; isInView: boolean } {
  const { threshold = 0.35, rootMargin = '0px', enabled = true } = options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // Native: no observer; treat as "in view" so consumers can decide locally.
    if (Platform.OS !== 'web') {
      setIsInView(true);
      return;
    }
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // one-shot
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, enabled]);

  return { ref, isInView };
}

export default useInViewOnce;
