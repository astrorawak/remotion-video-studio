import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface BrutalistSceneProps {
  title?: string;
  subtitle?: string;
  body?: string;
  number?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

export const BrutalistScene: React.FC<BrutalistSceneProps> = ({
  title = 'DESIGN IS DEAD',
  subtitle = 'Long live the machine',
  body = 'Raw. Unfiltered. Unapologetic.',
  number = '01',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : '#F0EDE8';
  const contentWidth = layout === 'split' ? width * 0.62 : width;

  // Concrete texture via noise pattern
  const titleX = interpolate(frame, [0, 20], [-contentWidth, 0], { extrapolateRight: 'clamp' });
  const subtitleX = interpolate(frame, [8, 28], [contentWidth, 0], { extrapolateRight: 'clamp' });
  const bodyOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });
  const lineScale = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* Concrete texture overlay */}
      {layout !== 'greenscreen' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          opacity: 0.4,
        }} />
      )}

      <div style={{ width: contentWidth, height, position: 'relative', padding: '50px', boxSizing: 'border-box' }}>

        {/* Big number */}
        <div style={{
          position: 'absolute', top: 30, right: layout === 'split' ? 20 : 50,
          fontSize: 180, fontWeight: 900, color: 'rgba(0,0,0,0.06)',
          lineHeight: 1, userSelect: 'none',
          fontFamily: '"Arial Black", sans-serif',
        }}>
          {number}
        </div>

        {/* Horizontal rule */}
        <div style={{
          height: 8, background: '#000000',
          width: `${lineScale * 100}%`,
          marginBottom: 30,
        }} />

        {/* Title */}
        <div style={{
          transform: `translateX(${titleX}px)`,
          fontSize: Math.min(72, contentWidth / (title.length * 0.6)),
          fontWeight: 900,
          color: '#000000',
          textTransform: 'uppercase',
          lineHeight: 0.9,
          letterSpacing: -2,
          marginBottom: 20,
        }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{
          transform: `translateX(${subtitleX}px)`,
          fontSize: 24,
          fontWeight: 400,
          color: '#333333',
          textTransform: 'uppercase',
          letterSpacing: 4,
          marginBottom: 40,
          fontFamily: '"Courier New", monospace',
        }}>
          {subtitle}
        </div>

        {/* Thick divider */}
        <div style={{
          height: 4, background: '#000',
          width: `${lineScale * 60}%`,
          marginBottom: 30,
          opacity: bodyOpacity,
        }} />

        {/* Body text */}
        <div style={{
          opacity: bodyOpacity,
          fontSize: 18,
          color: '#555',
          fontFamily: '"Courier New", monospace',
          fontWeight: 400,
          lineHeight: 1.6,
          maxWidth: 500,
        }}>
          {body}
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 50, left: 50, right: layout === 'split' ? 20 : 50,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          opacity: bodyOpacity,
        }}>
          <div style={{ height: 4, background: '#000', flex: 1, marginRight: 20 }} />
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#000', textTransform: 'uppercase' }}>
            {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Split: webcam area */}
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
