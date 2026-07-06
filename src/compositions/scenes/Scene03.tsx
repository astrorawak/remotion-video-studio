import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Boy1 } from '../../components/Boy1';
import { Boy3 } from '../../components/Boy3';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_3_START;

  return (
    <AbsoluteFill style={{ backgroundColor: '#2B2B2B' }}>
      <Boy1 frame={frame} sceneFrame={sceneFrame} totalFrames={90} />
      <Boy3 frame={frame} sceneFrame={sceneFrame} />
    </AbsoluteFill>
  );
};
