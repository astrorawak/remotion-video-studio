export const getWalkBob = (frame: number, amplitude: number = 4) => {
  return Math.sin(frame * 0.35) * amplitude;
};

export const getApproachProgress = (sceneFrame: number, totalFrames: number) => {
  return Math.min(Math.max(sceneFrame / totalFrames, 0), 1);
};

export const getMouthCycle = (frame: number, speed: number = 0.5) => {
  return (Math.sin(frame * speed) + 1) / 2;
};

export const getLungeRotation = (sceneFrame: number, totalFrames: number, maxDegrees: number = 25) => {
  const progress = getApproachProgress(sceneFrame, totalFrames);
  return progress * progress * maxDegrees;
};
