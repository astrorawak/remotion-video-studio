import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Environment } from '../../components/Environment';
import { Boy1 } from '../../components/Boy1';
import { Boy3 } from '../../components/Boy3';
import { Motorcycle } from '../../components/Motorcycle';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_3_START;

  return (
    <AbsoluteFill>
      <Environment />
      <Motorcycle />
      <Boy1 sceneFrame={sceneFrame} totalFrames={90} />
      <Boy3 sceneFrame={sceneFrame} />
    </AbsoluteFill>
  );
};
