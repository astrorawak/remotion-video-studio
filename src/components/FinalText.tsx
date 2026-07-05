import React from 'react';
import { spring, interpolate } from 'remotion';
import { COLORS, FONTS } from '../config/lastFold';

interface FinalTextProps {
  frame: number;
  fps: number;
  text?: string;
  delay?: number;
}

// Word-by-word spring reveal of the closing question.
export const FinalText: React.FC<FinalTextProps> = ({
  frame,
  fps,
  text = 'APA YANG AKAN KITA LIPAT SELANJUTNYA?',
  delay = 0,
}) => {
  const words = text.split(' ');
  const creditIn = interpolate(frame, [delay + words.length * 8 + 20, delay + words.length * 8 + 50], [0, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 100px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.35em',
          maxWidth: 880,
          fontFamily: FONTS.sans,
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1.3,
          letterSpacing: '0.06em',
          color: COLORS.textCream,
          textAlign: 'center',
        }}
      >
        {words.map((word, i) => {
          const s = spring({
            frame: frame - delay - i * 8,
            fps,
            config: { damping: 18, stiffness: 90 },
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: s,
                transform: `translateY(${(1 - s) * 40}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 60,
          fontFamily: FONTS.sans,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: '0.3em',
          color: COLORS.textCream,
          opacity: creditIn,
          textTransform: 'uppercase',
        }}
      >
        The Last Fold — Kalimantan&apos;s Lament
      </div>
    </div>
  );
};
