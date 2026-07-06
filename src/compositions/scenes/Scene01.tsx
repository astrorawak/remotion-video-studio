import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Environment } from '../../components/Environment';
import { Boy1 } from '../../components/Boy1';
import { Boy2 } from '../../components/Boy2';
import { Motorcycle } from '../../components/Motorcycle';
import { FRAME_TIMING } from '../../config/videoConfig';

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_1_START;

  return (
    <AbsoluteFill>
      <Environment />
      <Motorcycle />
      <Boy2 />
      <Boy1 sceneFrame={sceneFrame} totalFrames={60} />
    </AbsoluteFill>
  );
};
