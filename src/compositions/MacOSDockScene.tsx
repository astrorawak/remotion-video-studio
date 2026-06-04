import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface DockApp {
  name: string;
  emoji: string;
  color: string;
  badge?: number;
}

interface MacOSDockProps {
  apps?: DockApp[];
  title?: string;
  subtitle?: string;
  bgStyle?: 'dark' | 'light' | 'gradient';
  accentColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

const DockIcon: React.FC<{
  app: DockApp;
  index: number;
  total: number;
  frame: number;
  fps: number;
  hoveredIndex: number;
}> = ({ app, index, total, frame, fps, hoveredIndex }) => {
  // Entrance animation
  const entranceDelay = index * 6;
  const entranceProgress = spring({
    frame: frame - entranceDelay,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });

  const baseY = interpolate(entranceProgress, [0, 1], [120, 0]);
  const baseOpacity = interpolate(entranceProgress, [0, 0.3, 1], [0, 1, 1]);

  // Hover effect - icons near hovered icon get magnified
  const distance = Math.abs(index - hoveredIndex);
  const magnifyScale = hoveredIndex >= 0
    ? interpolate(distance, [0, 1, 2, 3], [1.6, 1.3, 1.1, 1], { extrapolateRight: 'clamp' })
    : 1;

  const iconSize = 64;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        transform: `translateY(${baseY - (magnifyScale - 1) * 30}px) scale(${magnifyScale})`,
        opacity: baseOpacity,
        transition: 'transform 0.15s ease-out',
        transformOrigin: 'bottom center',
      }}
    >
      {/* App icon */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: '18px',
          background: `linear-gradient(145deg, ${app.color}ee, ${app.color}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: `0 8px 24px ${app.color}60, 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {app.emoji}
        {/* Badge */}
        {app.badge && app.badge > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#FF3B30',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(0,0,0,0.3)',
            }}
          >
            {app.badge > 9 ? '9+' : app.badge}
          </div>
        )}
      </div>
      {/* App name */}
      <span
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '11px',
          fontFamily: 'sans-serif',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '70px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {app.name}
      </span>
      {/* Active dot */}
      <div
        style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)',
          opacity: index % 3 === 0 ? 1 : 0,
        }}
      />
    </div>
  );
};

export const MacOSDockScene: React.FC<MacOSDockProps> = ({
  apps,
  title = 'Tools yang Saya Gunakan',
  subtitle = 'Stack lengkap untuk kreator modern',
  bgStyle = 'dark',
  accentColor = '#007AFF',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const defaultApps: DockApp[] = apps && apps.length > 0 ? apps : [
    { name: 'Figma', emoji: '🎨', color: '#F24E1E' },
    { name: 'VS Code', emoji: '💻', color: '#007ACC' },
    { name: 'Notion', emoji: '📝', color: '#FFFFFF' },
    { name: 'Slack', emoji: '💬', color: '#4A154B', badge: 3 },
    { name: 'Chrome', emoji: '🌐', color: '#4285F4' },
    { name: 'Spotify', emoji: '🎵', color: '#1DB954' },
    { name: 'Zoom', emoji: '📹', color: '#2D8CFF' },
    { name: 'Canva', emoji: '✏️', color: '#00C4CC' },
  ];

  // Simulate hover: cursor moves across icons
  const hoverCycle = Math.floor(frame / 20) % (defaultApps.length + 2);
  const hoveredIndex = hoverCycle < defaultApps.length ? hoverCycle : -1;

  // Title animation
  const titleProgress = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleY = interpolate(titleProgress, [0, 1], [-40, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.5, 1], [0, 1, 1]);

  const backgrounds: Record<string, string> = {
    dark: 'linear-gradient(135deg, #1C1C2E 0%, #16213E 50%, #0F3460 100%)',
    light: 'linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f64f59 100%)',
  };

  const bgStyleValue: React.CSSProperties =
    layout === 'greenscreen'
      ? { background: '#00FF00' }
      : { background: backgrounds[bgStyle] || backgrounds.dark };

  const contentWidth = layout === 'split' ? width * 0.62 : width;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', ...bgStyleValue }}>
      {/* Background blur circles */}
      {layout !== 'greenscreen' && (
        <>
          <div style={{
            position: 'absolute', top: '10%', left: '20%',
            width: '300px', height: '300px', borderRadius: '50%',
            background: `${accentColor}20`, filter: 'blur(80px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '20%', right: '15%',
            width: '250px', height: '250px', borderRadius: '50%',
            background: '#FF6B6B20', filter: 'blur(60px)',
          }} />
        </>
      )}

      <div style={{ position: 'absolute', inset: 0, width: contentWidth }}>
        {/* Title section */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: `translateX(-50%) translateY(${titleY}px)`,
            opacity: titleOpacity,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '38px',
            fontWeight: '800',
            fontFamily: 'sans-serif',
            margin: 0,
            letterSpacing: '-1px',
          }}>
            {title}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            margin: '8px 0 0',
          }}>
            {subtitle}
          </p>
        </div>

        {/* macOS Dock */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {defaultApps.map((app, i) => (
            <DockIcon
              key={i}
              app={app}
              index={i}
              total={defaultApps.length}
              frame={frame}
              fps={fps}
              hoveredIndex={hoveredIndex}
            />
          ))}
        </div>

        {/* Cursor */}
        {hoveredIndex >= 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '155px',
              left: `calc(50% - ${(defaultApps.length / 2 - hoveredIndex - 0.5) * 88}px)`,
              transform: 'translateX(-50%)',
              width: '12px',
              height: '18px',
              opacity: 0.8,
              fontSize: '18px',
            }}
          >
            🖱️
          </div>
        )}
      </div>

      {/* Split webcam */}
      {layout === 'split' && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: width * 0.38, height,
          background: '#00FF00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color: '#006600', fontSize: '14px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            📷 WEBCAM
          </div>
        </div>
      )}
    </div>
  );
};
