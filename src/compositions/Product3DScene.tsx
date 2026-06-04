import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface ProductPart {
  label: string;
  color: string;
  height: number;
  offset: number;
}

interface Product3DProps {
  productName: string;
  tagline?: string;
  parts?: ProductPart[];
  primaryColor?: string;
  bgColor?: string;
  mode?: 'showcase' | 'exploded';
}

export const Product3DScene: React.FC<Product3DProps> = ({
  productName = 'Meridian Pro',
  tagline = 'Engineered for Excellence',
  parts = [
    { label: 'Premium Cap', color: '#6C63FF', height: 60, offset: 0 },
    { label: 'Vacuum Seal', color: '#4FACFE', height: 20, offset: 0 },
    { label: 'Insulation Layer', color: '#43E97B', height: 120, offset: 0 },
    { label: 'Inner Chamber', color: '#F7971E', height: 100, offset: 0 },
    { label: 'Base', color: '#FA709A', height: 40, offset: 0 },
  ],
  primaryColor = '#6C63FF',
  bgColor = '#080B14',
  mode = 'exploded',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Product appears (0-60)
  // Phase 2: Rotation (60-120)
  // Phase 3: Exploded view (120-210)
  // Phase 4: Reassemble (210-270)

  const rotateY = interpolate(frame, [0, 270], [0, 360]);
  const rotateX = interpolate(frame, [0, 270], [-10, -10]);

  // Exploded view offsets
  const explodeProgress = interpolate(frame, [120, 180], [0, 1], { extrapolateRight: 'clamp' });
  const reassembleProgress = interpolate(frame, [210, 260], [0, 1], { extrapolateRight: 'clamp' });
  const finalExplode = Math.max(0, explodeProgress - reassembleProgress);

  const partAnimations = parts.map((part, i) => {
    const totalParts = parts.length;
    const centerIdx = (totalParts - 1) / 2;
    const explodeOffset = (i - centerIdx) * 80 * finalExplode;

    return {
      translateY: explodeOffset,
      opacity: spring({ frame, fps, config: { damping: 20 } }),
      labelOpacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: 'clamp' }) * finalExplode,
    };
  });

  // Title animations
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  // Phase label
  const phaseLabel = frame < 60 ? 'Product Reveal' :
    frame < 120 ? '360° View' :
    frame < 210 ? 'Component Breakdown' : 'Reassembling';

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #1a1a2e 0%, ${bgColor} 70%)`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500, height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 70%)`,
      }} />

      {/* Grid floor */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
        backgroundImage: `linear-gradient(rgba(108,99,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        transform: 'perspective(400px) rotateX(70deg)',
        transformOrigin: 'bottom center',
        opacity: 0.5,
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 50, left: 0, right: 0,
        textAlign: 'center',
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
          {productName}
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          {tagline}
        </div>
      </div>

      {/* Phase indicator */}
      <div style={{
        position: 'absolute', bottom: 50, left: 0, right: 0,
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '8px 24px',
          fontSize: 14, color: 'rgba(255,255,255,0.6)',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          {phaseLabel}
        </div>
      </div>

      {/* 3D Product */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(-50%, -50%)`,
      }}>
        <div style={{
          transform: `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: 'preserve-3d',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4,
        }}>
          {parts.map((part, i) => {
            const anim = partAnimations[i];
            return (
              <div key={i} style={{
                position: 'relative',
                transform: `translateY(${anim.translateY}px)`,
                transition: 'none',
              }}>
                {/* Part body */}
                <div style={{
                  width: 120,
                  height: part.height,
                  background: `linear-gradient(135deg, ${part.color}dd, ${part.color}88)`,
                  borderRadius: i === 0 ? '12px 12px 4px 4px' : i === parts.length - 1 ? '4px 4px 12px 12px' : 4,
                  boxShadow: `0 0 20px ${part.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  border: `1px solid ${part.color}80`,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Shine effect */}
                  <div style={{
                    position: 'absolute', top: 0, left: '-100%',
                    width: '60%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    transform: `translateX(${(rotateY % 360) / 360 * 400}%)`,
                  }} />
                </div>

                {/* Part label */}
                <div style={{
                  position: 'absolute',
                  left: 130, top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: anim.labelOpacity,
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 40, height: 1,
                      background: `${part.color}80`,
                    }} />
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: part.color,
                    }}>
                      {part.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflection */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 80,
        transform: 'translateX(-50%)',
        width: 120, height: 20,
        background: `radial-gradient(ellipse, ${primaryColor}40 0%, transparent 70%)`,
        filter: 'blur(8px)',
      }} />
    </AbsoluteFill>
  );
};
