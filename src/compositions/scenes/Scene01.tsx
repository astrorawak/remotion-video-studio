import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Boy1 } from '../../components/Boy1';
import { Environment } from '../../components/Environment';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_1_START;

  const cameraZ = interpolate(sceneFrame, [0, 60], [1, 1.2]);

  return (
    <AbsoluteFill style={{ transform: `scale(${cameraZ})` }}>
      <Environment />
      <Boy1 frame={frame} sceneFrame={sceneFrame} totalFrames={60} />
    </AbsoluteFill>
  );
};
