import React from 'react';
import { AbsoluteFill } from 'remotion';

// Static paper-fiber texture. Fixed turbulence seeds — fibers must not
// crawl between frames (unlike film grain).
const fiberSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.02' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`;
const grainSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='11' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`;

const fiberUrl = `url("data:image/svg+xml,${encodeURIComponent(fiberSvg)}")`;
const grainUrl = `url("data:image/svg+xml,${encodeURIComponent(grainSvg)}")`;

interface PaperTextureProps {
  tone?: 'warm' | 'dark';
}

export const PaperTexture: React.FC<PaperTextureProps> = ({ tone = 'warm' }) => {
  // On dark backgrounds 'multiply' is invisible — switch to a faint
  // 'screen' grain so the paper feel survives the fade to black.
  const blend = tone === 'warm' ? 'multiply' : 'screen';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          backgroundImage: fiberUrl,
          backgroundRepeat: 'repeat',
          mixBlendMode: blend,
          opacity: tone === 'warm' ? 0.07 : 0.05,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: grainUrl,
          backgroundRepeat: 'repeat',
          mixBlendMode: blend,
          opacity: tone === 'warm' ? 0.05 : 0.04,
        }}
      />
    </AbsoluteFill>
  );
};
