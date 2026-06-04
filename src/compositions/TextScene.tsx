import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TextSceneProps {
  text: string;
  subtext?: string;
  style?: string;
}

const STYLES: Record<string, { bg: string; color: string; accent: string }> = {
  cinematic: { bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)', color: '#ffffff', accent: '#4a9eff' },
  vlog: { bg: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)', color: '#1a1a1a', accent: '#4a9eff' },
  business: { bg: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)', color: '#ffffff', accent: '#00d4ff' },
  music_video: { bg: 'linear-gradient(135deg, #000000 0%, #1a0030 100%)', color: '#ffd700', accent: '#ff6b6b' },
  tutorial: { bg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', color: '#2d3748', accent: '#4299e1' },
  trader: { bg: 'linear-gradient(135deg, #0d0d0d 0%, #001a00 100%)', color: '#00ff41', accent: '#00ff41' },
};

export const TextScene: React.FC<TextSceneProps> = ({ text, subtext, style = 'cinematic' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = STYLES[style] || STYLES.cinematic;

  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const translateX = interpolate(frame, [0, fps * 0.5], [-60, 0], { extrapolateRight: 'clamp' });
  const accentWidth = interpolate(frame, [fps * 0.3, fps * 0.9], [0, 80], { extrapolateRight: 'clamp' });
  const subtextOpacity = interpolate(frame, [fps * 0.4, fps * 0.9], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      background: s.bg, color: s.color,
      fontFamily: style === 'trader' ? "'Courier New', monospace" : "'Inter', 'Helvetica Neue', sans-serif",
      padding: '0 100px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{
        width: `${accentWidth}px`, height: '6px',
        background: s.accent, marginBottom: '32px',
        borderRadius: '3px',
      }} />

      {/* Main text */}
      <h2 style={{
        fontSize: '72px', fontWeight: 800, margin: 0,
        lineHeight: 1.2, letterSpacing: '-1px',
        opacity, transform: `translateX(${translateX}px)`,
        maxWidth: '900px',
        textShadow: style === 'trader' ? `0 0 15px ${s.accent}` : 'none',
      }}>
        {text}
      </h2>

      {subtext && (
        <p style={{
          fontSize: '38px', fontWeight: 300, marginTop: '28px',
          opacity: subtextOpacity * 0.8, maxWidth: '800px', lineHeight: 1.5,
        }}>
          {subtext}
        </p>
      )}
    </div>
  );
};
