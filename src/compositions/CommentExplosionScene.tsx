import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface Comment {
  username: string;
  text: string;
  avatar?: string;
  color?: string;
}

interface CommentExplosionProps {
  comments: Comment[];
  title?: string;
  bgColor?: string;
  accentColor?: string;
  layout?: 'full' | 'split' | 'greenscreen';
}

const COMMENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const CommentCard: React.FC<{
  comment: Comment;
  index: number;
  totalComments: number;
  frame: number;
  fps: number;
}> = ({ comment, index, totalComments, frame, fps }) => {
  // Stagger delay: each comment appears 8 frames apart, then speeds up
  const baseDelay = Math.min(index * 8, 40) + Math.max(0, (index - 5) * 3);
  const startFrame = baseDelay;

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
  });

  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);

  // Random-ish positions based on index
  const positions = [
    { x: '5%', y: '10%' }, { x: '55%', y: '5%' }, { x: '30%', y: '15%' },
    { x: '70%', y: '20%' }, { x: '10%', y: '30%' }, { x: '50%', y: '28%' },
    { x: '75%', y: '35%' }, { x: '20%', y: '45%' }, { x: '60%', y: '42%' },
    { x: '5%', y: '55%' }, { x: '40%', y: '58%' }, { x: '72%', y: '52%' },
    { x: '15%', y: '68%' }, { x: '55%', y: '65%' }, { x: '80%', y: '62%' },
    { x: '25%', y: '78%' }, { x: '65%', y: '75%' }, { x: '42%', y: '82%' },
    { x: '8%', y: '85%' }, { x: '78%', y: '80%' },
  ];

  const pos = positions[index % positions.length];
  const color = comment.color || COMMENT_COLORS[index % COMMENT_COLORS.length];

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: 'bottom left',
        maxWidth: '280px',
        zIndex: index,
      }}
    >
      <div
        style={{
          background: 'rgba(20, 20, 30, 0.92)',
          border: `2px solid ${color}`,
          borderRadius: '16px',
          padding: '10px 14px',
          boxShadow: `0 4px 20px ${color}40, 0 0 0 1px ${color}20`,
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}, ${color}88)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fff',
              fontFamily: 'sans-serif',
              flexShrink: 0,
            }}
          >
            {comment.username.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              color,
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'sans-serif',
              letterSpacing: '0.3px',
            }}
          >
            {comment.username}
          </span>
          {/* Verified badge */}
          <span style={{ color: '#4ECDC4', fontSize: '11px' }}>✓</span>
        </div>
        {/* Comment text */}
        <p
          style={{
            color: '#E8E8F0',
            fontSize: '13px',
            fontFamily: 'sans-serif',
            margin: 0,
            lineHeight: '1.4',
          }}
        >
          {comment.text}
        </p>
        {/* Like count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
          <span style={{ color: '#FF6B6B', fontSize: '11px' }}>❤️</span>
          <span style={{ color: '#888', fontSize: '11px', fontFamily: 'sans-serif' }}>
            {Math.floor(Math.random() * 900 + 100)}
          </span>
        </div>
      </div>
      {/* Tail */}
      <div
        style={{
          position: 'absolute',
          bottom: '-8px',
          left: '20px',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid ${color}`,
        }}
      />
    </div>
  );
};

export const CommentExplosionScene: React.FC<CommentExplosionProps> = ({
  comments = [],
  title = 'Apa Kata Mereka?',
  bgColor = '#0A0A14',
  accentColor = '#6C63FF',
  layout = 'full',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const defaultComments: Comment[] = comments.length > 0 ? comments : [
    { username: 'user_123', text: 'Ini luar biasa! 🔥' },
    { username: 'creative_mind', text: 'Konten terbaik yang pernah saya lihat!' },
    { username: 'tech_lover', text: 'Sudah subscribe! Jangan lupa balik ya 😊' },
    { username: 'daily_viewer', text: 'Selalu menunggu konten baru dari channel ini' },
    { username: 'inspired_one', text: 'Terima kasih sudah berbagi ilmu ini!' },
    { username: 'fan_account', text: 'Ini yang saya cari selama ini 💯' },
    { username: 'night_owl', text: 'Nonton jam 2 pagi, worth it banget!' },
    { username: 'pro_creator', text: 'Tekniknya sangat profesional 👏' },
    { username: 'student_dev', text: 'Belajar banyak dari video ini, makasih!' },
    { username: 'entrepreneur', text: 'Langsung saya terapkan ke bisnis saya' },
    { username: 'design_nerd', text: 'Animasinya smooth banget, keren!' },
    { username: 'coffee_addict', text: 'Sambil ngopi pagi, konten sempurna ☕' },
  ];

  // Title animation
  const titleProgress = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const titleY = interpolate(titleProgress, [0, 1], [-60, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.5, 1], [0, 0.8, 1]);

  const bgStyle: React.CSSProperties =
    layout === 'greenscreen'
      ? { background: '#00FF00' }
      : layout === 'split'
      ? { background: `linear-gradient(135deg, ${bgColor} 0%, #1a1a2e 100%)` }
      : { background: `linear-gradient(135deg, ${bgColor} 0%, #1a1a2e 100%)` };

  const contentWidth = layout === 'split' ? width * 0.62 : width;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', ...bgStyle }}>
      {/* Background grid */}
      {layout !== 'greenscreen' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle, ${accentColor}15 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            opacity: 0.4,
          }}
        />
      )}

      {/* Content area */}
      <div style={{ position: 'absolute', inset: 0, width: contentWidth }}>
        {/* Title */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: `translateX(-50%) translateY(${titleY}px)`,
            opacity: titleOpacity,
            zIndex: 100,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #FF6B6B)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '36px',
              fontWeight: '900',
              fontFamily: 'sans-serif',
              letterSpacing: '-1px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: '60px',
              height: '3px',
              background: `linear-gradient(90deg, ${accentColor}, #FF6B6B)`,
              margin: '6px auto 0',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Comments */}
        {defaultComments.map((comment, i) => (
          <CommentCard
            key={i}
            comment={comment}
            index={i}
            totalComments={defaultComments.length}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>

      {/* Split layout webcam area */}
      {layout === 'split' && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: width * 0.38,
            height,
            background: '#00FF00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#006600', fontSize: '14px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            📷 WEBCAM
          </div>
        </div>
      )}
    </div>
  );
};
