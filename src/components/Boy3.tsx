import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CharacterBase } from './CharacterBase';
import { COLORS } from '../config/colorPalette';
import { getWalkBob, getApproachProgress } from '../animations/characterAnimations';

export const Boy3: React.FC<{ frame: number; sceneFrame: number }> = ({ frame, sceneFrame }) => {
  // Argentina jersey, dark blue pants, sunglasses on forehead.
  // Scene 3: Steps in between with calming gestures.
  const stepIn = getApproachProgress(sceneFrame, 45);
  const calmingWave = Math.sin(frame * 0.25) * 8;

  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CharacterBase
        jersey={COLORS.boy3.jersey}
        pants={COLORS.boy3.pants}
        skin={COLORS.boy3.skin}
        sunglasses
        pose={{
          rotateY: 0,
          rotateZ: 0,
          translateX: 140 - stepIn * 60,
          translateY: getWalkBob(frame, 3),
          scale: 0.9 + stepIn * 0.2,
          mouthOpen: 0.15,
          armLeftRotate: -70 + calmingWave,
          armRightRotate: 70 - calmingWave,
        }}
      />
    </AbsoluteFill>
  );
};
