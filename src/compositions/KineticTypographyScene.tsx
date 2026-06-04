import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface KineticTypographySceneProps {
  words?: string[];
  highlightWords?: string[];
  style?: 'dark' | 'light' | 'neon' | 'gradient';
  accentColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
  fontSize?: number;
}

export const KineticTypographyScene: React.FC<KineticTypographySceneProps> = ({
  words = ['Every', 'great', 'story', 'starts', 'with', 'a', 'single', 'word.'],
  highlightWords = ['great', 'single'],
  style = 'dark',
  accentColor = '#6C63FF',
  layout = 'full',
  fontSize = 72,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const bgColor = layout === 'greenscreen' ? '#00FF00' : (style === 'light' ? '#FFFFFF' : '#0A0A0F');
  const textColor = style === 'light' ? '#111111' : '#FFFFFF';
  const contentWidth = layout === 'split' ? width * 0.62 : width;

  // Each word appears every ~8 frames
  const framesPerWord = 8;

  // Group words into lines (max ~4 words per line)
  const lines: string[][] = [];
  let currentLine: string[] = [];
  words.forEach((word, i) => {
    currentLine.push(word);
    if (currentLine.length >= 4 || i === words.length - 1) {
      lines.push([...currentLine]);
      currentLine = [];
    }
  });

  let wordIndex = 0;

  return (
    <div style={{
      width, height,
      background: bgColor,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background gradient for dark/neon styles */}
      {layout !== 'greenscreen' && style === 'neon' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${accentColor}20 0%, transparent 70%)`,
        }} />
      )}
      {layout !== 'greenscreen' && style === 'gradient' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, #0A0A0F 0%, #1a1a2e 50%, #16213e 100%)`,
        }} />
      )}

      <div style={{
        width: contentWidth,
        padding: '60px 80px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        {lines.map((line, lineIdx) => (
          <div key={lineIdx} style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '0 16px', marginBottom: 8,
          }}>
            {line.map((word, wIdx) => {
              const globalWordIdx = wordIndex++;
              const startFrame = globalWordIdx * framesPerWord;
              const wordOpacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], { extrapolateRight: 'clamp' });
              const wordY = interpolate(frame, [startFrame, startFrame + 8], [30, 0], { extrapolateRight: 'clamp' });
              const wordScale = interpolate(frame, [startFrame, startFrame + 8], [0.8, 1], { extrapolateRight: 'clamp' });
              const isHighlighted = highlightWords.includes(word.toLowerCase()) || highlightWords.includes(word);

              return (
                <span key={wIdx} style={{
                  display: 'inline-block',
                  opacity: wordOpacity,
                  transform: `translateY(${wordY}px) scale(${wordScale})`,
                  fontSize,
                  fontWeight: 900,
                  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
                  color: isHighlighted ? accentColor : textColor,
                  textShadow: isHighlighted
                    ? `0 0 30px ${accentColor}80`
                    : (style === 'neon' ? `0 0 20px ${textColor}40` : 'none'),
                  letterSpacing: -1,
                  lineHeight: 1.1,
                  // Highlight background for certain words
                  ...(isHighlighted && style !== 'light' ? {
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  } : {}),
                }}>
                  {word}
                </span>
              );
            })}
          </div>
        ))}
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
