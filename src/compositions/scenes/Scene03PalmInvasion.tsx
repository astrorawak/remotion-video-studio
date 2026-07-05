import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PalmTree } from '../../components/PalmTree';
import { useShakyCam } from '../../animations/useShakyCam';
import { COLORS } from '../../config/lastFold';

// Perspective plantation grid, back row first — indexed rows/cols so the
// reveal marches mechanically toward the camera.
export const PALM_GRID = [
  { row: 0, y: 1260, size: 170, xs: [100, 320, 540, 760, 980] },
  { row: 1, y: 1390, size: 230, xs: [210, 480, 750, 1000] },
  { row: 2, y: 1550, size: 310, xs: [80, 400, 720, 1020] },
  { row: 3, y: 1780, size: 430, xs: [230, 620, 980] },
];

// Barren post-fold landscape — hazy sky over scarred plantation earth.
// Shared with Scene02 (it is what the folding forest reveals) so the
// Scene02 → Scene03 cut is seamless.
export const BarrenBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(to bottom, ${COLORS.hazeSmoke} 0%, ${COLORS.paperShade} 52%)`,
    }}
  >
    <svg style={{ position: 'absolute', inset: 0 }} width="1080" height="1920" viewBox="0 0 1080 1920">
      <polygon
        points="0,1235 260,1210 520,1230 800,1205 1080,1225 1080,1920 0,1920"
        fill={COLORS.earthScar}
      />
      {/* Plantation furrows — spacing widens toward the camera */}
      {[
        { y: 1290, h: 5 },
        { y: 1370, h: 7 },
        { y: 1470, h: 9 },
        { y: 1600, h: 12 },
        { y: 1760, h: 15 },
      ].map((f) => (
        <rect key={f.y} x="0" y={f.y} width="1080" height={f.h} fill={COLORS.earthDark} opacity="0.35" />
      ))}
    </svg>
  </AbsoluteFill>
);

// Scene 03 (390-690): geometric palm-oil invasion, staggered reveal,
// handheld shaky cam that surges as the plantation lands.
export const Scene03PalmInvasion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intensity = interpolate(frame, [0, 60, 300], [0.3, 1.4, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shake = useShakyCam(frame, intensity);
  const gloom = interpolate(frame, [120, 300], [0, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hazeX = interpolate(frame, [0, 300], [-150, 100]);

  return (
    <AbsoluteFill style={{ background: COLORS.paperShade }}>
      {/* Overscaled so the shake never reveals edges */}
      <AbsoluteFill
        style={{
          transform: `scale(1.06) translate(${shake.x}px, ${shake.y}px) rotate(${shake.rotation}deg)`,
        }}
      >
        <BarrenBackdrop />

        {PALM_GRID.map((rowDef) =>
          rowDef.xs.map((x, col) => (
            <PalmTree
              key={`${rowDef.row}-${col}`}
              frame={frame}
              fps={fps}
              x={x}
              y={rowDef.y}
              size={rowDef.size}
              delay={10 + rowDef.row * 22 + col * 7}
              opacity={rowDef.row === 0 ? 0.85 : 1}
            />
          ))
        )}

        {/* Drifting smog band */}
        <div
          style={{
            position: 'absolute',
            left: hazeX,
            top: 1050,
            width: 1400,
            height: 180,
            borderRadius: 120,
            background: COLORS.hazeSmoke,
            opacity: 0.22,
            filter: 'blur(2px)',
          }}
        />
      </AbsoluteFill>

      {/* The scene slowly darkens as the monoculture settles in */}
      <AbsoluteFill style={{ background: COLORS.palmDark, opacity: gloom }} />
    </AbsoluteFill>
  );
};
