import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const POVHand: React.FC<{sceneFrame: number}> = ({ sceneFrame }) => {
  const translateY = interpolate(sceneFrame, [0, 10, 20], [500, 0, 100], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
      <div style={{
        width: 200, height: 600, backgroundColor: '#87CEEB',
        borderRadius: '100px 100px 0 0', transform: `translateY(${translateY}px) rotate(-10deg)`
      }}>
        <div style={{ position: 'absolute', top: 20, width: '100%', textAlign: 'center', fontSize: 50 }}>⌚</div>
      </div>
    </AbsoluteFill>
  );
};
