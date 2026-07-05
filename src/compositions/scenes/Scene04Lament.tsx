import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PalmTree } from '../../components/PalmTree';
import { FinalText } from '../../components/FinalText';
import { PaperTexture } from '../../components/PaperTexture';
import { BarrenBackdrop, PALM_GRID } from './Scene03PalmInvasion';
import { COLORS } from '../../config/lastFold';

// Scene 04 (690-900): the plantation stills, fades under black, and the
// closing question folds itself into view.
export const Scene04Lament: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blackout = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Only the text fades at the end — the black stays for a clean end frame.
  const textOut = interpolate(frame, [180, 205], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.nearBlack }}>
      {/* Frozen snapshot of the plantation — no shake, fully grown */}
      <AbsoluteFill style={{ opacity: 1 - blackout }}>
        <BarrenBackdrop />
        {PALM_GRID.map((rowDef) =>
          rowDef.xs.map((x, col) => (
            <PalmTree
              key={`${rowDef.row}-${col}`}
              frame={400}
              fps={fps}
              x={x}
              y={rowDef.y}
              size={rowDef.size}
              opacity={rowDef.row === 0 ? 0.85 : 1}
            />
          ))
        )}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: COLORS.nearBlack, opacity: blackout }} />

      <AbsoluteFill style={{ opacity: textOut }}>
        <FinalText frame={frame} fps={fps} delay={70} />
      </AbsoluteFill>

      {/* Keep the paper grain alive on black */}
      <AbsoluteFill style={{ opacity: blackout }}>
        <PaperTexture tone="dark" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
