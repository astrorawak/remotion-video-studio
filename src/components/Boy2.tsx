import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CharacterBase } from './CharacterBase';
import { COLORS } from '../config/colorPalette';
import { getWalkBob, getMouthCycle } from '../animations/characterAnimations';

export const Boy2: React.FC<{ frame: number; sceneFrame: number }> = ({ frame, sceneFrame }) => {
  // Black shirt, camo pants, stern expression.
  // Scene 2: Yelling close-up. Scene 4: Lean in with stern glare.
  const leanIn = Math.min(sceneFrame / 40, 1);

  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CharacterBase
        jersey={COLORS.boy2.shirt}
        jerseyAccent="#1A1A1A"
        pants={COLORS.boy2.pants}
        skin="#B97A4E"
        pose={{
          rotateY: 0,
          rotateZ: 0,
          translateX: 140 + leanIn * 10,
          translateY: getWalkBob(frame, 2),
          scale: 0.95 + leanIn * 0.15,
          mouthOpen: getMouthCycle(frame, 0.4) * 0.5,
          armLeftRotate: 6,
          armRightRotate: -6,
        }}
      />
    </AbsoluteFill>
  );
};
