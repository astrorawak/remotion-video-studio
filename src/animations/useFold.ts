import { interpolate, spring } from 'remotion';

export interface FoldConfig {
  delay?: number;
  damping?: number;
  stiffness?: number;
  from?: number;
  to?: number;
}

// Spring-driven fold progress. Pure function of frame — safe across
// parallel render workers. progress: 0 (flat) → 1 (fully folded).
export const useFold = (frame: number, fps: number, config: FoldConfig = {}) => {
  const progress = spring({
    frame: frame - (config.delay ?? 0),
    fps,
    config: {
      damping: config.damping ?? 26,
      stiffness: config.stiffness ?? 70,
    },
    from: config.from ?? 0,
    to: config.to ?? 1,
  });
  const rotationDeg = interpolate(progress, [0, 1], [0, 180]);
  return { progress, rotationDeg };
};
