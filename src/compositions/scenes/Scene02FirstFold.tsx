import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FoldingAction } from '../../components/FoldingAction';
import { OrigamiLeaf } from '../../components/OrigamiLeaf';
import { ForestTableau } from './Scene01Forest';
import { BarrenBackdrop } from './Scene03PalmInvasion';
import { SCENES } from '../../config/lastFold';

const SCATTER = [
  { dx: -380, dy: -260, rot: 220 },
  { dx: 340, dy: -320, rot: -180 },
  { dx: -300, dy: 240, rot: 160 },
  { dx: 420, dy: 180, rot: -240 },
  { dx: -160, dy: -420, rot: 300 },
  { dx: 200, dy: 380, rot: -140 },
];

// Scene 02 (240-390): the first fold. The living forest trembles, folds
// in on itself vertically, then the remnant folds away sideways —
// revealing the barren plantation earth Scene03 inherits.
export const Scene02FirstFold: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Paper about to move: subtle tremor before the fold begins.
  const tremorAmp = interpolate(frame, [0, 14, 26], [1.2, 2.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tremorX = Math.sin(frame * 2.2) * tremorAmp;
  const tremorY = Math.sin(frame * 1.7 + 1) * tremorAmp * 0.7;

  // After the fold, push in to 1.06 — Scene03's shaky cam runs overscaled
  // at 1.06, so ending here at the same scale makes the cut seamless.
  const pushIn = interpolate(frame, [95, 150], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ transform: `scale(${pushIn})` }}>
      {/* What the fold reveals */}
      <BarrenBackdrop />

      <AbsoluteFill style={{ transform: `translate(${tremorX}px, ${tremorY}px)` }}>
        {/* Slow vertical fold first, then the whole (mostly folded)
            remnant folds away horizontally and vanishes. */}
        <FoldingAction frame={frame} fps={fps} direction="horizontal" delay={85} foldConfig={{ damping: 11, stiffness: 30 }} shadeMode="dim">
          {/* to: 0.85 — the vertical fold stops just short of vanishing
              (~85°), so the horizontal fold has a visible sliver to
              carry away. */}
          <FoldingAction frame={frame} fps={fps} direction="vertical" delay={20} foldConfig={{ damping: 6, stiffness: 9, to: 0.85 }}>
            {/* frame + 240: entrance springs settled, sway continues from Scene01 */}
            <ForestTableau frame={frame + SCENES.SCENE_02.from} fps={fps} />
          </FoldingAction>
        </FoldingAction>
      </AbsoluteFill>

      {/* Loose leaves shaken free by the fold */}
      {SCATTER.map((s, i) => {
        const fly = spring({
          frame: frame - 25 - i * 4,
          fps,
          config: { damping: 20, stiffness: 60 },
        });
        const fade = interpolate(frame, [70, 115], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <OrigamiLeaf
            key={i}
            x={540 + s.dx * fly}
            y={980 + s.dy * fly + fly * fly * 120}
            size={26 + (i % 3) * 6}
            rotation={s.rot * fly}
            opacity={fly > 0 ? fade : 0}
          />
        );
      })}
    </AbsoluteFill>
  );
};
