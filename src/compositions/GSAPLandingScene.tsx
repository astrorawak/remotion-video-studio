import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface GSAPLandingProps {
  productName: string;
  tagline: string;
  features: Feature[];
  primaryColor: string;
  accentColor: string;
  bgColor: string;
}

export const GSAPLandingScene: React.FC<GSAPLandingProps> = ({
  productName = 'Aria',
  tagline = 'The Future of Work, Simplified.',
  features = [
    { icon: '⚡', title: 'Lightning Fast', desc: 'Process tasks 10x faster than before' },
    { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security built in' },
    { icon: '🎯', title: 'Smart Targeting', desc: 'AI-powered precision for every action' },
    { icon: '📊', title: 'Real-time Analytics', desc: 'Live insights at your fingertips' },
  ],
  primaryColor = '#6C63FF',
  accentColor = '#FF6584',
  bgColor = '#0A0A0F',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo/brand entrance - spring bounce
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 }, delay: 0 });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Tagline word-by-word entrance
  const words = tagline.split(' ');
  const wordAnimations = words.map((_, i) => ({
    opacity: interpolate(frame, [20 + i * 6, 30 + i * 6], [0, 1], { extrapolateRight: 'clamp' }),
    y: interpolate(frame, [20 + i * 6, 35 + i * 6], [30, 0], { extrapolateRight: 'clamp' }),
  }));

  // Feature cards staggered entrance
  const cardAnimations = features.map((_, i) => ({
    opacity: interpolate(frame, [50 + i * 12, 70 + i * 12], [0, 1], { extrapolateRight: 'clamp' }),
    y: interpolate(frame, [50 + i * 12, 70 + i * 12], [60, 0], { extrapolateRight: 'clamp' }),
    scale: spring({ frame: frame - (50 + i * 12), fps, config: { damping: 15, stiffness: 80 } }),
  }));

  // CTA button pulse
  const ctaOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: frame - 100, fps, config: { damping: 10, stiffness: 120 } });
  const ctaPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.98, 1.02]
  );

  // Background gradient animation
  const gradientAngle = interpolate(frame, [0, 300], [135, 225]);

  // Floating particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: ((i * 97.3) % 100),
    size: 2 + (i % 3),
    opacity: interpolate(
      Math.sin((frame / fps) * 0.8 + i * 0.5),
      [-1, 1],
      [0.1, 0.4]
    ),
    animY: interpolate(frame, [0, 300], [0, -20 - i * 3]),
  }));

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${bgColor} 0%, #1a0a2e 50%, #0a1628 100%)`,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y + p.animY / 10}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: i % 2 === 0 ? primaryColor : accentColor,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(108,99,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Main content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: '60px',
        gap: 0,
      }}>
        {/* Logo */}
        <div style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 24,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, boxShadow: `0 0 40px ${primaryColor}60`,
          }}>
            ✦
          </div>
        </div>

        {/* Product name */}
        <div style={{
          fontSize: 72, fontWeight: 900, letterSpacing: '-2px',
          background: `linear-gradient(135deg, #fff 30%, ${primaryColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: logoOpacity, transform: `scale(${logoScale})`,
          marginBottom: 16,
        }}>
          {productName}
        </div>

        {/* Tagline word by word */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 8, marginBottom: 48, maxWidth: 700,
        }}>
          {words.map((word, i) => (
            <span key={i} style={{
              fontSize: 28, color: 'rgba(255,255,255,0.85)',
              fontWeight: 400, letterSpacing: '0.5px',
              opacity: wordAnimations[i].opacity,
              transform: `translateY(${wordAnimations[i].y}px)`,
              display: 'inline-block',
            }}>
              {word}
            </span>
          ))}
        </div>

        {/* Feature cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16, width: '100%', maxWidth: 960, marginBottom: 40,
        }}>
          {features.map((feature, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(108,99,255,0.3)`,
              borderRadius: 16, padding: '24px 20px',
              opacity: cardAnimations[i].opacity,
              transform: `translateY(${cardAnimations[i].y}px) scale(${Math.min(1, cardAnimations[i].scale)})`,
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{feature.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {feature.title}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                {feature.desc}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div style={{
          opacity: ctaOpacity,
          transform: `scale(${Math.min(1, ctaScale) * ctaPulse})`,
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            borderRadius: 50, padding: '16px 48px',
            fontSize: 20, fontWeight: 700, color: '#fff',
            boxShadow: `0 8px 32px ${primaryColor}60`,
            letterSpacing: '0.5px',
          }}>
            Get Started Free →
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
