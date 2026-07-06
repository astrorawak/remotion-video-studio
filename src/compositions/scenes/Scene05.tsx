import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Boy1 } from '../../components/Boy1';
import { POVHand } from '../../components/POVHand';
import { Motorcycle } from '../../components/Motorcycle';
import { FRAME_TIMING } from '../../config/videoConfig';
import { COLORS } from '../../config/colorPalette';
import { getCameraShake } from '../../animations/cameraAnimations';
import { getFadeToBlack } from '../../animations/transitionHelpers';

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - FRAME_TIMING.SCENE_5_START;
  const shake = getCameraShake(sceneFrame, 3);
  const fadeToBlack = getFadeToBlack(sceneFrame, 65, 25);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.sky} 0%, ${COLORS.field} 70%)`,
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      <Motorcycle frame={frame} sceneFrame={sceneFrame} />
      <Boy1 frame={frame} sceneFrame={sceneFrame} totalFrames={90} />
      <POVHand frame={frame} sceneFrame={sceneFrame} action="grab" />
      <AbsoluteFill style={{ backgroundColor: '#000000', opacity: fadeToBlack }} />
    </AbsoluteFill>
  );
};
