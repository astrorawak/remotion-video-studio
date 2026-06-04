import React from 'react';
import { Composition, Series } from 'remotion';
import { TitleScene } from './compositions/TitleScene';
import { TextScene } from './compositions/TextScene';
import { TipsScene } from './compositions/TipsScene';
import { GoogleSearchScene } from './compositions/GoogleSearchScene';
import { LyricScene } from './compositions/LyricScene';
import { OutroScene } from './compositions/OutroScene';

// ─────────────────────────────────────────────
// Multi-Scene Video Composition
// ─────────────────────────────────────────────
interface SceneData {
  type: string;
  text?: string;
  subtext?: string;
  tips?: string[];
  lyrics?: string[];
  cta?: string;
  searchQuery?: string;
  results?: string[];
  duration?: number;
  style?: string;
}

interface MultiSceneVideoProps {
  scenes: SceneData[];
  style?: string;
  fps?: number;
}

const SceneRenderer: React.FC<{ scene: SceneData; style: string }> = ({ scene, style }) => {
  const s = scene.style || style;
  switch (scene.type) {
    case 'title_scene':
      return <TitleScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
    case 'text_scene':
      return <TextScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
    case 'tips_scene':
      return <TipsScene title={scene.text} tips={scene.tips || []} style={s} />;
    case 'lyric_scene':
      return <LyricScene lyrics={scene.lyrics || [scene.text || '']} style={s} />;
    case 'outro_scene':
      return <OutroScene text={scene.text || ''} cta={scene.cta} style={s} />;
    case 'google_search':
      return <GoogleSearchScene searchQuery={scene.searchQuery || scene.text || ''} results={scene.results} style={s as 'light' | 'dark'} />;
    default:
      return <TextScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
  }
};

export const MultiSceneVideo: React.FC<MultiSceneVideoProps> = ({ scenes, style = 'cinematic' }) => {
  const fps = 30;
  return (
    <Series>
      {scenes.map((scene, i) => {
        const durationInFrames = Math.round((scene.duration || 3) * fps);
        return (
          <Series.Sequence key={i} durationInFrames={durationInFrames}>
            <SceneRenderer scene={scene} style={style} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};

// ─────────────────────────────────────────────
// Google Search Standalone
// ─────────────────────────────────────────────
interface GoogleSearchVideoProps {
  searchQuery: string;
  results?: string[];
  style?: 'light' | 'dark';
}

export const GoogleSearchVideo: React.FC<GoogleSearchVideoProps> = (props) => {
  return <GoogleSearchScene {...props} />;
};

// ─────────────────────────────────────────────
// Register Compositions
// ─────────────────────────────────────────────
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MultiSceneVideo"
        component={MultiSceneVideo}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          scenes: [
            { type: 'title_scene', text: 'Video Studio AI', subtext: 'Powered by Remotion', duration: 3 },
            { type: 'text_scene', text: 'Buat video profesional', subtext: 'Hanya dengan satu prompt', duration: 3 },
            { type: 'outro_scene', text: 'Mulai Sekarang!', cta: 'Follow & Like', duration: 3 },
          ],
          style: 'cinematic',
        }}
        calculateMetadata={({ props }) => {
          const fps = 30;
          const total = (props.scenes || []).reduce((sum: number, s: SceneData) => sum + Math.round((s.duration || 3) * fps), 0);
          return { durationInFrames: total || 90 };
        }}
      />
      <Composition
        id="GoogleSearchVideo"
        component={GoogleSearchVideo}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          searchQuery: 'Cara belajar coding',
          results: ['Tutorial Coding untuk Pemula', 'Belajar Python dalam 30 Hari'],
          style: 'light' as const,
        }}
        calculateMetadata={({ props }) => {
          const fps = 30;
          const baseTime = 2;
          const resultTime = (props.results?.length || 0) * 0.5;
          return { durationInFrames: Math.round((baseTime + resultTime + 2) * fps) };
        }}
      />
    </>
  );
};
