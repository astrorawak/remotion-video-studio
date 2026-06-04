import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TipsSceneProps {
  title?: string;
  tips: string[];
  style?: string;
}

const STYLES: Record<string, { bg: string; color: string; accent: string; cardBg: string }> = {
  cinematic: { bg: '#0a0a0a', color: '#ffffff', accent: '#4a9eff', cardBg: 'rgba(255,255,255,0.05)' },
  vlog: { bg: '#f8f9ff', color: '#1a1a1a', accent: '#4a9eff', cardBg: 'rgba(74,158,255,0.08)' },
  business: { bg: '#0f2027', color: '#ffffff', accent: '#00d4ff', cardBg: 'rgba(0,212,255,0.08)' },
  music_video: { bg: '#000000', color: '#ffd700', accent: '#ff6b6b', cardBg: 'rgba(255,107,107,0.1)' },
  tutorial: { bg: '#f5f7fa', color: '#2d3748', accent: '#4299e1', cardBg: 'rgba(66,153,225,0.08)' },
  trader: { bg: '#0d0d0d', color: '#00ff41', accent: '#00ff41', cardBg: 'rgba(0,255,65,0.05)' },
};

export const TipsScene: React.FC<TipsSceneProps> = ({ title, tips, style = 'cinematic' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = STYLES[style] || STYLES.cinematic;

  const titleOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, fps * 0.4], [-30, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      background: s.bg, color: s.color,
      fontFamily: style === 'trader' ? "'Courier New', monospace" : "'Inter', 'Helvetica Neue', sans-serif",
      padding: '60px 100px', position: 'relative', overflow: 'hidden',
    }}>
      {title && (
        <h2 style={{
          fontSize: '56px', fontWeight: 800, marginBottom: '48px',
          opacity: titleOpacity, transform: `translateY(${titleY}px)`,
          color: s.accent, letterSpacing: '-1px',
        }}>
          {title}
        </h2>
      )}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {tips.map((tip, i) => {
          const delay = fps * (0.3 + i * 0.15);
          const tipOpacity = interpolate(frame, [delay, delay + fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
          const tipX = interpolate(frame, [delay, delay + fps * 0.4], [50, 0], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '24px',
              opacity: tipOpacity, transform: `translateX(${tipX}px)`,
              background: s.cardBg, borderRadius: '16px',
              padding: '24px 32px',
              border: `1px solid ${s.accent}22`,
            }}>
              <div style={{
                minWidth: '52px', height: '52px',
                borderRadius: '50%', background: s.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 900, color: s.bg,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '36px', fontWeight: 500, lineHeight: 1.3 }}>{tip}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
