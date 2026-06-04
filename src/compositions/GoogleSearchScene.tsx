import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface GoogleSearchSceneProps {
  searchQuery: string;
  results?: string[];
  style?: 'light' | 'dark';
}

export const GoogleSearchScene: React.FC<GoogleSearchSceneProps> = ({
  searchQuery, results = [], style = 'light',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDark = style === 'dark';
  const bg = isDark ? '#202124' : '#ffffff';
  const cardBg = isDark ? '#303134' : '#ffffff';
  const textColor = isDark ? '#e8eaed' : '#202124';
  const subColor = isDark ? '#9aa0a6' : '#70757a';
  const borderColor = isDark ? '#5f6368' : '#dfe1e5';

  // Typewriter effect for search query
  const charCount = Math.floor(interpolate(frame, [fps * 0.3, fps * 1.2], [0, searchQuery.length], { extrapolateRight: 'clamp' }));
  const displayQuery = searchQuery.slice(0, charCount);
  const showCursor = frame % (fps / 2) < fps / 4;

  const containerOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const containerScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 0.95, to: 1.0 });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: isDark ? '#181818' : '#f8f9fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'arial, sans-serif',
    }}>
      <div style={{
        width: '900px',
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
      }}>
        {/* Google Logo */}
        <div style={{
          textAlign: 'center', marginBottom: '32px',
          fontSize: '72px', fontWeight: 400, letterSpacing: '-2px',
        }}>
          <span style={{ color: '#4285f4' }}>G</span>
          <span style={{ color: '#ea4335' }}>o</span>
          <span style={{ color: '#fbbc05' }}>o</span>
          <span style={{ color: '#4285f4' }}>g</span>
          <span style={{ color: '#34a853' }}>l</span>
          <span style={{ color: '#ea4335' }}>e</span>
        </div>

        {/* Search Bar */}
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '28px',
          padding: '18px 28px',
          display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '32px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke={subColor} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '28px', color: textColor, flex: 1, minHeight: '36px' }}>
            {displayQuery}{showCursor && charCount < searchQuery.length ? '|' : ''}
          </span>
        </div>

        {/* Search Results */}
        {results.slice(0, 4).map((result, i) => {
          const delay = fps * (1.3 + i * 0.2);
          const opacity = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
          const y = interpolate(frame, [delay, delay + fps * 0.3], [20, 0], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              opacity, transform: `translateY(${y}px)`,
              marginBottom: '20px', padding: '16px 4px',
            }}>
              <div style={{ fontSize: '14px', color: subColor, marginBottom: '4px' }}>
                https://www.example{i + 1}.com › artikel
              </div>
              <div style={{ fontSize: '24px', color: '#1a0dab', marginBottom: '6px', cursor: 'pointer' }}>
                {result}
              </div>
              <div style={{ fontSize: '16px', color: subColor, lineHeight: 1.5 }}>
                Temukan informasi lengkap tentang topik ini. Klik untuk membaca selengkapnya...
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
