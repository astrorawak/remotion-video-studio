import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface HUDSceneProps {
  title?: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  countdown?: number;
  accentColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

export const HUDScene: React.FC<HUDSceneProps> = ({
  title = 'MISSION CONTROL',
  subtitle = 'SYSTEM ONLINE',
  stats = [],
  countdown = 10,
  accentColor = '#FF3B30',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : '#0A0A0F';
  const contentWidth = layout === 'split' ? width * 0.62 : width;
  const neonBlue = '#00D4FF';
  const neonRed = accentColor;

  const scanlineOpacity = 0.04;
  const glitchOffset = Math.sin(frame * 0.3) * 0.5;

  // Countdown timer
  const totalFrames = countdown * fps;
  const remaining = Math.max(0, Math.ceil((totalFrames - frame) / fps));
  const timerProgress = Math.min(1, frame / totalFrames);

  // Title animation
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });

  // Stats stagger
  const statEntries = stats.length > 0 ? stats : [
    { label: 'SIGNAL', value: '99.7%' },
    { label: 'ALTITUDE', value: '42,000 ft' },
    { label: 'VELOCITY', value: '847 km/h' },
    { label: 'STATUS', value: 'NOMINAL' },
  ];

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      fontFamily: '"Courier New", Courier, monospace',
      position: 'relative',
    }}>
      {/* Scanlines overlay */}
      {layout !== 'greenscreen' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${scanlineOpacity}) 2px, rgba(0,0,0,${scanlineOpacity}) 4px)`,
        }} />
      )}

      {/* Grid lines */}
      {layout !== 'greenscreen' && (
        <svg style={{ position: 'absolute', inset: 0, width: contentWidth, height }} viewBox={`0 0 ${contentWidth} ${height}`}>
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i * (contentWidth / 20)} y1={0} x2={i * (contentWidth / 20)} y2={height}
              stroke={neonBlue} strokeWidth={0.3} strokeOpacity={0.15} />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * (height / 12)} x2={contentWidth} y2={i * (height / 12)}
              stroke={neonBlue} strokeWidth={0.3} strokeOpacity={0.15} />
          ))}
        </svg>
      )}

      {/* Main content area */}
      <div style={{ width: contentWidth, height, position: 'relative', padding: '40px 50px', boxSizing: 'border-box' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `1px solid ${neonRed}`, paddingBottom: 12, marginBottom: 30,
          opacity: titleOpacity,
        }}>
          <div style={{ color: neonRed, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' }}>
            ◉ LIVE FEED
          </div>
          <div style={{ color: neonBlue, fontSize: 11, letterSpacing: 3 }}>
            SYS.{String(frame).padStart(6, '0')}
          </div>
          <div style={{ color: neonRed, fontSize: 11, letterSpacing: 4 }}>
            T-{String(remaining).padStart(2, '0')}:00 ◉
          </div>
        </div>

        {/* Title */}
        <div style={{
          transform: `translateY(${titleY}px) translateX(${glitchOffset}px)`,
          opacity: titleOpacity, marginBottom: 8,
        }}>
          <div style={{
            color: '#FFFFFF', fontSize: 52, fontWeight: 900, letterSpacing: 8,
            textTransform: 'uppercase', lineHeight: 1,
            textShadow: `0 0 20px ${neonRed}, 0 0 40px ${neonRed}50`,
          }}>
            {title}
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          color: neonBlue, fontSize: 14, letterSpacing: 6, textTransform: 'uppercase',
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
          marginBottom: 40,
          textShadow: `0 0 10px ${neonBlue}`,
        }}>
          ▶ {subtitle}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 30 }}>
          {statEntries.map((stat, i) => {
            const statOpacity = interpolate(frame, [20 + i * 8, 35 + i * 8], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                border: `1px solid ${neonBlue}30`,
                padding: '12px 16px',
                background: `${neonBlue}08`,
                opacity: statOpacity,
              }}>
                <div style={{ color: neonBlue, fontSize: 10, letterSpacing: 3, marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{
                  color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: 2,
                  textShadow: `0 0 10px ${neonRed}`,
                }}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar / heartbeat */}
        <div style={{
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{ color: neonBlue, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
            MISSION PROGRESS
          </div>
          <div style={{ height: 4, background: `${neonBlue}20`, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${timerProgress * 100}%`,
              background: `linear-gradient(90deg, ${neonRed}, ${neonBlue})`,
              boxShadow: `0 0 10px ${neonRed}`,
              transition: 'width 0.1s',
            }} />
          </div>
        </div>

        {/* Corner decorations */}
        <svg style={{ position: 'absolute', top: 30, left: 40, width: 30, height: 30 }} viewBox="0 0 30 30">
          <path d="M0,15 L0,0 L15,0" fill="none" stroke={neonRed} strokeWidth={2} />
        </svg>
        <svg style={{ position: 'absolute', top: 30, right: layout === 'split' ? 20 : 40, width: 30, height: 30 }} viewBox="0 0 30 30">
          <path d="M30,15 L30,0 L15,0" fill="none" stroke={neonRed} strokeWidth={2} />
        </svg>
        <svg style={{ position: 'absolute', bottom: 30, left: 40, width: 30, height: 30 }} viewBox="0 0 30 30">
          <path d="M0,15 L0,30 L15,30" fill="none" stroke={neonRed} strokeWidth={2} />
        </svg>
        <svg style={{ position: 'absolute', bottom: 30, right: layout === 'split' ? 20 : 40, width: 30, height: 30 }} viewBox="0 0 30 30">
          <path d="M30,15 L30,30 L15,30" fill="none" stroke={neonRed} strokeWidth={2} />
        </svg>
      </div>

      {/* Split layout: webcam placeholder */}
      {layout === 'split' && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: width * 0.38, height,
          background: '#00FF00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color: '#006600', fontSize: 14, fontFamily: 'monospace', textAlign: 'center' }}>
            WEBCAM<br />AREA
          </div>
        </div>
      )}
    </div>
  );
};
