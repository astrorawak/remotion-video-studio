import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Environment } from '../../components/Environment';
import { Boy1 } from '../../components/Boy1';
import { POVHand } from '../../components/POVHand';
import { Motorcycle } from '../../components/Motorcycle';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_5_START;
  const opacity = interpolate(sceneFrame, [75, 90], [1, 0]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Environment />
      <Motorcycle />
      <Boy1 sceneFrame={sceneFrame} totalFrames={90} />
      <POVHand sceneFrame={sceneFrame} />
    </AbsoluteFill>
  );
};
