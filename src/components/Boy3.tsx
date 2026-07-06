import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CHARACTER_COLORS } from '../utils/colorPalette';

export const Boy3: React.FC<{sceneFrame: number}> = ({ sceneFrame }) => {
  const opacity = interpolate(sceneFrame, [0, 15], [0, 1]);

  return (
    <AbsoluteFill style={{
      opacity,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        width: 280, height: 580,
        backgroundColor: CHARACTER_COLORS.BOY3_JERSEY,
        borderRadius: '50px 50px 0 0',
        border: `8px solid ${CHARACTER_COLORS.BOY3_JERSEY_WHITE}`,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: 50, width: '100%', textAlign: 'center', fontSize: 80
        }}>🖐️</div>
      </div>
    </AbsoluteFill>
  );
};
