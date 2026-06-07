import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
} from 'remotion';

// ─── Types ───────────────────────────────────────────────────────────────────

type CharacterType = 'businessman' | 'entrepreneur' | 'scientist' | 'teacher' | 'developer' | 'athlete' | 'doctor' | 'artist';
type SkinTone = 'light' | 'medium' | 'dark';
type Pose = 'standing' | 'pointing' | 'celebrating' | 'thinking' | 'presenting' | 'walking';
type Background = 'office' | 'space' | 'city' | 'gradient' | 'minimal';

interface CharacterScene {
  pose: Pose;
  character: CharacterType;
  skinTone?: SkinTone;
  text?: string;
  subtext?: string;
  bubbleText?: string; // speech bubble
  stat?: { label: string; value: string };
  duration?: number; // seconds, default 4
}

interface CharacterAnimationProps {
  scenes: CharacterScene[];
  title?: string;
  bgColor?: string;
  accentColor?: string;
  background?: Background;
  characterName?: string; // label di bawah karakter
  characterTitle?: string; // jabatan/profesi
}

// ─── Color Palettes ──────────────────────────────────────────────────────────

const SKIN_TONES: Record<SkinTone, { skin: string; shadow: string }> = {
  light: { skin: '#FDDBB4', shadow: '#E8B98A' },
  medium: { skin: '#C68642', shadow: '#A0522D' },
  dark: { skin: '#5C3317', shadow: '#3B1F0A' },
};

const OUTFIT_COLORS: Record<CharacterType, { primary: string; secondary: string; accent: string }> = {
  businessman: { primary: '#1A1A2E', secondary: '#16213E', accent: '#E94560' },
  entrepreneur: { primary: '#0F3460', secondary: '#533483', accent: '#E94560' },
  scientist: { primary: '#FFFFFF', secondary: '#E0E0E0', accent: '#00B4D8' },
  teacher: { primary: '#2D6A4F', secondary: '#1B4332', accent: '#95D5B2' },
  developer: { primary: '#1E1E1E', secondary: '#252526', accent: '#007ACC' },
  athlete: { primary: '#E63946', secondary: '#C1121F', accent: '#FFFFFF' },
  doctor: { primary: '#FFFFFF', secondary: '#E0E0E0', accent: '#48CAE4' },
  artist: { primary: '#7B2D8B', secondary: '#4A0E5C', accent: '#FF6B6B' },
};

