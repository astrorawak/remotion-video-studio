import { interpolate } from 'remotion';

export const getCameraShake = (sceneFrame: number, intensity: number = 1) => {
  const seed = Math.sin(sceneFrame * 0.1) * 10000;
  return { x: Math.sin(seed) * intensity * 5, y: Math.cos(seed) * intensity * 5 };
};

export const getPushIn = (sceneFrame: number, totalFrames: number, from: number = 1, to: number = 1.2) => {
  return interpolate(sceneFrame, [0, totalFrames], [from, to], { extrapolateRight: 'clamp' });
};
