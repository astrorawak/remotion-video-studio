import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface SketchbookSceneProps {
  title?: string;
  points?: string[];
  author?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

export const SketchbookScene: React.FC<SketchbookSceneProps> = ({
  title = 'My Big Idea',
  points = ['Start with why', 'Keep it simple', 'Ship fast, learn faster'],
  author = 'Notes from the field',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : '#FFF9F0';
  const contentWidth = layout === 'split' ? width * 0.62 : width;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleRotate = interpolate(frame, [0, 20], [-2, -1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"Patrick Hand", "Comic Sans MS", cursive',
    }}>
      {/* Paper lines */}
      {layout !== 'greenscreen' && (
        <svg style={{ position: 'absolute', inset: 0, width: contentWidth, height }}>
          {Array.from({ length: Math.ceil(height / 40) }).map((_, i) => (
            <line key={i} x1={0} y1={40 + i * 40} x2={contentWidth} y2={40 + i * 40}
              stroke="#E8D5B0" strokeWidth={1} />
          ))}
          {/* Left margin */}
          <line x1={80} y1={0} x2={80} y2={height} stroke="#FFB3B3" strokeWidth={1.5} />
        </svg>
      )}

      <div style={{ width: contentWidth, height, position: 'relative', padding: '50px 50px 50px 100px', boxSizing: 'border-box' }}>

        {/* Title with hand-drawn underline */}
        <div style={{
          opacity: titleOpacity,
          transform: `rotate(${titleRotate}deg)`,
          marginBottom: 30,
        }}>
          <div style={{
            fontSize: 48, fontWeight: 700, color: '#2C2C2C',
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          {/* Squiggly underline */}
          <svg width={Math.min(400, title.length * 22)} height={12} style={{ marginTop: 4 }}>
            <path d={`M0,6 ${Array.from({ length: 20 }).map((_, i) =>
              `Q${i * 20 + 10},${i % 2 === 0 ? 0 : 12} ${(i + 1) * 20},6`
            ).join(' ')}`}
              fill="none" stroke="#FF6B35" strokeWidth={2.5} />
          </svg>
        </div>

        {/* Bullet points */}
        {points.map((point, i) => {
          const pointOpacity = interpolate(frame, [15 + i * 10, 30 + i * 10], [0, 1], { extrapolateRight: 'clamp' });
          const pointX = interpolate(frame, [15 + i * 10, 30 + i * 10], [-30, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              marginBottom: 24,
              opacity: pointOpacity,
              transform: `translateX(${pointX}px)`,
            }}>
              {/* Hand-drawn arrow */}
              <svg width={28} height={28} style={{ flexShrink: 0, marginTop: 4 }}>
                <path d="M4,14 L20,14 M14,8 L20,14 L14,20" fill="none" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{
                fontSize: 22, color: '#2C2C2C', lineHeight: 1.4,
                transform: `rotate(${(i % 3 - 1) * 0.3}deg)`,
              }}>
                {point}
              </div>
            </div>
          );
        })}

        {/* Highlighter accent on first point */}
        {points.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 195, left: 95,
            width: Math.min(300, points[0].length * 13),
            height: 28,
            background: 'rgba(255, 235, 59, 0.5)',
            zIndex: -1,
            transform: 'rotate(-0.5deg)',
            opacity: interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' }),
          }} />
        )}

        {/* Author note */}
        <div style={{
          position: 'absolute', bottom: 40, right: layout === 'split' ? 20 : 50,
          fontSize: 14, color: '#999', fontStyle: 'italic',
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }),
          transform: 'rotate(-1deg)',
        }}>
          — {author}
        </div>

        {/* Paper corner fold */}
        {layout !== 'greenscreen' && (
          <div style={{
            position: 'absolute', bottom: 0, right: layout === 'split' ? 0 : 0,
            width: 0, height: 0,
            borderStyle: 'solid',
            borderWidth: '0 0 50px 50px',
            borderColor: `transparent transparent #E8D5B0 transparent`,
          }} />
        )}
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
