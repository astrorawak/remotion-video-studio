import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Motorcycle: React.FC = () => {
  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
      <div style={{
        width: '80%', height: 300, backgroundColor: '#222',
        borderRadius: '100px 100px 0 0', border: '5px solid #444'
      }}>
        {/* Handlebars */}
        <div style={{ position: 'absolute', top: -50, left: 0, width: 200, height: 40, backgroundColor: '#333' }} />
        <div style={{ position: 'absolute', top: -50, right: 0, width: 200, height: 40, backgroundColor: '#333' }} />
      </div>
    </AbsoluteFill>
  );
};
