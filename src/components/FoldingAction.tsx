import React from 'react';
import { interpolate } from 'remotion';
import { useFold, FoldConfig } from '../animations/useFold';

interface FoldingActionProps {
  frame: number;
  fps: number;
  direction?: 'vertical' | 'horizontal';
  delay?: number;
  foldConfig?: Omit<FoldConfig, 'delay'>;
  // 'gradient': shading overlay + crease line — for opaque, full-bleed
  // content. 'dim': per-panel brightness filter — for transparent
  // content, where an overlay rectangle would darken the backdrop too.
  shadeMode?: 'gradient' | 'dim';
  children: React.ReactNode;
}

// Paper-fold transition: the content is cloned into two half-panels that
// hinge on the central crease and fold backward into the page. Past 90°
// the backfaces are hidden, so at full progress the content has folded
// itself out of existence, revealing whatever sits behind this wrapper.
export const FoldingAction: React.FC<FoldingActionProps> = ({
  frame,
  fps,
  direction = 'vertical',
  delay = 0,
  foldConfig,
  shadeMode = 'gradient',
  children,
}) => {
  const { progress } = useFold(frame, fps, { delay, ...foldConfig });
  // Panels are backface-hidden, so anything past 90° is invisible —
  // map the spring to ~100° so its full travel is visible fold motion
  // and the panel vanishes right at the end (never exactly 90/180 to
  // avoid coplanar z-fighting).
  const angle = progress * 100;
  const shade = interpolate(progress, [0, 0.5, 1], [0, 0.55, 0.85]);
  const creaseGlow = Math.sin(Math.min(Math.max(progress, 0), 1) * Math.PI) * 0.5;

  const vertical = direction === 'vertical';

  const panel = (first: boolean): React.CSSProperties => ({
    position: 'absolute',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    ...(shadeMode === 'dim' ? { filter: `brightness(${1 - shade * 0.6})` } : {}),
    ...(vertical
      ? {
          left: 0,
          right: 0,
          height: '50%',
          top: first ? 0 : '50%',
          transform: `rotateX(${first ? angle : -angle}deg)`,
          transformOrigin: first ? 'bottom center' : 'top center',
        }
      : {
          top: 0,
          bottom: 0,
          width: '50%',
          left: first ? 0 : '50%',
          transform: `rotateY(${first ? -angle : angle}deg)`,
          transformOrigin: first ? 'center right' : 'center left',
        }),
  });

  const content = (first: boolean): React.CSSProperties => ({
    position: 'absolute',
    ...(vertical
      ? { left: 0, width: '100%', height: '200%', top: first ? 0 : '-100%' }
      : { top: 0, height: '100%', width: '200%', left: first ? 0 : '-100%' }),
  });

  // Gradient darkens toward the crease — the paper closing on itself.
  const shadeStyle = (first: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: shade,
    background: vertical
      ? `linear-gradient(${first ? 'to bottom' : 'to top'}, transparent 30%, rgba(0,0,0,0.9))`
      : `linear-gradient(${first ? 'to right' : 'to left'}, transparent 30%, rgba(0,0,0,0.9))`,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 1400 }}>
      {[true, false].map((first) => (
        <div key={first ? 'a' : 'b'} style={panel(first)}>
          <div style={content(first)}>{children}</div>
          {shadeMode === 'gradient' && <div style={shadeStyle(first)} />}
        </div>
      ))}
      {/* Crease highlight — brightens mid-fold, gone at rest */}
      {shadeMode === 'gradient' && (
        <div
          style={{
            position: 'absolute',
            opacity: creaseGlow,
            background: '#FFF8E8',
            ...(vertical
              ? { left: 0, right: 0, top: 'calc(50% - 1.5px)', height: 3 }
              : { top: 0, bottom: 0, left: 'calc(50% - 1.5px)', width: 3 }),
          }}
        />
      )}
    </div>
  );
};
