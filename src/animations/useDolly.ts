import { interpolate } from 'remotion';

// Linear camera dolly (Ken Burns scale). fromScale > toScale = dolly out.
export const useDolly = (
  frame: number,
  durationInFrames: number,
  fromScale: number,
  toScale: number
) => {
  const scale = interpolate(frame, [0, durationInFrames], [fromScale, toScale], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { scale, transform: `scale(${scale})` };
};
