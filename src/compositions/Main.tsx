import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Scene01 } from './scenes/Scene01';
import { Scene02 } from './scenes/Scene02';
import { Scene03 } from './scenes/Scene03';
import { Scene04 } from './scenes/Scene04';
import { Scene05 } from './scenes/Scene05';
import { FRAME_TIMING } from '../config/videoConfig';

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <Sequence from={FRAME_TIMING.SCENE_1_START} durationInFrames={60}><Scene01 /></Sequence>
      <Sequence from={FRAME_TIMING.SCENE_2_START} durationInFrames={90}><Scene02 /></Sequence>
      <Sequence from={FRAME_TIMING.SCENE_3_START} durationInFrames={90}><Scene03 /></Sequence>
      <Sequence from={FRAME_TIMING.SCENE_4_START} durationInFrames={60}><Scene04 /></Sequence>
      <Sequence from={FRAME_TIMING.SCENE_5_START} durationInFrames={90}><Scene05 /></Sequence>
    </AbsoluteFill>
  );
};
