import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLOR_PALETTE } from '../utils/colorPalette';

export const Environment: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR_PALETTE.SKY_BLUE }}>
      {/* Grass/Fields */}
      <div style={{
        position: 'absolute', bottom: 0, width: '100%', height: '60%',
        backgroundColor: COLOR_PALETTE.FIELD_GREEN
      }} />
      {/* Road */}
      <div style={{
        position: 'absolute', bottom: 0, left: '25%', width: '50%', height: '60%',
        backgroundColor: '#555', transform: 'perspective(500px) rotateX(60deg)'
      }} />
    </AbsoluteFill>
  );
};
