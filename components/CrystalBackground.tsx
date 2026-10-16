'use client';

import React from 'react';

export default function CrystalBackground() {
  return (
    <div 
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{
        contain: 'strict',
        transform: 'translateZ(0)',
      }}
    >
      {/* 1. Base dark luxury canvas */}
      <div className="absolute inset-0 bg-[#030611]" />

      {/* 2. Abstract modern snakeskin luxury texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85 transition-opacity duration-500"
        style={{
          backgroundImage: "url('/assets/images/snakeskin-emerald-violet-bg.jpg')",
          filter: 'saturate(1.2) contrast(1.12) brightness(0.96)',
        }}
      />

      {/* 3. Fluid blurred gradient light waves: deep emerald green & glowing neon violet */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(circle at 16% 25%, rgba(16, 185, 129, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 84% 35%, rgba(168, 85, 247, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 45% 85%, rgba(5, 150, 105, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 88% 85%, rgba(139, 92, 246, 0.30) 0%, transparent 40%)
          `,
        }}
      />

      {/* 4. Delicate snakeskin micro-scale vector pattern overlay for crisp tactile definition */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse 20px 14px at 50% 50%, rgba(255,255,255,0.7) 15%, transparent 65%)`,
          backgroundSize: '24px 18px',
        }}
      />

      {/* 5. Sleek minimalist ambient vignette ensuring top text & cards remain ultra-legible */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(3, 6, 17, 0.35) 0%, transparent 25%, transparent 75%, rgba(3, 6, 17, 0.65) 100%)',
        }}
      />
    </div>
  );
}

