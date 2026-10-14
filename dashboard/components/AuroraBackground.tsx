'use client';

import dynamic from 'next/dynamic';

const Aurora = dynamic(() => import('./Aurora'), { ssr: false });

export default function AuroraBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#060410',
      }}
    >
      <Aurora
        colorStops={['#4338ca', '#9333ea', '#2563eb']}
        blend={0.6}
        amplitude={1.2}
        speed={0.5}
      />
    </div>
  );
}
