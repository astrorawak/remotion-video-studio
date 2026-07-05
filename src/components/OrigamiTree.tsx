import React from 'react';
import { spring } from 'remotion';
import { COLORS } from '../config/lastFold';

interface OrigamiTreeProps {
  frame: number;
  fps: number;
  x: number; // horizontal center of the trunk (px)
  y: number; // baseline (ground contact) y coordinate (px)
  size: number; // tree height (px)
  delay?: number;
  variant?: 0 | 1 | 2;
  sway?: number; // extra rotation in deg (scene-driven wind)
  opacity?: number;
}

// Faceted low-poly conifer, folded down its vertical crease: every tier is
// two polygons sharing the apex edge — left facet lit, right facet shaded.
export const OrigamiTree: React.FC<OrigamiTreeProps> = ({
  frame,
  fps,
  x,
  y,
  size,
  delay = 0,
  variant = 0,
  sway = 0,
  opacity = 1,
}) => {
  // Paper "pops up" out of the page with a slight overshoot.
  const grow = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  const palettes = [
    { light: COLORS.forestLight, dark: COLORS.forestMid },
    { light: COLORS.forestMid, dark: COLORS.forestDeep },
    { light: COLORS.leafHighlight, dark: COLORS.forestLight },
  ];
  const p = palettes[variant % 3];

  // Tier proportions vary slightly per variant so the forest isn't uniform.
  const spread = [90, 82, 96][variant % 3];
  const width = size * 0.66;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - size,
        width,
        height: size,
        transform: `rotate(${sway}deg) scaleY(${grow}) scaleX(${0.9 + grow * 0.1})`,
        transformOrigin: 'bottom center',
        opacity,
      }}
    >
      <svg viewBox="0 0 200 300" width="100%" height="100%" preserveAspectRatio="none">
        {/* Trunk — two facets split on the fold line */}
        <polygon points="88,300 100,300 100,205 88,212" fill={COLORS.trunkBrown} />
        <polygon points="100,300 112,300 112,212 100,205" fill={COLORS.trunkShadow} />
        {/* Bottom tier */}
        <polygon points={`100,60 ${100 - spread},230 100,230`} fill={p.light} />
        <polygon points={`100,60 ${100 + spread},230 100,230`} fill={p.dark} />
        {/* Middle tier */}
        <polygon points={`100,30 ${100 - spread * 0.76},160 100,160`} fill={p.light} />
        <polygon points={`100,30 ${100 + spread * 0.76},160 100,160`} fill={p.dark} />
        {/* Top tier */}
        <polygon points={`100,0 ${100 - spread * 0.52},100 100,100`} fill={p.light} />
        <polygon points={`100,0 ${100 + spread * 0.52},100 100,100`} fill={p.dark} />
        {/* Crease highlight */}
        <line x1="100" y1="0" x2="100" y2="230" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
