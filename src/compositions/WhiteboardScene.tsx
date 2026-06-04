import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface StickyNote {
  text: string;
  color?: string;
  x?: number;
  y?: number;
  rotate?: number;
}

interface WhiteboardSceneProps {
  title?: string;
  stickies?: StickyNote[];
  layout?: 'full' | 'split' | 'greenscreen';
}

export const WhiteboardScene: React.FC<WhiteboardSceneProps> = ({
  title = 'The Plan',
  stickies = [],
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : '#FAFAFA';
  const contentWidth = layout === 'split' ? width * 0.62 : width;

  const defaultStickies: StickyNote[] = stickies.length > 0 ? stickies : [
    { text: 'Research\ncompetitors', color: '#FFE066', x: 80, y: 120, rotate: -2 },
    { text: 'Build MVP', color: '#FF9F43', x: 280, y: 100, rotate: 1.5 },
    { text: 'Get first\n10 users', color: '#54A0FF', x: 480, y: 130, rotate: -1 },
    { text: 'Iterate\nfast!', color: '#5F27CD', x: 160, y: 300, rotate: 2 },
    { text: 'Launch\n🚀', color: '#00D2D3', x: 380, y: 280, rotate: -1.5 },
  ];

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"Permanent Marker", "Comic Sans MS", cursive',
    }}>
      {/* Whiteboard grid */}
      {layout !== 'greenscreen' && (
        <svg style={{ position: 'absolute', inset: 0, width: contentWidth, height }}>
          {Array.from({ length: Math.ceil(contentWidth / 40) }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height}
              stroke="#E8E8E8" strokeWidth={1} />
          ))}
          {Array.from({ length: Math.ceil(height / 40) }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={contentWidth} y2={i * 40}
              stroke="#E8E8E8" strokeWidth={1} />
          ))}
        </svg>
      )}

      <div style={{ width: contentWidth, height, position: 'relative', padding: '40px 50px', boxSizing: 'border-box' }}>

        {/* Title written in marker style */}
        <div style={{
          opacity: titleOpacity,
          marginBottom: 30,
        }}>
          <div style={{
            fontSize: 42, color: '#2C2C2C', fontWeight: 700,
            borderBottom: '3px solid #2C2C2C',
            paddingBottom: 8, display: 'inline-block',
          }}>
            {title}
          </div>
        </div>

        {/* Sticky notes */}
        {defaultStickies.map((sticky, i) => {
          const stickyOpacity = interpolate(frame, [10 + i * 8, 25 + i * 8], [0, 1], { extrapolateRight: 'clamp' });
          const stickyScale = interpolate(frame, [10 + i * 8, 25 + i * 8], [0.5, 1], { extrapolateRight: 'clamp' });
          const stickyColor = sticky.color || '#FFE066';

          return (
            <div key={i} style={{
              position: 'absolute',
              left: sticky.x || 80 + i * 120,
              top: sticky.y || 150 + (i % 2) * 100,
              width: 140,
              minHeight: 120,
              background: stickyColor,
              padding: '12px 14px',
              boxShadow: '3px 4px 8px rgba(0,0,0,0.15)',
              transform: `rotate(${sticky.rotate || 0}deg) scale(${stickyScale})`,
              opacity: stickyOpacity,
              transformOrigin: 'center center',
            }}>
              {/* Sticky top fold */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: `${stickyColor}CC`,
                filter: 'brightness(0.85)',
              }} />
              <div style={{
                fontSize: 16, color: '#2C2C2C', lineHeight: 1.4,
                whiteSpace: 'pre-line',
              }}>
                {sticky.text}
              </div>
            </div>
          );
        })}

        {/* Connecting arrows between stickies */}
        {layout !== 'greenscreen' && defaultStickies.length >= 2 && (
          <svg style={{ position: 'absolute', inset: 0, width: contentWidth, height, pointerEvents: 'none' }}>
            {defaultStickies.slice(0, -1).map((sticky, i) => {
              const nextSticky = defaultStickies[i + 1];
              const x1 = (sticky.x || 80 + i * 120) + 70;
              const y1 = (sticky.y || 150 + (i % 2) * 100) + 60;
              const x2 = (nextSticky.x || 80 + (i + 1) * 120) + 70;
              const y2 = (nextSticky.y || 150 + ((i + 1) % 2) * 100) + 60;
              const arrowOpacity = interpolate(frame, [25 + i * 8, 40 + i * 8], [0, 0.6], { extrapolateRight: 'clamp' });
              return (
                <g key={i} opacity={arrowOpacity}>
                  <path d={`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 20} ${x2},${y2}`}
                    fill="none" stroke="#999" strokeWidth={2} strokeDasharray="6,4" />
                </g>
              );
            })}
          </svg>
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
