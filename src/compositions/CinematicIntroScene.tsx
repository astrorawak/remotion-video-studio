import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface CinematicIntroProps {
  title: string;
  subtitle?: string;
  category?: string;
  style?: 'dark' | 'light' | 'neon' | 'gradient';
  accentColor?: string;
}

export const CinematicIntroScene: React.FC<CinematicIntroProps> = ({
  title = 'The Future is Now',
  subtitle = 'A story about innovation and possibility',
  category = 'DOCUMENTARY',
  style = 'dark',
  accentColor = '#6C63FF',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgColors = {
    dark: '#050508',
    light: '#F8F9FA',
    neon: '#000814',
    gradient: '#0D0221',
  };
  const textColors = {
    dark: '#FFFFFF',
    light: '#1A1A2E',
    neon: '#FFFFFF',
    gradient: '#FFFFFF',
  };

  const bgColor = bgColors[style];
  const textColor = textColors[style];

  // Cinematic bars (letterbox)
  const barHeight = interpolate(frame, [0, 20], [100, 60], { extrapolateRight: 'clamp' });

  // Category label
  const catOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const catLetterSpacing = interpolate(frame, [15, 35], [20, 8], { extrapolateRight: 'clamp' });

  // Line separator
  const lineWidth = interpolate(frame, [25, 50], [0, 100], { extrapolateRight: 'clamp' });

  // Title - character by character
  const titleChars = title.split('');
  const charAnimations = titleChars.map((_, i) => ({
    opacity: interpolate(frame, [35 + i * 3, 50 + i * 3], [0, 1], { extrapolateRight: 'clamp' }),
    y: interpolate(frame, [35 + i * 3, 55 + i * 3], [40, 0], { extrapolateRight: 'clamp' }),
    blur: interpolate(frame, [35 + i * 3, 55 + i * 3], [10, 0], { extrapolateRight: 'clamp' }),
  }));

  // Subtitle
  const subOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [80, 100], [20, 0], { extrapolateRight: 'clamp' });

  // Vignette
  const vigOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' });

  // Neon glow for neon style
  const glowIntensity = style === 'neon'
    ? interpolate(Math.sin((frame / fps) * Math.PI), [-1, 1], [0.5, 1])
    : 1;

  // Gradient background animation
  const gradientPos = interpolate(frame, [0, 270], [0, 100]);

  return (
    <AbsoluteFill style={{
      background: style === 'gradient'
        ? `linear-gradient(${135 + gradientPos * 0.5}deg, #0D0221, #1a0a2e, #0a1628)`
        : bgColor,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Neon grid for neon style */}
      {style === 'neon' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${accentColor}15 1px, transparent 1px), linear-gradient(90deg, ${accentColor}15 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          transform: `perspective(500px) rotateX(60deg) translateY(${frame * 0.5}px)`,
          transformOrigin: 'bottom center',
          opacity: 0.5,
        }} />
      )}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        opacity: vigOpacity,
      }} />

      {/* Cinematic bars */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: barHeight, background: '#000',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: barHeight, background: '#000',
      }} />

      {/* Main content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        {/* Category label */}
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: accentColor,
          letterSpacing: `${catLetterSpacing}px`,
          opacity: catOpacity,
          marginBottom: 20,
          textTransform: 'uppercase',
        }}>
          {category}
        </div>

        {/* Separator line */}
        <div style={{
          width: `${lineWidth}%`, maxWidth: 300,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          marginBottom: 24,
        }} />

        {/* Title - character by character */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          maxWidth: 900, gap: 0,
        }}>
          {titleChars.map((char, i) => (
            <span key={i} style={{
              fontSize: 80, fontWeight: 900,
              color: char === ' ' ? 'transparent' : textColor,
              letterSpacing: char === ' ' ? '20px' : '-2px',
              opacity: charAnimations[i].opacity,
              transform: `translateY(${charAnimations[i].y}px)`,
              filter: `blur(${charAnimations[i].blur}px)`,
              display: 'inline-block',
              textShadow: style === 'neon'
                ? `0 0 ${20 * glowIntensity}px ${accentColor}, 0 0 ${40 * glowIntensity}px ${accentColor}40`
                : 'none',
              lineHeight: 1.1,
            }}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>

        {/* Subtitle */}
        <div style={{
          marginTop: 24,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 20, fontWeight: 300,
            color: style === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
            letterSpacing: '2px',
            maxWidth: 600,
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      {[
        { top: barHeight + 20, left: 40 },
        { top: barHeight + 20, right: 40 },
        { bottom: barHeight + 20, left: 40 },
        { bottom: barHeight + 20, right: 40 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 30, height: 30,
          borderTop: i < 2 ? `1px solid ${accentColor}60` : 'none',
          borderBottom: i >= 2 ? `1px solid ${accentColor}60` : 'none',
          borderLeft: i % 2 === 0 ? `1px solid ${accentColor}60` : 'none',
          borderRight: i % 2 === 1 ? `1px solid ${accentColor}60` : 'none',
          opacity: catOpacity,
        }} />
      ))}
    </AbsoluteFill>
  );
};
