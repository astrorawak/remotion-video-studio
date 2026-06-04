import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface AlgorithmicSceneProps {
  title?: string;
  subtitle?: string;
  stats?: { label: string; value: string; icon?: string }[];
  username?: string;
  gradient?: [string, string, string];
  layout?: 'full' | 'split' | 'greenscreen';
}

export const AlgorithmicScene: React.FC<AlgorithmicSceneProps> = ({
  title = 'YOUR YEAR',
  subtitle = 'Wrapped 2024',
  stats = [],
  username = '@creator',
  gradient = ['#FF006E', '#8338EC', '#3A86FF'],
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : '#0D0D1A';
  const contentWidth = layout === 'split' ? width * 0.62 : width;

  const defaultStats = stats.length > 0 ? stats : [
    { label: 'Minutes Listened', value: '42,847', icon: '🎵' },
    { label: 'Top Genre', value: 'Hip-Hop', icon: '🔥' },
    { label: 'Streak Days', value: '365', icon: '⚡' },
    { label: 'New Artists', value: '127', icon: '🌟' },
  ];

  // Phone mockup animation
  const phoneScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, from: 0.7, to: 1 });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Cards stagger
  const cardY = (i: number) => interpolate(frame, [10 + i * 6, 25 + i * 6], [40, 0], { extrapolateRight: 'clamp' });
  const cardOpacity = (i: number) => interpolate(frame, [10 + i * 6, 25 + i * 6], [0, 1], { extrapolateRight: 'clamp' });

  // Floating particles
  const particles = Array.from({ length: 8 }).map((_, i) => ({
    x: (i * 137.5) % contentWidth,
    y: ((frame * (0.5 + i * 0.1)) % height),
    size: 3 + (i % 3) * 2,
    opacity: 0.3 + (Math.sin(frame * 0.05 + i) + 1) * 0.2,
  }));

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Gradient background */}
      {layout !== 'greenscreen' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 20% 20%, ${gradient[0]}30 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${gradient[2]}30 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 50%, ${gradient[1]}20 0%, transparent 70%)`,
        }} />
      )}

      {/* Floating particles */}
      {layout !== 'greenscreen' && (
        <svg style={{ position: 'absolute', inset: 0, width: contentWidth, height }}>
          {particles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.size}
              fill={gradient[i % 3]} opacity={p.opacity} />
          ))}
        </svg>
      )}

      {/* Content */}
      <div style={{ width: contentWidth, height, position: 'relative', padding: '40px 50px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{
          opacity: phoneOpacity,
          marginBottom: 24,
        }}>
          <div style={{
            display: 'inline-block',
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            borderRadius: 20, padding: '6px 16px',
            color: '#FFF', fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            {username}
          </div>
          <div style={{
            fontSize: 56, fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]}, ${gradient[2]})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 500, marginTop: 4 }}>
            {subtitle}
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {defaultStats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              padding: '16px 20px',
              border: '1px solid rgba(255,255,255,0.1)',
              transform: `translateY(${cardY(i)}px)`,
              opacity: cardOpacity(i),
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon || '✨'}</div>
              <div style={{
                fontSize: 28, fontWeight: 800, color: '#FFF',
                background: `linear-gradient(135deg, ${gradient[i % 3]}, #FFF)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom notification pop */}
        <div style={{
          position: 'absolute', bottom: 40, left: 50, right: layout === 'split' ? 20 : 50,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid rgba(255,255,255,0.15)',
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${interpolate(frame, [40, 55], [20, 0], { extrapolateRight: 'clamp' })}px)`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🎉</div>
          <div>
            <div style={{ color: '#FFF', fontSize: 13, fontWeight: 600 }}>Your stats are ready!</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Tap to see your highlights</div>
          </div>
        </div>
      </div>

      {/* Split layout: webcam area */}
      {layout === 'split' && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: width * 0.38, height,
          background: '#00FF00',
        }} />
      )}
    </div>
  );
};
