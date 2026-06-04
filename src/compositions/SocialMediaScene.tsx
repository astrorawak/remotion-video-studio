import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SocialMediaProps {
  headline: string;
  subtext?: string;
  stats?: { label: string; value: string; icon: string }[];
  style?: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  bgGradient?: [string, string];
  username?: string;
}

export const SocialMediaScene: React.FC<SocialMediaProps> = ({
  headline = 'Tips Sukses di 2024',
  subtext = '5 hal yang mengubah hidup saya',
  stats = [
    { label: 'Views', value: '1.2M', icon: '👁️' },
    { label: 'Likes', value: '98K', icon: '❤️' },
    { label: 'Shares', value: '12K', icon: '🔄' },
  ],
  style = 'instagram',
  bgGradient = ['#667EEA', '#764BA2'],
  username = '@creator',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background gradient animation
  const gradAngle = interpolate(frame, [0, 270], [135, 225]);

  // Hook text - dramatic entrance
  const hookScale = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const hookOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Attention-grabbing elements
  const arrowBounce = interpolate(
    Math.sin((frame / fps) * Math.PI * 3),
    [-1, 1],
    [-5, 5]
  );

  // Stats counter animation
  const statsOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' });
  const statsY = interpolate(frame, [60, 80], [30, 0], { extrapolateRight: 'clamp' });

  // Number counter for stats
  const statValues = stats.map(s => {
    const num = parseFloat(s.value.replace(/[KMB]/g, ''));
    const multiplier = s.value.includes('M') ? 1000000 : s.value.includes('K') ? 1000 : 1;
    const total = num * multiplier;
    const current = Math.round(interpolate(frame, [70, 130], [0, total], { extrapolateRight: 'clamp' }));
    const formatted = current >= 1000000 ? `${(current / 1000000).toFixed(1)}M` :
      current >= 1000 ? `${(current / 1000).toFixed(0)}K` : current.toString();
    return formatted;
  });

  // CTA pulse
  const ctaPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.97, 1.03]
  );
  const ctaOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' });

  // Floating emoji
  const emojis = ['🔥', '💯', '⚡', '✨', '🚀'];
  const floatingEmojis = emojis.map((emoji, i) => ({
    emoji,
    x: 5 + (i * 22),
    y: interpolate(frame, [0, 270], [110, 60 - i * 10]),
    opacity: interpolate(frame, [20 + i * 10, 40 + i * 10, 200, 230], [0, 0.8, 0.8, 0], { extrapolateRight: 'clamp' }),
    scale: spring({ frame: frame - (20 + i * 10), fps, config: { damping: 12 } }),
  }));

  // Subtext words
  const words = subtext.split(' ');
  const wordAnims = words.map((_, i) => ({
    opacity: interpolate(frame, [30 + i * 5, 45 + i * 5], [0, 1], { extrapolateRight: 'clamp' }),
    x: interpolate(frame, [30 + i * 5, 45 + i * 5], [-20, 0], { extrapolateRight: 'clamp' }),
  }));

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${gradAngle}deg, ${bgGradient[0]}, ${bgGradient[1]})`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
        opacity: 0.3,
      }} />

      {/* Floating emojis */}
      {floatingEmojis.map((e, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${e.x}%`,
          top: `${e.y}%`,
          fontSize: 32,
          opacity: e.opacity,
          transform: `scale(${Math.min(1, e.scale)})`,
        }}>
          {e.emoji}
        </div>
      ))}

      {/* Main content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 60px',
        gap: 0,
      }}>
        {/* Username */}
        <div style={{
          fontSize: 16, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '1px', marginBottom: 20,
          opacity: hookOpacity,
        }}>
          {username}
        </div>

        {/* Main headline - BIG */}
        <div style={{
          fontSize: 72, fontWeight: 900,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.05,
          letterSpacing: '-2px',
          transform: `scale(${Math.min(1, hookScale)})`,
          opacity: hookOpacity,
          marginBottom: 20,
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: 900,
        }}>
          {headline}
        </div>

        {/* Subtext */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 6, marginBottom: 40,
        }}>
          {words.map((word, i) => (
            <span key={i} style={{
              fontSize: 24, fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              opacity: wordAnims[i].opacity,
              transform: `translateX(${wordAnims[i].x}px)`,
              display: 'inline-block',
            }}>
              {word}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 32,
          opacity: statsOpacity,
          transform: `translateY(${statsY}px)`,
          marginBottom: 40,
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16, padding: '16px 24px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                {statValues[i]}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaPulse})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,0.7)',
            letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            Swipe Up
          </div>
          <div style={{
            fontSize: 24,
            transform: `translateY(${arrowBounce}px)`,
          }}>
            👆
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
