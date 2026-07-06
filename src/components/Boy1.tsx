import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CHARACTER_COLORS } from '../utils/colorPalette';

export const Boy1: React.FC<{sceneFrame: number; totalFrames: number}> = ({ sceneFrame, totalFrames }) => {
  const frame = useCurrentFrame();

  // Animation: Aggressive approach
  const translateX = interpolate(sceneFrame, [0, totalFrames], [500, 0]);
  const scale = interpolate(sceneFrame, [0, totalFrames], [0.8, 1.2]);

  return (
    <AbsoluteFill style={{
      transform: `translateX(${translateX}px) scale(${scale})`,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        width: 300, height: 600,
        backgroundColor: CHARACTER_COLORS.BOY1_JERSEY,
        borderRadius: '50px 50px 0 0',
        border: `10px solid ${CHARACTER_COLORS.BOY1_JERSEY_WHITE}`,
        position: 'relative'
      }}>
        {/* Aggressive Face Placeholder */}
        <div style={{
          position: 'absolute', top: 50, width: '100%', textAlign: 'center', fontSize: 80
        }}>😠</div>
      </div>
    </AbsoluteFill>
  );
};
