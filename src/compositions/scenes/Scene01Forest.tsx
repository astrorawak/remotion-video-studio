import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { OrigamiTree } from '../../components/OrigamiTree';
import { OrigamiLeaf } from '../../components/OrigamiLeaf';
import { useDolly } from '../../animations/useDolly';
import { COLORS, SCENES, VIDEO } from '../../config/lastFold';

// Deterministic forest layout — back to front rows.
const TREES = [
  // back row (small, hazy)
  { x: 120, y: 1310, size: 200, variant: 1 as const, opacity: 0.72 },
  { x: 350, y: 1295, size: 185, variant: 1 as const, opacity: 0.72 },
  { x: 590, y: 1315, size: 210, variant: 0 as const, opacity: 0.72 },
  { x: 830, y: 1300, size: 190, variant: 1 as const, opacity: 0.72 },
  { x: 1010, y: 1310, size: 200, variant: 0 as const, opacity: 0.72 },
  // mid row
  { x: 230, y: 1450, size: 300, variant: 0 as const, opacity: 0.9 },
  { x: 540, y: 1435, size: 320, variant: 2 as const, opacity: 0.9 },
  { x: 860, y: 1455, size: 290, variant: 0 as const, opacity: 0.9 },
  // front row (large)
  { x: 90, y: 1640, size: 430, variant: 2 as const, opacity: 1 },
  { x: 480, y: 1660, size: 470, variant: 0 as const, opacity: 1 },
  { x: 880, y: 1645, size: 440, variant: 2 as const, opacity: 1 },
];

// The forest arrangement, shared between Scene01 (grows in, dolly out)
// and Scene02 (folded away). Scene02 passes frame + 240 so entrance
// springs are settled and the idle sway continues seamlessly.
export const ForestTableau: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, ${COLORS.skyDawn} 0%, ${COLORS.paperCream} 55%)`,
      }}
    >
      {/* Faceted paper sun */}
      <svg
        style={{ position: 'absolute', left: 660, top: 260, width: 240, height: 240 }}
        viewBox="0 0 100 100"
      >
        <polygon points="50,2 84,16 98,50 84,84 50,98 50,2" fill="#F1DFA8" opacity="0.9" />
        <polygon points="50,2 16,16 2,50 16,84 50,98 50,2" fill="#F6EBC2" opacity="0.9" />
      </svg>

      {/* Mossy paper hill */}
      <svg style={{ position: 'absolute', inset: 0 }} width="1080" height="1920" viewBox="0 0 1080 1920">
        <polygon
          points="0,1290 180,1245 400,1275 620,1240 840,1270 1080,1245 1080,1920 0,1920"
          fill={COLORS.mossGround}
        />
        <polygon
          points="0,1630 140,1595 300,1625 470,1590 650,1620 820,1595 1080,1615 1080,1920 0,1920"
          fill={COLORS.paperShade}
        />
      </svg>

      {/* Trees — staggered spring entrances, gentle sine sway */}
      {TREES.map((t, i) => (
        <OrigamiTree
          key={i}
          frame={frame}
          fps={fps}
          x={t.x}
          y={t.y}
          size={t.size}
          variant={t.variant}
          opacity={t.opacity}
          delay={i * 6}
          sway={Math.sin(frame * 0.05 + i * 1.7) * 0.8}
        />
      ))}

      {/* Drifting paper leaves */}
      {Array.from({ length: 8 }).map((_, i) => {
        const speed = 1.2 + (i % 3) * 0.5;
        const y = ((i * 260 + frame * speed) % 2000) - 60;
        return (
          <OrigamiLeaf
            key={i}
            x={60 + ((i * 137) % 960) + Math.sin(frame * 0.04 + i) * 30}
            y={y}
            size={20 + (i % 3) * 8}
            rotation={frame * (1 + (i % 4) * 0.3) + i * 40}
            opacity={0.8}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Scene 01 (0-240): lush origami forest, camera slowly dollies OUT.
export const Scene01Forest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dolly = useDolly(frame, SCENES.SCENE_01.duration, 1.18, 1.0);

  return (
    <AbsoluteFill style={{ background: COLORS.paperCream }}>
      <AbsoluteFill
        style={{
          transform: dolly.transform,
          transformOrigin: `${VIDEO.width / 2}px ${VIDEO.height * 0.62}px`,
        }}
      >
        <ForestTableau frame={frame} fps={fps} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
