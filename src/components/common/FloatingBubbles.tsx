import React from 'react';

/**
 * Floating decorative background glass bubbles
 * Subtle, organic, low-opacity glass spheres drifting asynchronously in the background.
 * Pointer-events none, zero distraction, never covers text.
 */
export const FloatingBubbles: React.FC = () => {
  return (
    <div
      className="floating-bubble-bg fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Bubble 1: Top-left subtle sage bubble */}
      <div
        className="absolute top-[8%] left-[4%] w-72 h-72 rounded-full border border-white/40 shadow-[inset_0_2px_12px_rgba(255,255,255,0.7)]"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(216, 235, 224, 0.28) 0%, rgba(240, 248, 244, 0.08) 70%, transparent 100%)',
          filter: 'blur(35px)',
          animation: 'floatSlow1 16s ease-in-out infinite',
        }}
      />

      {/* Bubble 2: Top-right warm champagne bubble */}
      <div
        className="absolute top-[14%] right-[8%] w-88 h-88 rounded-full border border-white/30 shadow-[inset_0_2px_16px_rgba(255,255,255,0.5)]"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(248, 240, 222, 0.3) 0%, rgba(252, 248, 238, 0.06) 75%, transparent 100%)',
          filter: 'blur(45px)',
          animation: 'floatSlow2 21s ease-in-out infinite',
        }}
      />

      {/* Bubble 3: Mid-center deep soft emerald accent */}
      <div
        className="absolute top-[52%] left-[42%] w-96 h-96 rounded-full border border-white/25"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(220, 238, 228, 0.22) 0%, rgba(235, 245, 240, 0.05) 80%, transparent 100%)',
          filter: 'blur(55px)',
          animation: 'floatSlow3 26s ease-in-out infinite',
        }}
      />

      {/* Bubble 4: Bottom-left gentle mist */}
      <div
        className="absolute bottom-[6%] left-[12%] w-80 h-80 rounded-full border border-white/30"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(244, 238, 224, 0.22) 0%, rgba(248, 245, 236, 0.04) 75%, transparent 100%)',
          filter: 'blur(40px)',
          animation: 'floatSlow1 19s ease-in-out infinite reverse',
        }}
      />

      {/* Bubble 5: Bottom-right muted sage aura */}
      <div
        className="absolute bottom-[10%] right-[5%] w-72 h-72 rounded-full border border-white/35"
        style={{
          background: 'radial-gradient(circle at 45% 45%, rgba(214, 234, 222, 0.24) 0%, rgba(230, 242, 236, 0.06) 70%, transparent 100%)',
          filter: 'blur(35px)',
          animation: 'floatSlow2 17s ease-in-out infinite reverse',
        }}
      />
    </div>
  );
};
