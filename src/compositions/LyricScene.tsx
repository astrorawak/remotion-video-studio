import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface LyricSceneProps {
  lyrics: string[];
  style?: string;
}

const STYLES: Record<string, { bg: string; color: string; highlight: string }> = {
  cinematic: { bg: '#0a0a0a', color: 'rgba(255,255,255,0.4)', highlight: '#ffffff' },
  vlog: { bg: '#1a1a2e', color: 'rgba(255,255,255,0.4)', highlight: '#ffffff' },
  music_video: { bg: '#000000', color: 'rgba(255,215,0,0.3)', highlight: '#ffd700' },
  trader: { bg: '#0d0d0d', color: 'rgba(0,255,65,0.3)', highlight: '#00ff41' },
  business: { bg: '#0f2027', color: 'rgba(255,255,255,0.4)', highlight: '#00d4ff' },
  tutorial: { bg: '#1a1a2e', color: 'rgba(255,255,255,0.4)', highlight: '#ffffff' },
};

export const LyricScene: React.FC<LyricSceneProps> = ({ lyrics, style = 'music_video' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = STYLES[style] || STYLES.music_video;

  const perLyric = durationInFrames / lyrics.length;
  const currentIndex = Math.floor(frame / perLyric);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: s.bg,
      fontFamily: "'Inter', sans-serif",
      padding: '60px 80px', gap: '24px',
    }}>
      {lyrics.map((lyric, i) => {
        const isActive = i === currentIndex;
        const isPast = i < currentIndex;
        const scale = isActive ? spring({ frame: frame - i * perLyric, fps, config: { damping: 12, stiffness: 120 }, from: 0.9, to: 1.05 }) : 1;

        return (
          <div key={i} style={{
            fontSize: isActive ? '64px' : '48px',
            fontWeight: isActive ? 800 : 400,
            color: isActive ? s.highlight : isPast ? 'rgba(255,255,255,0.2)' : s.color,
            textAlign: 'center',
            transform: `scale(${isActive ? scale : 1})`,
            transition: 'all 0.3s ease',
            lineHeight: 1.3,
            textShadow: isActive ? `0 0 40px ${s.highlight}66` : 'none',
          }}>
            {lyric}
          </div>
        );
      })}
    </div>
  );
};
