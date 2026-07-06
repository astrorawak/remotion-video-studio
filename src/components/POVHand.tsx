import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';

export const POVHand: React.FC<{ frame: number; sceneFrame: number; action?: 'defend' | 'grab' }> = ({ sceneFrame, action }) => {
  // Light blue sleeve, watch on wrist.
  // Scene 2: Defensive palm. Scene 5: Grab Boy 1's arm.
  const reach = interpolate(sceneFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const isGrab = action === 'grab';

  return (
    <AbsoluteFill>
      {/* POV Hand Animation */}
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          right: '18%',
          width: 90,
          height: 260,
          transformOrigin: 'bottom center',
          transform: `translateY(${(1 - reach) * 120}px) rotate(${isGrab ? -20 - reach * 15 : -8}deg)`,
        }}
      >
        {/* sleeve */}
        <div style={{ position: 'absolute', bottom: 90, width: 90, height: 170, background: '#7FC7F5', borderRadius: 20 }} />
        {/* wrist watch */}
        <div style={{ position: 'absolute', bottom: 82, width: 90, height: 14, background: '#1A1A1A' }} />
        {/* hand / palm */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: 90,
            height: 100,
            background: '#FFDBAC',
            borderRadius: isGrab ? 24 : '50% 50% 40% 40%',
            transform: isGrab ? `scale(${0.9 + reach * 0.2})` : 'none',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
