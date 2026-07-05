import React from 'react';
import { COLORS } from '../config/lastFold';

interface OrigamiLeafProps {
  x: number;
  y: number;
  size?: number;
  rotation?: number;
  colorLight?: string;
  colorDark?: string;
  opacity?: number;
}

// Small two-facet paper diamond — the fold crease runs down the middle,
// so the left half catches light and the right half sits in shadow.
export const OrigamiLeaf: React.FC<OrigamiLeafProps> = ({
  x,
  y,
  size = 28,
  rotation = 0,
  colorLight = COLORS.leafHighlight,
  colorDark = COLORS.forestMid,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size * 1.6,
      transform: `rotate(${rotation}deg)`,
      opacity,
    }}
  >
    <svg viewBox="0 0 20 32" width="100%" height="100%">
      <polygon points="10,0 0,16 10,32" fill={colorLight} />
      <polygon points="10,0 20,16 10,32" fill={colorDark} />
      <line x1="10" y1="0" x2="10" y2="32" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="0.6" />
    </svg>
  </div>
);
