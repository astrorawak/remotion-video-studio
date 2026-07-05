import React from 'react';
import { spring } from 'remotion';
import { COLORS } from '../config/lastFold';

interface PalmTreeProps {
  frame: number;
  fps: number;
  x: number; // horizontal center of the trunk (px)
  y: number; // baseline (ground contact) y coordinate (px)
  size: number; // tree height (px)
  delay?: number;
  opacity?: number;
}

const FROND_ANGLES = [-105, -70, -35, 0, 35, 70, 105];

// Geometric oil palm — deliberately harsher and more mechanical than the
// origami conifer: segmented trapezoid trunk, angular fronds fanned by
// rotation, alternating dull/dark facets.
export const PalmTree: React.FC<PalmTreeProps> = ({
  frame,
  fps,
  x,
  y,
  size,
  delay = 0,
  opacity = 1,
}) => {
  // Aggressive snap-up, stiffer than the forest's gentle growth.
  const grow = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const width = size * 0.8;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - size,
        width,
        height: size,
        transform: `scaleY(${grow})`,
        transformOrigin: 'bottom center',
        opacity,
      }}
    >
      <svg viewBox="0 0 240 300" width="100%" height="100%" preserveAspectRatio="none">
        {/* Segmented industrial trunk */}
        <polygon points="110,300 130,300 125,120 115,120" fill={COLORS.ochre} />
        <polygon points="120,300 130,300 125,120 120,120" fill={COLORS.ochreShadow} />
        {[160, 200, 240, 275].map((ny) => (
          <line key={ny} x1="111" y1={ny} x2="129" y2={ny} stroke={COLORS.earthDark} strokeWidth="3" strokeOpacity="0.6" />
        ))}
        {/* Fan of angular fronds */}
        <g transform="translate(120,120)">
          {FROND_ANGLES.map((angle, i) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <polygon
                points="0,6 10,-25 6,-95 0,-108 -6,-95 -10,-25"
                fill={i % 2 === 0 ? COLORS.palmDull : COLORS.palmDark}
              />
              <line x1="0" y1="0" x2="0" y2="-100" stroke={COLORS.palmDark} strokeOpacity="0.5" strokeWidth="1.5" />
            </g>
          ))}
          <circle cx="0" cy="0" r="9" fill={COLORS.earthScar} />
        </g>
      </svg>
    </div>
  );
};
