import React from 'react';

export interface CharacterPose {
  rotateY: number;
  rotateZ: number;
  translateX: number;
  translateY: number;
  scale: number;
  mouthOpen: number;
  armLeftRotate: number;
  armRightRotate: number;
}

interface CharacterBaseProps {
  jersey: string;
  jerseyAccent?: string;
  pants: string;
  skin: string;
  pose: CharacterPose;
  sunglasses?: boolean;
}

export const CharacterBase: React.FC<CharacterBaseProps> = ({
  jersey,
  jerseyAccent = '#FFFFFF',
  pants,
  skin,
  pose,
  sunglasses = false,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '8%',
        width: 220,
        height: 520,
        transformStyle: 'preserve-3d',
        transform: `translateX(-50%) translateX(${pose.translateX}px) translateY(${pose.translateY}px) rotateY(${pose.rotateY}deg) rotateZ(${pose.rotateZ}deg) scale(${pose.scale})`,
      }}
    >
      {/* legs */}
      <div style={{ position: 'absolute', bottom: 0, left: 40, width: 50, height: 190, background: pants, borderRadius: 14 }} />
      <div style={{ position: 'absolute', bottom: 0, right: 40, width: 50, height: 190, background: pants, borderRadius: 14 }} />

      {/* left arm */}
      <div
        style={{
          position: 'absolute',
          bottom: 260,
          left: -20,
          width: 100,
          height: 30,
          background: skin,
          borderRadius: 16,
          transformOrigin: 'right center',
          transform: `rotate(${pose.armLeftRotate}deg)`,
        }}
      />
      {/* right arm */}
      <div
        style={{
          position: 'absolute',
          bottom: 260,
          right: -20,
          width: 100,
          height: 30,
          background: skin,
          borderRadius: 16,
          transformOrigin: 'left center',
          transform: `rotate(${pose.armRightRotate}deg)`,
        }}
      />

      {/* torso */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 20,
          width: 180,
          height: 190,
          background: jersey,
          borderRadius: 24,
          boxShadow: 'inset 0 -24px 40px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: '100%', background: jerseyAccent }} />
      </div>

      {/* head */}
      <div
        style={{
          position: 'absolute',
          bottom: 360,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: skin,
          boxShadow: 'inset -12px -12px 22px rgba(0,0,0,0.22)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 22,
            left: '50%',
            width: 36,
            height: 14,
            background: '#5A1F1F',
            borderRadius: 8,
            transform: `translateX(-50%) scaleY(${0.3 + pose.mouthOpen * 1.3})`,
          }}
        />
        {sunglasses && (
          <div style={{ position: 'absolute', top: 34, left: '50%', transform: 'translateX(-50%)', width: 72, height: 18, background: '#1A1A1A', borderRadius: 6 }} />
        )}
      </div>
    </div>
  );
};
