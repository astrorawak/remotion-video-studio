import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface YouTubeSubscribeProps {
  channelName?: string;
  targetSubscribers?: number;
  startSubscribers?: number;
  milestone?: string;
  accentColor?: string;
  bgColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

const ConfettiPiece: React.FC<{
  index: number;
  frame: number;
  startFrame: number;
  width: number;
  height: number;
}> = ({ index, frame, startFrame, width, height }) => {
  const colors = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FF6B6B', '#4ECDC4', '#FFE66D'];
  const color = colors[index % colors.length];

  const seed = index * 137.508;
  const startX = (seed % 1) * width;
  const velocityX = ((seed * 7) % 1 - 0.5) * 400;
  const velocityY = -((seed * 3) % 1) * 600 - 200;
  const rotation = (seed * 11) % 360;
  const rotationSpeed = ((seed * 5) % 1 - 0.5) * 720;
  const size = 8 + (seed % 1) * 10;

  const elapsed = Math.max(0, frame - startFrame);
  const gravity = 800;
  const x = startX + velocityX * (elapsed / 30);
  const y = height * 0.6 + velocityY * (elapsed / 30) + 0.5 * gravity * Math.pow(elapsed / 30, 2);
  const rot = rotation + rotationSpeed * (elapsed / 30);
  const opacity = interpolate(elapsed, [0, 5, 60, 90], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  if (y > height + 20 || opacity <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size * 0.6,
        background: color,
        borderRadius: '2px',
        transform: `rotate(${rot}deg)`,
        opacity,
      }}
    />
  );
};

export const YouTubeSubscribeScene: React.FC<YouTubeSubscribeProps> = ({
  channelName = 'Channel Kamu',
  targetSubscribers = 100000,
  startSubscribers = 0,
  milestone = '100K SUBSCRIBERS!',
  accentColor = '#FF0000',
  bgColor = '#0F0F0F',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const totalFrames = fps * 8; // 8 second video

  // Phase 1: Channel card appears (0-30 frames)
  const cardProgress = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const cardScale = interpolate(cardProgress, [0, 1], [0.5, 1]);
  const cardOpacity = interpolate(cardProgress, [0, 0.5, 1], [0, 1, 1]);

  // Phase 2: Counter counting up (30-150 frames)
  const counterStart = 30;
  const counterEnd = 150;
  const counterProgress = interpolate(frame, [counterStart, counterEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Ease-in-out for counter
  const easedCounter = counterProgress < 0.5
    ? 2 * counterProgress * counterProgress
    : 1 - Math.pow(-2 * counterProgress + 2, 2) / 2;
  const currentCount = Math.floor(startSubscribers + (targetSubscribers - startSubscribers) * easedCounter);

  // Phase 3: Subscribe button pulse (60-90 frames)
  const buttonPulse = spring({
    frame: frame - 60,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.5 },
  });
  const buttonScale = interpolate(buttonPulse, [0, 1], [0.8, 1]);

  // Phase 4: Milestone text (120+ frames)
  const milestoneProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 12, stiffness: 200 },
  });
  const milestoneScale = interpolate(milestoneProgress, [0, 1], [0.3, 1]);
  const milestoneOpacity = interpolate(milestoneProgress, [0, 0.4, 1], [0, 1, 1]);

  // Confetti starts at frame 120
  const confettiCount = 40;
  const showConfetti = frame >= 120;

  // Bell shake
  const bellShake = frame >= 90 && frame <= 120
    ? Math.sin((frame - 90) * 0.8) * 15
    : 0;

  // Format number
  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const bgStyleValue: React.CSSProperties =
    layout === 'greenscreen'
      ? { background: '#00FF00' }
      : { background: bgColor };

  const contentWidth = layout === 'split' ? width * 0.62 : width;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', ...bgStyleValue }}>
      {/* Background glow */}
      {layout !== 'greenscreen' && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: `${accentColor}15`,
          filter: 'blur(100px)',
        }} />
      )}

      <div style={{ position: 'absolute', inset: 0, width: contentWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>

        {/* Channel card */}
        <div
          style={{
            transform: `scale(${cardScale})`,
            opacity: cardOpacity,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            minWidth: '360px',
          }}
        >
          {/* YouTube logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: accentColor,
              borderRadius: '8px',
              width: '44px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 0, height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '14px solid white',
                marginLeft: '3px',
              }} />
            </div>
            <span style={{
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: '800',
              fontFamily: 'sans-serif',
            }}>
              {channelName}
            </span>
          </div>

          {/* Subscriber counter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: '#FFFFFF',
              fontSize: '64px',
              fontWeight: '900',
              fontFamily: 'sans-serif',
              letterSpacing: '-2px',
              lineHeight: 1,
              textShadow: `0 0 40px ${accentColor}80`,
            }}>
              {formatNumber(currentCount)}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              fontFamily: 'sans-serif',
              marginTop: '4px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              Subscribers
            </div>
          </div>

          {/* Subscribe button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              background: accentColor,
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '700',
              fontFamily: 'sans-serif',
              transform: `scale(${buttonScale})`,
              boxShadow: `0 4px 20px ${accentColor}60`,
              cursor: 'pointer',
            }}>
              SUBSCRIBE
            </div>
            {/* Bell icon */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transform: `rotate(${bellShake}deg)`,
            }}>
              🔔
            </div>
          </div>
        </div>

        {/* Milestone text */}
        {frame >= 120 && (
          <div style={{
            transform: `scale(${milestoneScale})`,
            opacity: milestoneOpacity,
            textAlign: 'center',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${accentColor}, #FFD700)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '40px',
              fontWeight: '900',
              fontFamily: 'sans-serif',
              letterSpacing: '-1px',
            }}>
              🎉 {milestone}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px',
              fontFamily: 'sans-serif',
              marginTop: '8px',
            }}>
              Terima kasih atas dukungan kalian semua!
            </div>
          </div>
        )}
      </div>

      {/* Confetti */}
      {showConfetti && Array.from({ length: confettiCount }, (_, i) => (
        <ConfettiPiece
          key={i}
          index={i}
          frame={frame}
          startFrame={120}
          width={contentWidth}
          height={height}
        />
      ))}

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