const BACKGROUNDS: Record<Background, (accentColor: string) => React.ReactNode> = {
  office: (accent) => (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="officeBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0A0A1A" />
          <stop offset="100%" stopColor="#1A1A3E" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#officeBg)" />
      {/* Floor */}
      <rect x="0" y="1400" width="1080" height="520" fill="#0D0D2B" />
      <line x1="0" y1="1400" x2="1080" y2="1400" stroke={accent} strokeWidth="2" opacity="0.3" />
      {/* Grid lines */}
      {[...Array(8)].map((_, i) => (
        <line key={i} x1={i * 135} y1="1400" x2={540 + (i - 4) * 200} y2="1920"
          stroke={accent} strokeWidth="0.5" opacity="0.1" />
      ))}
      {/* Window */}
      <rect x="700" y="200" width="300" height="400" rx="8" fill="#1A2A4A" opacity="0.6" />
      <rect x="710" y="210" width="130" height="380" rx="4" fill="#0A1A3A" opacity="0.8" />
      <rect x="850" y="210" width="140" height="380" rx="4" fill="#0A1A3A" opacity="0.8" />
      {/* City lights in window */}
      {[...Array(20)].map((_, i) => (
        <rect key={i} x={715 + (i % 5) * 25} y={250 + Math.floor(i / 5) * 80}
          width="8" height="12" rx="1" fill={accent} opacity={0.3 + Math.random() * 0.4} />
      ))}
    </svg>
  ),
  space: (accent) => (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="spaceBg" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#0D1B2A" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#spaceBg)" />
      {/* Stars */}
      {[...Array(80)].map((_, i) => (
        <circle key={i} cx={(i * 137.5) % 1080} cy={(i * 97.3) % 1920}
          r={0.5 + (i % 3) * 0.8} fill="white" opacity={0.3 + (i % 5) * 0.14} />
      ))}
      {/* Planet */}
      <circle cx="850" cy="300" r="120" fill="#FF4500" opacity="0.6" />
      <circle cx="850" cy="300" r="120" fill="none" stroke={accent} strokeWidth="2" opacity="0.3" />
      {/* Orbit ring */}
      <ellipse cx="540" cy="1600" rx="600" ry="80" fill="none" stroke={accent} strokeWidth="1" opacity="0.2" />
    </svg>
  ),
  city: (accent) => (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cityBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0A0A1A" />
          <stop offset="60%" stopColor="#1A1A3E" />
          <stop offset="100%" stopColor="#0D0D2B" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#cityBg)" />
      {/* Buildings silhouette */}
      {[
        { x: 0, w: 120, h: 600 }, { x: 130, w: 80, h: 450 }, { x: 220, w: 150, h: 700 },
        { x: 380, w: 100, h: 500 }, { x: 490, w: 200, h: 800 }, { x: 700, w: 130, h: 600 },
        { x: 840, w: 100, h: 550 }, { x: 950, w: 130, h: 650 },
      ].map((b, i) => (
        <rect key={i} x={b.x} y={1920 - b.h} width={b.w} height={b.h} fill="#0A0A20" />
      ))}
      {/* Building windows */}
      {[...Array(40)].map((_, i) => (
        <rect key={i} x={20 + (i * 67) % 1000} y={1200 + (i * 43) % 600}
          width="12" height="16" rx="1" fill={accent} opacity={0.2 + (i % 4) * 0.15} />
      ))}
    </svg>
  ),
  gradient: (accent) => (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="gradBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A0A1A" />
          <stop offset="50%" stopColor="#1A0A3E" />
          <stop offset="100%" stopColor="#0A1A3E" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#gradBg)" />
      {/* Decorative circles */}
      <circle cx="200" cy="400" r="300" fill={accent} opacity="0.05" />
      <circle cx="900" cy="1500" r="400" fill={accent} opacity="0.05" />
      <circle cx="540" cy="960" r="200" fill={accent} opacity="0.03" />
    </svg>
  ),
  minimal: (accent) => (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <rect width="1080" height="1920" fill="#0A0A14" />
      <line x1="0" y1="1400" x2="1080" y2="1400" stroke={accent} strokeWidth="1" opacity="0.2" />
      <rect x="0" y="1400" width="1080" height="520" fill="#050510" />
    </svg>
  ),
};

// ─── SVG Character Components ─────────────────────────────────────────────────

