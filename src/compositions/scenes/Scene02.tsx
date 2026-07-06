import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Boy1 } from '../../components/Boy1';
import { Boy2 } from '../../components/Boy2';
import { POVHand } from '../../components/POVHand';
import { FRAME_TIMING } from '../../config/videoConfig';
import { getCameraShake } from '../../animations/cameraAnimations';

export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_2_START;
  const shake = getCameraShake(sceneFrame, 1.5);

  return (
    <AbsoluteFill style={{ backgroundColor: '#2B2B2B', transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      <Boy1 frame={frame} sceneFrame={sceneFrame} totalFrames={90} />
      <Boy2 frame={frame} sceneFrame={sceneFrame} />
      <POVHand frame={frame} sceneFrame={sceneFrame} action="defend" />
    </AbsoluteFill>
  );
};
