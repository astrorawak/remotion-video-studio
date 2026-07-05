import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate } from 'remotion';
import { Scene01Forest } from './scenes/Scene01Forest';
import { Scene02FirstFold } from './scenes/Scene02FirstFold';
import { Scene03PalmInvasion } from './scenes/Scene03PalmInvasion';
import { Scene04Lament } from './scenes/Scene04Lament';
import { PaperTexture } from '../components/PaperTexture';
import { COLORS, FONTS, SCENES, VIDEO } from '../config/lastFold';

export interface TheLastFoldProps {
  // Audio placeholders: no files ship with the repo, so both default to
  // undefined and the piece renders silent. To wire real audio, drop
  // files into public/ and pass e.g.
  //   --props='{"audioSrc":"music.mp3","sfxFoldSrc":"fold.mp3"}'
  // (or staticFile() paths when driving programmatically).
  audioSrc?: string;
  sfxFoldSrc?: string;
}

// The Last Fold: Kalimantan's Lament — 30s vertical origami short.
// 1080x1920 @ 30fps, 900 frames, four fixed scenes.
export const TheLastFold: React.FC<TheLastFoldProps> = ({ audioSrc, sfxFoldSrc }) => {
  return (
    <AbsoluteFill style={{ background: COLORS.paperCream, fontFamily: FONTS.sans }}>
      <Sequence from={SCENES.SCENE_01.from} durationInFrames={SCENES.SCENE_01.duration}>
        <Scene01Forest />
      </Sequence>
      <Sequence from={SCENES.SCENE_02.from} durationInFrames={SCENES.SCENE_02.duration}>
        <Scene02FirstFold />
      </Sequence>
      <Sequence from={SCENES.SCENE_03.from} durationInFrames={SCENES.SCENE_03.duration}>
        <Scene03PalmInvasion />
      </Sequence>
      <Sequence from={SCENES.SCENE_04.from} durationInFrames={SCENES.SCENE_04.duration}>
        <Scene04Lament />
      </Sequence>

      {/* Persistent paper fiber across every scene */}
      <PaperTexture tone="warm" />

      {audioSrc && (
        <Audio
          src={audioSrc}
          volume={(f) =>
            interpolate(f, [0, 60, VIDEO.durationInFrames - 60, VIDEO.durationInFrames], [0, 0.8, 0.8, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
      {sfxFoldSrc && (
        <Sequence from={SCENES.SCENE_02.from + 15}>
          <Audio src={sfxFoldSrc} volume={0.9} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
