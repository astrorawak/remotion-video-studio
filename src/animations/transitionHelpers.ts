export const getSceneFadeOpacity = (sceneFrame: number, totalFrames: number, fadeFrames: number = 8) => {
  const fadeIn = Math.min(sceneFrame / fadeFrames, 1);
  const fadeOut = Math.min((totalFrames - sceneFrame) / fadeFrames, 1);
  return Math.max(0, Math.min(fadeIn, fadeOut, 1));
};

export const getFadeToBlack = (sceneFrame: number, startFrame: number, durationFrames: number) => {
  if (sceneFrame < startFrame) return 0;
  return Math.min((sceneFrame - startFrame) / durationFrames, 1);
};
