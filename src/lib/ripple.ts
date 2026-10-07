/**
 * Liquid Glass Ripple Effect
 * Subtly expands from click/touch coordinates inside interactive elements
 */

export function setupGlassRippleListener(): () => void {
  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    // Check if reduced motion is requested
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Never trigger ripple on SweetAlert2 popups or overlays
    if ((e.target as HTMLElement)?.closest('.swal2-container, .swal2-popup')) {
      return;
    }

    const target = (e.target as HTMLElement)?.closest<HTMLElement>(
      '.btn-pill-primary, .btn-pill-secondary, .btn-luxury-primary, .btn-luxury-secondary, [data-ripple="true"]'
    );

    if (!target) return;

    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Determine diameter to cover the element
    const size = Math.max(rect.width, rect.height) * 1.5;

    const ripple = document.createElement('span');
    ripple.className = 'glass-ripple-wave';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.pointerEvents = 'none';

    // Ensure container is positioned and clips overflow
    const computedPosition = window.getComputedStyle(target).position;
    if (computedPosition === 'static') {
      target.style.position = 'relative';
    }
    target.style.overflow = 'hidden';

    target.appendChild(ripple);

    // Remove after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 550);
  };

  document.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown as EventListener);
  };
}