function CharacterSVG({
  type,
  skinTone = 'medium',
  pose = 'standing',
  frame,
  fps,
  accentColor = '#6C63FF',
}: {
  type: CharacterType;
  skinTone?: SkinTone;
  pose?: Pose;
  frame: number;
  fps: number;
  accentColor?: string;
}) {
  const outfit = OUTFIT_COLORS[type];
  const skin = SKIN_TONES[skinTone];

  // Walking animation
  const walkCycle = Math.sin((frame / fps) * Math.PI * 3) * (pose === 'walking' ? 1 : 0);
  const armSwing = Math.sin((frame / fps) * Math.PI * 3) * (pose === 'walking' ? 15 : 0);

  // Breathing animation (subtle)
  const breathe = Math.sin((frame / fps) * Math.PI * 0.8) * 3;

  // Celebration animation
  const celebrateArm = pose === 'celebrating' ? Math.sin((frame / fps) * Math.PI * 4) * 20 : 0;

  // Thinking animation
  const thinkBob = pose === 'thinking' ? Math.sin((frame / fps) * Math.PI * 1.5) * 5 : 0;

  return (
    <svg viewBox="0 0 200 400" width="100%" height="100%">
      {/* Shadow */}
      <ellipse cx="100" cy="390" rx="60" ry="10" fill="black" opacity="0.3" />

      {/* Body group with breathing */}
      <g transform={`translate(0, ${breathe + thinkBob})`}>

        {/* ── LEGS ── */}
        {pose === 'walking' ? (
          <>
            <rect x="75" y="260" width="22" height="100" rx="11"
              fill={outfit.primary}
              transform={`rotate(${walkCycle * 20}, 86, 260)`} />
            <rect x="103" y="260" width="22" height="100" rx="11"
              fill={outfit.primary}
              transform={`rotate(${-walkCycle * 20}, 114, 260)`} />
          </>
        ) : (
          <>
            <rect x="75" y="260" width="22" height="100" rx="11" fill={outfit.primary} />
            <rect x="103" y="260" width="22" height="100" rx="11" fill={outfit.primary} />
          </>
        )}

        {/* Shoes */}
        <ellipse cx="86" cy="358" rx="18" ry="8" fill={outfit.secondary} />
        <ellipse cx="114" cy="358" rx="18" ry="8" fill={outfit.secondary} />

        {/* ── TORSO ── */}
        <rect x="65" y="160" width="70" height="105" rx="10" fill={outfit.primary} />

        {/* Shirt details based on type */}
        {type === 'businessman' && (
          <>
            {/* Tie */}
            <polygon points="100,165 95,175 100,230 105,175" fill={accentColor} />
            {/* Collar */}
            <polygon points="85,165 100,180 115,165 110,160 100,170 90,160" fill={outfit.secondary} />
            {/* Lapels */}
            <polygon points="65,165 90,165 85,185 65,175" fill={outfit.secondary} />
            <polygon points="115,165 135,165 135,175 115,185" fill={outfit.secondary} />
          </>
        )}
        {type === 'scientist' && (
          <>
            {/* Lab coat */}
            <rect x="65" y="160" width="70" height="105" rx="10" fill="#F0F0F0" />
            <rect x="65" y="160" width="20" height="105" rx="5" fill="#E0E0E0" />
            <rect x="115" y="160" width="20" height="105" rx="5" fill="#E0E0E0" />
            {/* Pocket */}
            <rect x="70" y="185" width="20" height="25" rx="3" fill="#D0D0D0" />
            {/* Pen in pocket */}
            <rect x="76" y="183" width="4" height="20" rx="2" fill={accentColor} />
          </>
        )}
        {type === 'developer' && (
          <>
            {/* Hoodie */}
            <rect x="65" y="160" width="70" height="105" rx="10" fill="#1E1E1E" />
            {/* Hood strings */}
            <line x1="95" y1="165" x2="90" y2="195" stroke="#333" strokeWidth="2" />
            <line x1="105" y1="165" x2="110" y2="195" stroke="#333" strokeWidth="2" />
            {/* Logo */}
            <text x="100" y="210" textAnchor="middle" fill={accentColor} fontSize="16">&lt;/&gt;</text>
          </>
        )}
        {type === 'doctor' && (
          <>
            <rect x="65" y="160" width="70" height="105" rx="10" fill="#FFFFFF" />
            <rect x="65" y="160" width="20" height="105" rx="5" fill="#E8E8E8" />
            <rect x="115" y="160" width="20" height="105" rx="5" fill="#E8E8E8" />
            {/* Stethoscope */}
            <path d="M 85 175 Q 100 200 115 175" fill="none" stroke={accentColor} strokeWidth="3" />
            <circle cx="100" cy="205" r="8" fill="none" stroke={accentColor} strokeWidth="2" />
          </>
        )}
        {type === 'teacher' && (
          <>
            <rect x="65" y="160" width="70" height="105" rx="10" fill={outfit.primary} />
            {/* Book */}
            <rect x="68" y="200" width="25" height="30" rx="2" fill={accentColor} />
            <line x1="80" y1="200" x2="80" y2="230" stroke="white" strokeWidth="1" />
          </>
        )}
        {type === 'entrepreneur' && (
          <>
            <rect x="65" y="160" width="70" height="105" rx="10" fill={outfit.primary} />
            {/* Casual blazer */}
            <polygon points="65,165 90,165 85,200 65,190" fill={outfit.secondary} />
            <polygon points="115,165 135,165 135,190 115,200" fill={outfit.secondary} />
            {/* T-shirt underneath */}
            <rect x="85" y="165" width="30" height="100" fill="#1A1A3E" />
          </>
        )}
        {type === 'athlete' && (
          <>
            <rect x="65" y="160" width="70" height="105" rx="10" fill={outfit.primary} />
            {/* Jersey number */}
            <text x="100" y="220" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">23</text>
            {/* Stripes */}
            <rect x="65" y="160" width="10" height="105" rx="5" fill={outfit.accent} />
            <rect x="125" y="160" width="10" height="105" rx="5" fill={outfit.accent} />
          </>
        )}
        {type === 'artist' && (
          <>
            <rect x="65" y="160" width="70" height="105" rx="10" fill={outfit.primary} />
            {/* Paint splatters */}
            <circle cx="80" cy="185" r="5" fill="#FF6B6B" opacity="0.8" />
            <circle cx="115" cy="200" r="4" fill="#4ECDC4" opacity="0.8" />
            <circle cx="95" cy="220" r="6" fill="#FFE66D" opacity="0.8" />
            {/* Beret */}
          </>
        )}

        {/* ── ARMS ── */}
        {pose === 'pointing' ? (
          <>
            {/* Left arm normal */}
            <rect x="40" y="165" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary} />
            {/* Right arm pointing forward */}
            <rect x="138" y="155" width="70" height="22" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform="rotate(-15, 138, 166)" />
            {/* Pointing hand */}
            <ellipse cx="205" cy="152" rx="12" ry="10" fill={skin.skin} />
            <rect x="210" y="145" width="8" height="18" rx="4" fill={skin.skin} />
          </>
        ) : pose === 'celebrating' ? (
          <>
            {/* Both arms up */}
            <rect x="35" y="130" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform={`rotate(${-40 + celebrateArm}, 46, 165)`} />
            <rect x="143" y="130" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform={`rotate(${40 - celebrateArm}, 154, 165)`} />
          </>
        ) : pose === 'presenting' ? (
          <>
            {/* Left arm slightly raised */}
            <rect x="40" y="155" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform="rotate(-20, 51, 165)" />
            {/* Right arm pointing up-right */}
            <rect x="138" y="140" width="22" height="75" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform="rotate(-45, 149, 165)" />
          </>
        ) : pose === 'thinking' ? (
          <>
            {/* Left arm down */}
            <rect x="40" y="165" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary} />
            {/* Right arm bent to chin */}
            <rect x="138" y="155" width="22" height="50" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform="rotate(-60, 149, 165)" />
          </>
        ) : (
          <>
            {/* Default arms */}
            <rect x="40" y="165" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform={`rotate(${armSwing}, 51, 165)`} />
            <rect x="138" y="165" width="22" height="70" rx="11"
              fill={type === 'scientist' || type === 'doctor' ? '#F0F0F0' : outfit.primary}
              transform={`rotate(${-armSwing}, 149, 165)`} />
          </>
        )}

        {/* Hands */}
        {pose !== 'pointing' && (
          <>
            <ellipse cx="51" cy="238" rx="13" ry="11" fill={skin.skin} />
            <ellipse cx="149" cy="238" rx="13" ry="11" fill={skin.skin} />
          </>
        )}

        {/* ── NECK ── */}
        <rect x="90" y="130" width="20" height="35" rx="10" fill={skin.skin} />

        {/* ── HEAD ── */}
        <ellipse cx="100" cy="110" rx="42" ry="48" fill={skin.skin} />

        {/* Hair based on type */}
        {type === 'businessman' && (
          <ellipse cx="100" cy="72" rx="42" ry="22" fill="#1A1A1A" />
        )}
        {type === 'entrepreneur' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#2C1810" />
            {/* Beard */}
            <ellipse cx="100" cy="135" rx="25" ry="12" fill="#2C1810" opacity="0.6" />
          </>
        )}
        {type === 'scientist' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#C0C0C0" />
            {/* Glasses */}
            <circle cx="85" cy="112" r="12" fill="none" stroke="#333" strokeWidth="2" />
            <circle cx="115" cy="112" r="12" fill="none" stroke="#333" strokeWidth="2" />
            <line x1="97" y1="112" x2="103" y2="112" stroke="#333" strokeWidth="2" />
          </>
        )}
        {type === 'developer' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#1A1A1A" />
            {/* Glasses */}
            <rect x="75" y="105" width="22" height="14" rx="4" fill="none" stroke={accentColor} strokeWidth="2" />
            <rect x="103" y="105" width="22" height="14" rx="4" fill="none" stroke={accentColor} strokeWidth="2" />
            <line x1="97" y1="112" x2="103" y2="112" stroke={accentColor} strokeWidth="2" />
          </>
        )}
        {type === 'doctor' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#4A3728" />
            {/* Doctor cap */}
            <rect x="60" y="65" width="80" height="12" rx="4" fill="#FFFFFF" />
            <rect x="75" y="55" width="50" height="14" rx="4" fill="#FFFFFF" />
            <circle cx="100" cy="62" r="5" fill={accentColor} />
          </>
        )}
        {type === 'teacher' && (
          <ellipse cx="100" cy="72" rx="42" ry="22" fill="#8B4513" />
        )}
        {type === 'athlete' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#1A1A1A" />
            {/* Headband */}
            <rect x="60" y="80" width="80" height="10" rx="5" fill={outfit.accent} />
          </>
        )}
        {type === 'artist' && (
          <>
            <ellipse cx="100" cy="72" rx="42" ry="22" fill="#4A0E5C" />
            {/* Beret */}
            <ellipse cx="100" cy="68" rx="45" ry="15" fill={outfit.primary} />
            <circle cx="118" cy="63" r="5" fill={outfit.primary} />
          </>
        )}

        {/* Face features */}
        {/* Eyes */}
        <ellipse cx="85" cy={type === 'scientist' || type === 'developer' ? 112 : 112} rx="6" ry="7" fill="white" />
        <ellipse cx="115" cy={type === 'scientist' || type === 'developer' ? 112 : 112} rx="6" ry="7" fill="white" />
        <circle cx="87" cy="113" r="4" fill="#1A1A1A" />
        <circle cx="117" cy="113" r="4" fill="#1A1A1A" />
        {/* Eye shine */}
        <circle cx="89" cy="111" r="1.5" fill="white" />
        <circle cx="119" cy="111" r="1.5" fill="white" />

        {/* Eyebrows */}
        <path d={pose === 'thinking' ? "M 78 100 Q 85 96 92 100" : "M 78 102 Q 85 98 92 102"}
          fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
        <path d={pose === 'thinking' ? "M 108 100 Q 115 96 122 100" : "M 108 102 Q 115 98 122 102"}
          fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />

        {/* Nose */}
        <path d="M 100 118 Q 95 128 100 130 Q 105 128 100 118"
          fill={skin.shadow} opacity="0.5" />

        {/* Mouth */}
        {pose === 'celebrating' ? (
          <path d="M 87 138 Q 100 150 113 138" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
        ) : pose === 'thinking' ? (
          <path d="M 90 138 Q 100 135 110 138" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M 88 138 Q 100 146 112 138" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Ear */}
        <ellipse cx="58" cy="112" rx="8" ry="12" fill={skin.skin} />
        <ellipse cx="142" cy="112" rx="8" ry="12" fill={skin.skin} />
      </g>

      {/* Props based on type */}
      {type === 'scientist' && pose === 'presenting' && (
        <g transform="translate(150, 200)">
          {/* Flask */}
          <rect x="0" y="0" width="20" height="30" rx="3" fill="none" stroke={accentColor} strokeWidth="2" />
          <rect x="5" y="-10" width="10" height="12" rx="2" fill="none" stroke={accentColor} strokeWidth="2" />
          <ellipse cx="10" cy="25" rx="8" ry="5" fill={accentColor} opacity="0.4" />
        </g>
      )}
      {type === 'developer' && pose === 'presenting' && (
        <g transform="translate(145, 190)">
          {/* Laptop */}
          <rect x="0" y="0" width="50" height="35" rx="3" fill="#1E1E1E" />
          <rect x="3" y="3" width="44" height="29" rx="2" fill="#252526" />
          <rect x="-5" y="35" width="60" height="5" rx="2" fill="#333" />
          {/* Code on screen */}
          <text x="5" y="15" fill={accentColor} fontSize="6">&gt; npm start</text>
          <text x="5" y="23" fill="#4EC9B0" fontSize="6">Server ready!</text>
        </g>
      )}
      {type === 'teacher' && pose === 'pointing' && (
        <g transform="translate(0, 150)">
          {/* Pointer stick */}
          <line x1="205" y1="-30" x2="205" y2="100" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────

function SpeechBubble({ text, frame, fps, accentColor }: { text: string; frame: number; fps: number; accentColor: string }) {
  const progress = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1]);

  return (
    <div style={{
      position: 'absolute', top: '8%', right: '5%',
      transform: `scale(${scale})`, opacity,
      transformOrigin: 'bottom left',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '16px 24px',
        maxWidth: 280, position: 'relative',
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 2px ${accentColor}`,
      }}>
        <p style={{
          margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A',
          fontFamily: 'sans-serif', lineHeight: 1.4,
        }}>{text}</p>
        {/* Tail */}
        <div style={{
          position: 'absolute', bottom: -20, left: 30,
          width: 0, height: 0,
          borderLeft: '15px solid transparent',
          borderRight: '15px solid transparent',
          borderTop: '20px solid white',
        }} />
      </div>
    </div>
  );
}

// ─── Stat Display ─────────────────────────────────────────────────────────────

function StatDisplay({ label, value, frame, fps, accentColor }: {
  label: string; value: string; frame: number; fps: number; accentColor: string;
}) {
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1]);

  return (
    <div style={{
      position: 'absolute', bottom: '8%', left: '50%',
      transform: `translateX(-50%) translateY(${translateY}px)`,
      opacity, textAlign: 'center',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
        border: `2px solid ${accentColor}`,
        borderRadius: 20, padding: '20px 40px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: accentColor,
          fontFamily: 'sans-serif', lineHeight: 1,
        }}>{value}</div>
        <div style={{
          fontSize: 22, color: 'rgba(255,255,255,0.8)',
          fontFamily: 'sans-serif', marginTop: 8,
        }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Name Badge ───────────────────────────────────────────────────────────────

function NameBadge({ name, title, frame, fps, accentColor }: {
  name?: string; title?: string; frame: number; fps: number; accentColor: string;
}) {
  if (!name && !title) return null;
  const progress = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const opacity = interpolate(progress, [0, 0.5], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div style={{
      position: 'absolute', bottom: '22%', left: '50%',
      transform: `translateX(-50%) translateY(${translateY}px)`,
      opacity, textAlign: 'center',
    }}>
      {name && (
        <div style={{
          fontSize: 36, fontWeight: 800, color: 'white',
          fontFamily: 'sans-serif', textShadow: `0 2px 10px ${accentColor}`,
        }}>{name}</div>
      )}
      {title && (
        <div style={{
          fontSize: 22, color: accentColor,
          fontFamily: 'sans-serif', marginTop: 4,
          letterSpacing: 2, textTransform: 'uppercase',
        }}>{title}</div>
      )}
    </div>
  );
}

// ─── Main Text Display ────────────────────────────────────────────────────────

function SceneText({ text, subtext, frame, fps }: {
  text?: string; subtext?: string; frame: number; fps: number;
}) {
  if (!text) return null;
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(progress, [0, 0.4], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div style={{
      position: 'absolute', top: '8%', left: '5%', right: '5%',
      opacity, transform: `translateY(${translateY}px)`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 48, fontWeight: 900, color: 'white',
        fontFamily: 'sans-serif', lineHeight: 1.2,
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>{text}</div>
      {subtext && (
        <div style={{
          fontSize: 26, color: 'rgba(255,255,255,0.7)',
          fontFamily: 'sans-serif', marginTop: 12,
        }}>{subtext}</div>
      )}
    </div>
  );
}

// ─── Single Scene ─────────────────────────────────────────────────────────────

function CharacterScene({
  scene,
  accentColor,
  background,
  characterName,
  characterTitle,
}: {
  scene: CharacterScene;
  accentColor: string;
  background: Background;
  characterName?: string;
  characterTitle?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const characterY = interpolate(enterProgress, [0, 1], [120, 0]);
  const characterOpacity = interpolate(enterProgress, [0, 0.3], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Background */}
      <AbsoluteFill>
        {BACKGROUNDS[background](accentColor)}
      </AbsoluteFill>

      {/* Character */}
      <AbsoluteFill style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: '18%',
        transform: `translateY(${characterY}px)`,
        opacity: characterOpacity,
      }}>
        <div style={{ width: '55%', maxWidth: 380 }}>
          <CharacterSVG
            type={scene.character}
            skinTone={scene.skinTone}
            pose={scene.pose}
            frame={frame}
            fps={fps}
            accentColor={accentColor}
          />
        </div>
      </AbsoluteFill>

      {/* Name Badge */}
      <NameBadge
        name={characterName}
        title={characterTitle}
        frame={Math.max(0, frame - 10)}
        fps={fps}
        accentColor={accentColor}
      />

      {/* Scene Text */}
      <SceneText
        text={scene.text}
        subtext={scene.subtext}
        frame={Math.max(0, frame - 5)}
        fps={fps}
      />

      {/* Speech Bubble */}
      {scene.bubbleText && (
        <SpeechBubble
          text={scene.bubbleText}
          frame={Math.max(0, frame - 15)}
          fps={fps}
          accentColor={accentColor}
        />
      )}

      {/* Stat Display */}
      {scene.stat && (
        <StatDisplay
          label={scene.stat.label}
          value={scene.stat.value}
          frame={Math.max(0, frame - 20)}
          fps={fps}
          accentColor={accentColor}
        />
      )}

      {/* Celebration particles */}
      {scene.pose === 'celebrating' && frame > 10 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const radius = interpolate(frame, [10, 60], [0, 300]);
            const opacity = interpolate(frame, [10, 50, 80], [0, 1, 0]);
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                top: `calc(40% + ${Math.sin(angle) * radius * 0.5}px)`,
                width: 12, height: 12,
                borderRadius: '50%',
                background: i % 2 === 0 ? accentColor : '#FFD700',
                opacity,
                transform: 'translate(-50%, -50%)',
              }} />
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ─── Main Composition ─────────────────────────────────────────────────────────

export const CharacterAnimation: React.FC<CharacterAnimationProps> = ({
  scenes = [],
  title,
  bgColor = '#0A0A14',
  accentColor = '#6C63FF',
  background = 'gradient',
  characterName,
  characterTitle,
}) => {
  const { fps } = useVideoConfig();
  const SCENE_DURATION = fps * 4; // 4 seconds per scene

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {scenes.map((scene, i) => {
        const sceneDuration = (scene.duration || 4) * fps;
        const startFrame = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 4) * fps, 0);
        return (
          <Sequence key={i} from={startFrame} durationInFrames={sceneDuration}>
            <CharacterScene
              scene={scene}
              accentColor={accentColor}
              background={background}
              characterName={characterName}
              characterTitle={characterTitle}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default CharacterAnimation;
