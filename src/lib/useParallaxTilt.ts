import { useState, useCallback } from 'react';

/**
 * Very subtle pointer depth effect (1-3px shift).
 * Automatically inactive on touch/mobile devices or when prefers-reduced-motion is true.
 */
export function useParallaxTilt(maxShiftPx = 3) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Only run on fine pointers (desktop mouse) and when not reduced motion
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const shiftX = ((x - centerX) / centerX) * maxShiftPx;
    const shiftY = ((y - centerY) / centerY) * maxShiftPx;

    setStyle({
      transform: `translate3d(${shiftX}px, ${shiftY - 3}px, 0)`,
      transition: 'transform 100ms ease-out',
    });
  }, [maxShiftPx]);

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: 'translate3d(0, 0, 0)',
      transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
    });
  }, []);

  return { style, onMouseMove, onMouseLeave };
}
