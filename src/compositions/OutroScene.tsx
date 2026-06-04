import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface OutroSceneProps {
  text: string;
  cta?: string;
  style?: string;
}

const STYLES: Record<string, { bg: string; color: string; accent: string }> = {
  cinematic: { bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)', color: '#ffffff', accent: '#4a9eff' },
  vlog: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#ffffff', accent: '#ffd700' },
  business: { bg: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)', color: '#ffffff', accent: '#00d4ff' },
  music_video: { bg: 'linear-gradient(135deg, #000000 0%, #1a0030 100%)', color: '#ffd700', accent: '#ff6b6b' },
  tutorial: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#ffffff', accent: '#ffffff' },
  trader: { bg: 'linear-gradient(135deg, #0d0d0d 0%, #001a00 100%)', color: '#00ff41', accent: '#00ff41' },
};

export const OutroScene: React.FC<OutroSceneProps> = ({ text, cta, style = 'cinematic' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = STYLES[style] || STYLES.cinematic;

  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 80 }, from: 0.7, to: 1.0 });
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: Math.max(0, frame - fps * 0.6), fps, config: { damping: 8, stiffness: 100 }, from: 0.8, to: 1.0 });

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: s.bg, color: s.color,
      fontFamily: "'Inter', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: `${300 + i * 200}px`, height: `${300 + i * 200}px`,
          borderRadius: '50%',
          border: `1px solid ${s.accent}22`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }} />
      ))}

      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center', zIndex: 1, padding: '0 80px' }}>
        <h1 style={{ fontSize: '88px', fontWeight: 900, margin: 0, lineHeight: 1.1 }}>{text}</h1>
      </div>

      {cta && (
        <div style={{
          marginTop: '48px', zIndex: 1,
          opacity: ctaOpacity, transform: `scale(${ctaScale})`,
          background: s.accent, color: s.bg,
          padding: '20px 56px', borderRadius: '60px',
          fontSize: '36px', fontWeight: 700, letterSpacing: '1px',
        }}>
          {cta}
        </div>
      )}
    </div>
  );
};
