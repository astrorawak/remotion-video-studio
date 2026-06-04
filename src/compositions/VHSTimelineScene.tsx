import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface TimelineEvent {
  year: string;
  title: string;
  description?: string;
}

interface VHSTimelineProps {
  events: TimelineEvent[];
  title?: string;
  accentColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

const GlitchText: React.FC<{ text: string; frame: number; fontSize?: number; color?: string }> = ({
  text, frame, fontSize = 48, color = '#00FF41',
}) => {
  const glitchIntensity = Math.sin(frame * 0.3) * 0.5 + 0.5;
  const shouldGlitch = frame % 30 < 3;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {shouldGlitch && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: `${glitchIntensity * 4}px`,
            color: '#FF0040', fontSize, fontFamily: 'monospace', fontWeight: '900',
            opacity: 0.7, clipPath: 'inset(30% 0 40% 0)',
          }}>{text}</div>
          <div style={{
            position: 'absolute', top: 0, left: `-${glitchIntensity * 3}px`,
            color: '#00FFFF', fontSize, fontFamily: 'monospace', fontWeight: '900',
            opacity: 0.7, clipPath: 'inset(60% 0 10% 0)',
          }}>{text}</div>
        </>
      )}
      <div style={{ color, fontSize, fontFamily: 'monospace', fontWeight: '900' }}>{text}</div>
    </div>
  );
};

const VHSOverlay: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  const scanlineY = (frame * 3) % height;
  return (
    <>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      }} />
      {/* Moving scan line */}
      <div style={{
        position: 'absolute', left: 0, top: scanlineY, width, height: '3px',
        background: 'rgba(255,255,255,0.08)', pointerEvents: 'none', zIndex: 51,
      }} />
      {/* VHS corner noise */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
        pointerEvents: 'none', zIndex: 52,
      }} />
      {/* REC indicator */}
      <div style={{
        position: 'absolute', top: '16px', right: '20px', zIndex: 53,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#FF0000',
          opacity: Math.sin(frame * 0.15) > 0 ? 1 : 0.2,
        }} />
        <span style={{ color: '#FF0000', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold' }}>REC</span>
      </div>
      {/* Timecode */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '20px', zIndex: 53,
        color: '#FFFFFF', fontSize: '13px', fontFamily: 'monospace', opacity: 0.8,
      }}>
        {String(Math.floor(frame / 1800)).padStart(2, '0')}:
        {String(Math.floor((frame % 1800) / 30)).padStart(2, '0')}:
        {String(frame % 30).padStart(2, '0')}
      </div>
    </>
  );
};

export const VHSTimelineScene: React.FC<VHSTimelineProps> = ({
  events = [],
  title = 'PERJALANAN KAMI',
  accentColor = '#00FF41',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const defaultEvents: TimelineEvent[] = events.length > 0 ? events : [
    { year: '2020', title: 'Awal Mula', description: 'Ide pertama lahir dari garasi kecil' },
    { year: '2021', title: 'Pertumbuhan', description: 'Tim berkembang menjadi 10 orang' },
    { year: '2022', title: 'Peluncuran', description: 'Produk resmi diluncurkan ke pasar' },
    { year: '2023', title: 'Ekspansi', description: 'Masuk ke 5 kota besar Indonesia' },
    { year: '2024', title: 'Puncak', description: '1 juta pengguna aktif tercapai' },
  ];

  const titleProgress = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  const contentWidth = layout === 'split' ? width * 0.62 : width;
  const bgStyle: React.CSSProperties =
    layout === 'greenscreen'
      ? { background: '#00FF00' }
      : { background: '#0D0D0D' };

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', ...bgStyle }}>
      {/* Noise texture */}
      {layout !== 'greenscreen' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
          opacity: 0.3,
        }} />
      )}

      <div style={{ position: 'absolute', inset: 0, width: contentWidth, padding: '60px 50px 80px' }}>
        {/* Title */}
        <div style={{ opacity: titleOpacity, marginBottom: '40px' }}>
          <GlitchText text={title} frame={frame} fontSize={42} color={accentColor} />
          <div style={{ color: '#666', fontSize: '14px', fontFamily: 'monospace', marginTop: '4px' }}>
            ▶ PLAY &nbsp;&nbsp; ◀◀ REW &nbsp;&nbsp; ▶▶ FF
          </div>
        </div>

        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: '90px',
          top: '140px',
          bottom: '80px',
          width: '2px',
          background: `linear-gradient(to bottom, ${accentColor}00, ${accentColor}, ${accentColor}00)`,
        }} />

        {/* Events */}
        {defaultEvents.map((event, i) => {
          const eventDelay = i * 12;
          const eventProgress = spring({
            frame: frame - eventDelay,
            fps,
            config: { damping: 14, stiffness: 160 },
          });
          const eventX = interpolate(eventProgress, [0, 1], [-200, 0]);
          const eventOpacity = interpolate(eventProgress, [0, 0.4, 1], [0, 1, 1]);

          const eventsPerScreen = Math.min(defaultEvents.length, 5);
          const spacing = (height - 220) / eventsPerScreen;
          const topPos = 140 + i * spacing;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50px',
                top: `${topPos}px`,
                transform: `translateX(${eventX}px)`,
                opacity: eventOpacity,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
              }}
            >
              {/* Dot on timeline */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: accentColor,
                border: `3px solid #0D0D0D`,
                boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}60`,
                flexShrink: 0,
                marginTop: '4px',
              }} />

              {/* Content */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    color: accentColor,
                    fontSize: '28px',
                    fontFamily: 'monospace',
                    fontWeight: '900',
                    letterSpacing: '-1px',
                    textShadow: `0 0 20px ${accentColor}`,
                  }}>
                    {event.year}
                  </span>
                  <span style={{
                    color: '#FFFFFF',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                  }}>
                    {event.title}
                  </span>
                </div>
                {event.description && (
                  <p style={{
                    color: '#888',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    margin: 0,
                    lineHeight: '1.5',
                  }}>
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VHS Overlay */}
      {layout !== 'greenscreen' && (
        <VHSOverlay frame={frame} width={contentWidth} height={height} />
      )}

      {/* Split webcam area */}
      {layout === 'split' && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: width * 0.38, height,
          background: '#00FF00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color: '#006600', fontSize: '14px', fontFamily: 'monospace', textAlign: 'center' }}>
            📷 WEBCAM
          </div>
        </div>
      )}
    </div>
  );
};
