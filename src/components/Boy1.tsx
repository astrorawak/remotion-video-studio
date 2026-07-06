import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CharacterBase } from './CharacterBase';
import { COLORS } from '../config/colorPalette';
import { getWalkBob, getApproachProgress, getMouthCycle, getLungeRotation } from '../animations/characterAnimations';

export const Boy1: React.FC<{ frame: number; sceneFrame: number; totalFrames: number }> = ({ frame, sceneFrame, totalFrames }) => {
  // Argentina jersey (blue/white), red shorts, tanned skin, angry expression.
  // Scene 1: Walk aggressively. Scene 2: Yelling close-up. Scene 5: Lunge and struggle.
  const approach = getApproachProgress(sceneFrame, totalFrames);
  const lunge = getLungeRotation(sceneFrame, totalFrames, 18);

  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CharacterBase
        jersey={COLORS.boy1.jersey}
        pants="#C81E1E"
        skin={COLORS.boy1.skin}
        pose={{
          rotateY: 0,
          rotateZ: -lunge * 0.4,
          translateX: -140 - lunge * 3,
          translateY: getWalkBob(frame),
          scale: 0.9 + approach * 0.35,
          mouthOpen: getMouthCycle(frame, 0.6),
          armLeftRotate: 10,
          armRightRotate: -20 - lunge,
        }}
      />
    </AbsoluteFill>
  );
};
