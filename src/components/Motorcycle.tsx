import React from 'react';
import { interpolate } from 'remotion';
import { COLORS } from '../config/colorPalette';

export const Motorcycle: React.FC<{ frame: number; sceneFrame: number }> = ({ sceneFrame }) => {
  const x = interpolate(sceneFrame, [0, 20], [-200, 100], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        bottom: 200,
        width: 150,
        height: 80,
        backgroundColor: COLORS.motorcycle,
        borderRadius: '10px',
      }}
    >
      {/* Basic Motorcycle Shape */}
      <div style={{ position: 'absolute', left: -20, bottom: -30, width: 60, height: 60, borderRadius: '50%', border: '8px solid #1A1A1A' }} />
      <div style={{ position: 'absolute', right: -20, bottom: -30, width: 60, height: 60, borderRadius: '50%', border: '8px solid #1A1A1A' }} />
      <div style={{ position: 'absolute', top: -30, left: 20, width: 8, height: 34, background: '#333', transform: 'rotate(20deg)' }} />
      <div style={{ position: 'absolute', top: -36, left: -6, width: 46, height: 8, background: '#333', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: 8, right: 10, width: 40, height: 26, background: '#1A1A1A', borderRadius: 6 }} />
    </div>
  );
};
