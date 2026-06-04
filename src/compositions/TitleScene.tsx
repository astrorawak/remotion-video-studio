import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TitleSceneProps {
  text: string;
  subtext?: string;
  style?: string;
  animation?: string;
}

const STYLES: Record<string, React.CSSProperties> = {
  cinematic: { background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)', color: '#ffffff' },
  vlog: { background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)', color: '#1a1a1a' },
  business: { background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', color: '#ffffff' },
  music_video: { background: 'linear-gradient(135deg, #000000 0%, #1a0030 100%)', color: '#ffd700' },
  tutorial: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', color: '#2d3748' },
  trader: { background: 'linear-gradient(135deg, #0d0d0d 0%, #001a00 100%)', color: '#00ff41' },
};

export const TitleScene: React.FC<TitleSceneProps> = ({ text, subtext, style = 'cinematic', animation = 'fadeIn' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const styleObj = STYLES[style] || STYLES.cinematic;

  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 }, from: 0.8, to: 1.0 });
  const translateY = interpolate(frame, [0, fps * 0.5], [40, 0], { extrapolateRight: 'clamp' });

  const isTrader = style === 'trader';
  const isMusic = style === 'music_video';

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      ...styleObj,
      fontFamily: isTrader ? "'Courier New', monospace" : "'Inter', 'Helvetica Neue', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', width: '600px', height: '600px',
        borderRadius: '50%', opacity: 0.05,
        background: isTrader ? '#00ff41' : isMusic ? '#ffd700' : '#ffffff',
        top: '-200px', right: '-200px',
      }} />

      {/* Main text */}
      <div style={{
        opacity, transform: `scale(${scale}) translateY(${translateY}px)`,
        textAlign: 'center', padding: '0 80px', zIndex: 1,
      }}>
        <h1 style={{
          fontSize: '96px', fontWeight: 900, margin: 0, lineHeight: 1.1,
          letterSpacing: isTrader ? '4px' : '-2px',
          textShadow: isTrader ? '0 0 20px #00ff41' : isMusic ? '0 0 30px #ffd700' : 'none',
          textTransform: isTrader ? 'uppercase' : 'none',
        }}>
          {text}
        </h1>
        {subtext && (
          <p style={{
            fontSize: '42px', fontWeight: 300, marginTop: '24px',
            opacity: 0.75, letterSpacing: '1px',
          }}>
            {subtext}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: '60px',
        width: interpolate(frame, [fps * 0.3, fps * 0.8], [0, 200], { extrapolateRight: 'clamp' }),
        height: '3px',
        background: isTrader ? '#00ff41' : isMusic ? '#ffd700' : 'rgba(255,255,255,0.5)',
      }} />
    </div>
  );
};
