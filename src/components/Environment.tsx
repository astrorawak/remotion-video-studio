import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../config/colorPalette';

export const Environment: React.FC = () => {
  // Rural road, agricultural fields, bright sky, fallen bicycle.
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sky }}>
      {/* sky gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.sky} 0%, #D9F0E0 55%, ${COLORS.field} 55%)` }} />

      {/* distant fields */}
      <div style={{ position: 'absolute', top: '55%', left: 0, width: '100%', height: '45%', background: COLORS.field }} />
      <div style={{ position: 'absolute', top: '55%', left: 0, width: '100%', height: '10%', background: '#4C7A3D', opacity: 0.6 }} />

      {/* road, perspective trapezoid converging to a vanishing point */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: 0,
          height: 0,
          borderLeft: '520px solid transparent',
          borderRight: '520px solid transparent',
          borderBottom: `900px solid ${COLORS.road}`,
          transform: 'translateX(-50%)',
        }}
      />
      {/* road center line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: 10,
          height: 700,
          background: 'repeating-linear-gradient(#E8D96A 0 40px, transparent 40px 80px)',
          transform: 'translateX(-50%)',
        }}
      />

      {/* fallen bicycle silhouette, roadside */}
      <div style={{ position: 'absolute', bottom: 260, left: '18%', width: 140, height: 60, opacity: 0.85 }}>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 46, height: 46, borderRadius: '50%', border: '5px solid #222' }} />
        <div style={{ position: 'absolute', right: 0, bottom: 0, width: 46, height: 46, borderRadius: '50%', border: '5px solid #222' }} />
        <div style={{ position: 'absolute', left: 20, bottom: 20, width: 100, height: 5, background: '#222', transform: 'rotate(-8deg)' }} />
      </div>
    </AbsoluteFill>
  );
};
