import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CHARACTER_COLORS } from '../utils/colorPalette';

export const Boy2: React.FC = () => {
  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 100 }}>
      <div style={{
        width: 350, height: 700,
        backgroundColor: CHARACTER_COLORS.BOY2_SHIRT,
        borderRadius: '40px 40px 0 0',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: 60, width: '100%', textAlign: 'center', fontSize: 90
        }}>😐</div>
      </div>
    </AbsoluteFill>
  );
};
