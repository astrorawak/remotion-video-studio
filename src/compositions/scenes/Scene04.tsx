import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Boy1 } from '../../components/Boy1';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_4_START;
  const cameraZ = interpolate(sceneFrame, [0, 60], [1, 1.1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#2B2B2B', transform: `scale(${cameraZ})` }}>
      <Boy1 frame={frame} sceneFrame={sceneFrame} totalFrames={60} />
    </AbsoluteFill>
  );
};
