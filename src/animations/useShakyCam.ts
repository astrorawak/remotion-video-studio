// Deterministic handheld camera shake: sums of incommensurate sine waves
// so the motion never visibly loops. No Math.random() — parallel render
// workers must agree on every frame.
export const useShakyCam = (frame: number, intensity = 1) => {
  const x =
    (Math.sin(frame * 0.37) * 5 +
      Math.sin(frame * 1.13 + 2) * 2.5 +
      Math.sin(frame * 2.71) * 1.2) *
    intensity;
  const y =
    (Math.sin(frame * 0.29 + 1) * 4 +
      Math.sin(frame * 0.97 + 4) * 2 +
      Math.sin(frame * 3.1) * 1) *
    intensity;
  const rotation =
    (Math.sin(frame * 0.23 + 3) * 0.4 + Math.sin(frame * 1.51) * 0.15) *
    intensity;
  return { x, y, rotation };
};
