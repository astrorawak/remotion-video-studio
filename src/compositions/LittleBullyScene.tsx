import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// "The Little Bully" — fully fictional comedy short.
// A small-statured adult loudmouth tries to intimidate a tall, unbothered
// stranger in a park. Nobody gets hurt; the bully just gets a pat on the head
// and a bruised ego. Generic character designs only — no real people/events.
// ─────────────────────────────────────────────────────────────────────────────

interface LittleBullyProps {
  bullyTankTop?: string;
  bullyShorts?: string;
  accentColor?: string;
  skyTop?: string;
  skyBottom?: string;
}

// ─── Timing (13s @ 30fps = 390 frames) ────────────────────────────────────────
const BEAT_INTRO_END = 70; // title + bully swaggers in
const BEAT_CONFRONT_END = 190; // yelling / posturing
const BEAT_TWIST_END = 300; // pat on the head, dizzy bounce
// BEAT_MORAL: 300 -> 390

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ComicBurst({
  text,
  frame,
  start,
  x,
  y,
  color = '#FFD400',
  rotate = -8,
}: {
  text: string;
  frame: number;
  start: number;
  x: string;
  y: string;
  color?: string;
  rotate?: number;
}) {
  const local = frame - start;
  if (local < 0 || local > 40) return null;
  const pop = interpolate(local, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const fade = interpolate(local, [26, 40], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(pop, [0, 1], [0.3, 1]) * (1 + Math.sin(local / 3) * 0.02);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`,
        opacity: fade,
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 46,
        color,
        WebkitTextStroke: '3px #1A1A1A',
        letterSpacing: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
}

function SpeechBubble({
  text,
  frame,
  start,
  x,
  y,
}: {
  text: string;
  frame: number;
  start: number;
  x: string;
  y: string;
}) {
  const local = frame - start;
  if (local < 0 || local > 45) return null;
  const pop = interpolate(local, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const fade = interpolate(local, [32, 45], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(pop, [0, 1], [0.5, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${scale})`,
        opacity: fade,
        background: 'white',
        borderRadius: 18,
        padding: '14px 22px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        maxWidth: 320,
      }}
    >
      <div style={{ fontFamily: 'sans-serif', fontWeight: 800, fontSize: 26, color: '#1A1A1A', textAlign: 'center' }}>
        {text}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -14,
          left: '30%',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '16px solid white',
        }}
      />
    </div>
  );
}

// ─── Background: sunny park ───────────────────────────────────────────────────

function ParkBackground({ skyTop, skyBottom }: { skyTop: string; skyBottom: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#sky)" />
      {/* Sun */}
      <circle cx="860" cy="240" r="90" fill="#FFE066" opacity="0.9" />
      <circle cx="860" cy="240" r="120" fill="#FFE066" opacity="0.25" />
      {/* Clouds */}
      {[{ x: 180, y: 220 }, { x: 480, y: 160 }, { x: 300, y: 340 }].map((c, i) => (
        <g key={i} opacity="0.9">
          <ellipse cx={c.x} cy={c.y} rx="70" ry="30" fill="white" />
          <ellipse cx={c.x + 50} cy={c.y - 10} rx="50" ry="26" fill="white" />
          <ellipse cx={c.x - 50} cy={c.y + 5} rx="45" ry="24" fill="white" />
        </g>
      ))}
      {/* Distant tree line */}
      {[80, 220, 940, 1000].map((x, i) => (
        <g key={i}>
          <rect x={x - 8} y={880} width="16" height="90" fill="#6B4A2F" />
          <circle cx={x} cy={850} r="60" fill="#3F8F4F" />
          <circle cx={x - 30} cy={880} r="45" fill="#3A8248" />
          <circle cx={x + 30} cy={880} r="45" fill="#3A8248" />
        </g>
      ))}
      {/* Ground */}
      <rect x="0" y="960" width="1080" height="960" fill="#6FBF6A" />
      <rect x="0" y="960" width="1080" height="24" fill="#5CA859" />
      {/* Path */}
      <polygon points="380,1920 700,1920 620,960 460,960" fill="#D9C79E" opacity="0.85" />
      {/* Park bench (background prop, far right) */}
      <g transform="translate(830,1120)">
        <rect x="0" y="40" width="180" height="14" fill="#8B5A2B" />
        <rect x="0" y="0" width="180" height="14" fill="#8B5A2B" />
        <rect x="10" y="14" width="14" height="70" fill="#5C3A1E" />
        <rect x="156" y="14" width="14" height="70" fill="#5C3A1E" />
      </g>
    </svg>
  );
}

// ─── Character: Tall, Calm Person ─────────────────────────────────────────────

function TallCalmPerson({
  frame,
  fps,
  patBursts,
}: {
  frame: number;
  fps: number;
  patBursts: number[];
}) {
  const breathe = Math.sin((frame / fps) * Math.PI * 0.7) * 2;

  // Occasional calm eyebrow raise / sip during confrontation beat
  const sip = interpolate(frame, [100, 115, 130], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Arm-pat animation: nearest active burst determines arm angle
  let patAngle = 0;
  for (const start of patBursts) {
    const local = frame - start;
    if (local >= 0 && local < 14) {
      patAngle = Math.max(patAngle, interpolate(local, [0, 5, 14], [0, 55, 0]));
    }
  }

  return (
    <svg viewBox="0 0 220 600" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <g transform={`translate(0, ${breathe})`}>
        {/* Shadow */}
        <ellipse cx="110" cy="585" rx="70" ry="14" fill="black" opacity="0.2" />

        {/* Legs */}
        <rect x="80" y="380" width="26" height="180" rx="12" fill="#2B3A55" />
        <rect x="114" y="380" width="26" height="180" rx="12" fill="#2B3A55" />
        <ellipse cx="93" cy="562" rx="22" ry="10" fill="#1A1A1A" />
        <ellipse cx="127" cy="562" rx="22" ry="10" fill="#1A1A1A" />

        {/* Torso (long) */}
        <rect x="65" y="180" width="90" height="210" rx="16" fill="#33456A" />
        {/* Collar */}
        <polygon points="95,180 110,205 125,180 118,175 110,188 102,175" fill="#EDEDED" />

        {/* Left arm — calm, crossed */}
        <rect x="45" y="205" width="24" height="90" rx="12" fill="#33456A" transform="rotate(20, 57, 205)" />

        {/* Right arm — either resting or performing the "pat" */}
        <g transform={`rotate(${patAngle}, 151, 205)`}>
          <rect x="151" y="205" width="24" height="150" rx="12" fill="#33456A" />
          <ellipse cx="163" cy="360" rx="15" ry="13" fill="#E8B98A" />
        </g>

        {/* Coffee cup in left hand */}
        <g transform="translate(30, 275)">
          <ellipse cx="12" cy="0" rx="14" ry="12" fill="#E8B98A" />
          <rect x="0" y="-30" width="24" height="28" rx="4" fill="white" />
          <rect x="0" y="-30" width="24" height="6" fill="#33456A" />
        </g>

        {/* Neck + Head */}
        <rect x="98" y="140" width="24" height="40" rx="10" fill="#E8B98A" />
        <ellipse cx="110" cy="112" rx="46" ry="50" fill="#E8B98A" />
        {/* Neat hair */}
        <path d="M 64 100 Q 110 55 156 100 Q 156 75 110 70 Q 64 75 64 100" fill="#2B2320" />

        {/* Eyes — calm, half-lidded */}
        <path d="M 88 112 Q 96 108 104 112" fill="none" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
        <path d="M 116 112 Q 124 108 132 112" fill="none" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
        {/* Eyebrow raise (unbothered amusement) */}
        <path
          d={`M 86 ${98 - sip * 4} Q 96 ${92 - sip * 4} 106 ${98 - sip * 4}`}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Gentle smile */}
        <path d="M 92 138 Q 110 148 128 138" fill="none" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Character: The Little Bully (short, stocky, clearly adult) ──────────────

function LittleBully({
  frame,
  fps,
  tankTop,
  shorts,
  walkIn,
  posture,
  dizzy,
}: {
  frame: number;
  fps: number;
  tankTop: string;
  shorts: string;
  walkIn: number; // 0..1 progress
  posture: number; // 0..1 aggression amount (bounce/point)
  dizzy: boolean;
}) {
  const bounce = posture > 0 ? Math.abs(Math.sin((frame / fps) * Math.PI * 4)) * 10 * posture : 0;
  const pointAngle = interpolate(posture, [0, 1], [0, -70]);
  const mouthFlap = posture > 0 ? (Math.sin((frame / fps) * Math.PI * 8) + 1) / 2 : 0;
  const legShuffle = Math.sin((frame / fps) * Math.PI * (walkIn < 1 ? 6 : 2)) * (walkIn < 1 ? 12 : 2);
  const dizzySpin = dizzy ? (frame % 40) * 9 : 0;
  const squash = dizzy ? interpolate(Math.sin(frame / 4), [-1, 1], [0.94, 1.02]) : 1;

  return (
    <svg viewBox="0 0 200 260" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <g transform={`translate(0, ${-bounce}) scale(1, ${squash})`}>
        {/* Shadow */}
        <ellipse cx="100" cy="252" rx="55" ry="10" fill="black" opacity="0.25" />

        {/* Short stocky legs */}
        <rect x="70" y="185" width="24" height="55" rx="10" fill="#3A3A3A" transform={`rotate(${legShuffle}, 82, 185)`} />
        <rect x="106" y="185" width="24" height="55" rx="10" fill="#3A3A3A" transform={`rotate(${-legShuffle}, 118, 185)`} />
        <ellipse cx="82" cy="242" rx="20" ry="9" fill="#D64545" />
        <ellipse cx="118" cy="242" rx="20" ry="9" fill="#D64545" />

        {/* Wide stocky torso — yellow tank top */}
        <rect x="55" y="95" width="90" height="100" rx="18" fill={tankTop} />
        {/* Purple shorts */}
        <rect x="60" y="175" width="80" height="35" rx="10" fill={shorts} />
        {/* Chest hair tuft (adult signifier) */}
        <path d="M 90 108 Q 100 100 110 108" fill="none" stroke="#3A2A1E" strokeWidth="3" strokeLinecap="round" />

        {/* Arms */}
        {posture > 0.4 ? (
          <>
            {/* Pointing arm up at tall person */}
            <rect
              x="128"
              y="90"
              width="60"
              height="22"
              rx="11"
              fill="#D8A45C"
              transform={`rotate(${pointAngle}, 128, 101)`}
            />
            {/* Other fist clenched at hip */}
            <rect x="35" y="110" width="22" height="60" rx="11" fill="#D8A45C" />
            <circle cx="46" cy="176" r="14" fill="#C68642" />
          </>
        ) : (
          <>
            <rect x="35" y="110" width="22" height="60" rx="11" fill="#D8A45C" />
            <rect x="143" y="110" width="22" height="60" rx="11" fill="#D8A45C" />
          </>
        )}

        {/* Neck + oversized head (chibi-adult proportions) */}
        <rect x="88" y="68" width="24" height="30" rx="10" fill="#D8A45C" />
        <ellipse cx="100" cy="48" rx="50" ry="46" fill="#D8A45C" transform={`rotate(${dizzySpin * 0.05}, 100, 48)`} />

        {/* Spiky hair */}
        <polygon points="55,20 65,-5 75,20 90,-8 100,18 110,-8 125,20 135,-5 145,20 100,10" fill="#1A1A1A" />

        {/* Mustache (adult signifier) */}
        <path d="M 80 62 Q 100 72 120 62 Q 100 70 80 62" fill="#1A1A1A" />

        {/* Eyes */}
        {dizzy ? (
          <>
            <path d="M 82 40 q 6 -8 12 0 q -6 8 -12 0" stroke="#1A1A1A" strokeWidth="2.5" fill="none" />
            <path d="M 106 40 q 6 -8 12 0 q -6 8 -12 0" stroke="#1A1A1A" strokeWidth="2.5" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="88" cy="42" rx="6" ry="7" fill="white" />
            <ellipse cx="112" cy="42" rx="6" ry="7" fill="white" />
            <circle cx="90" cy="43" r="4" fill="#1A1A1A" />
            <circle cx="114" cy="43" r="4" fill="#1A1A1A" />
          </>
        )}

        {/* Angry eyebrows */}
        <path d="M 78 26 L 96 32" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />
        <path d="M 122 26 L 104 32" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />

        {/* Mouth — flapping while yelling, flat/dazed when dizzy */}
        {dizzy ? (
          <path d="M 88 60 Q 100 58 112 60" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <ellipse cx="100" cy="60" rx="16" ry={6 + mouthFlap * 10} fill="#7A1F1F" />
        )}
      </g>
    </svg>
  );
}

// ─── Title / Moral cards ───────────────────────────────────────────────────────

function TitleCard({ frame, accentColor }: { frame: number; accentColor: string }) {
  const opacity = interpolate(frame, [0, 15, 55, 70], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, 15], [-30, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: '8%', left: 0, right: 0, textAlign: 'center', opacity, transform: `translateY(${translateY}px)` }}>
      <div
        style={{
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: 68,
          color: 'white',
          WebkitTextStroke: `3px ${accentColor}`,
          letterSpacing: 2,
        }}
      >
        THE LITTLE BULLY
      </div>
    </div>
  );
}

function MoralCard({ frame, accentColor }: { frame: number; accentColor: string }) {
  const progress = spring({ frame, fps: 30, config: { damping: 14, stiffness: 90 } });
  const overlayOpacity = interpolate(frame, [0, 15], [0, 0.72], { extrapolateRight: 'clamp' });
  const scale = interpolate(progress, [0, 1], [0.7, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1]);
  const ctaOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `rgba(10,10,20,${overlayOpacity})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', transform: `scale(${scale})`, opacity, padding: '0 60px' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 26, color: accentColor, letterSpacing: 4, fontWeight: 800, marginBottom: 10 }}>
          MORAL OF THE STORY
        </div>
        <div style={{ fontFamily: 'sans-serif', fontSize: 48, color: 'white', fontWeight: 900, lineHeight: 1.25 }}>
          Confidence isn&apos;t the same as courage.
        </div>
        <div style={{ fontFamily: 'sans-serif', fontSize: 26, color: 'rgba(255,255,255,0.75)', marginTop: 24, opacity: ctaOpacity }}>
          😄 Follow for more!
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Main Composition ─────────────────────────────────────────────────────────

export const LittleBullyScene: React.FC<LittleBullyProps> = ({
  bullyTankTop = '#FFD400',
  bullyShorts = '#7B3FA0',
  accentColor = '#FF6B6B',
  skyTop = '#6FC3E8',
  skyBottom = '#BFE8FF',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const walkIn = interpolate(frame, [0, BEAT_INTRO_END], [0, 1], { extrapolateRight: 'clamp' });
  // Bully x position: swaggers in from off-screen right to just in front of the tall person
  const bullyX = interpolate(walkIn, [0, 1], [980, 560]);

  const posture = interpolate(frame, [BEAT_INTRO_END, BEAT_INTRO_END + 20, BEAT_CONFRONT_END], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const postureFadeOut = interpolate(frame, [BEAT_CONFRONT_END, BEAT_CONFRONT_END + 15], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const activePosture = frame < BEAT_CONFRONT_END ? posture : posture * postureFadeOut;

  const patBursts = [200, 226, 252];
  const dizzy = frame >= 252 && frame < BEAT_TWIST_END + 20;

  // Bully deflates/sits after the last pat
  const deflate = interpolate(frame, [262, 290], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bullyScale = 1 - deflate * 0.12;
  const bullyDropY = deflate * 30;

  return (
    <AbsoluteFill style={{ background: skyBottom }}>
      <ParkBackground skyTop={skyTop} skyBottom={skyBottom} />

      {/* Tall calm person — fixed position, stage left */}
      <div style={{ position: 'absolute', left: 220, top: 560, width: 260, height: 700 }}>
        <TallCalmPerson frame={frame} fps={fps} patBursts={patBursts} />
      </div>

      {/* The little bully — walks in, postures, gets patted */}
      <div
        style={{
          position: 'absolute',
          left: bullyX,
          top: 1180 + bullyDropY,
          width: 220,
          height: 280,
          transform: `translateX(-50%) scale(${bullyScale})`,
        }}
      >
        <LittleBully
          frame={frame}
          fps={fps}
          tankTop={bullyTankTop}
          shorts={bullyShorts}
          walkIn={walkIn}
          posture={activePosture}
          dizzy={dizzy}
        />
      </div>

      {/* Title card */}
      <TitleCard frame={frame} accentColor={accentColor} />

      {/* Confrontation dialogue */}
      <SpeechBubble text="HEY YOU!" frame={frame} start={78} x="46%" y="52%" />
      <SpeechBubble text="THINK YOU'RE TOUGH?!" frame={frame} start={120} x="46%" y="52%" />
      <SpeechBubble text="I'LL SHOW YOU!" frame={frame} start={158} x="46%" y="52%" />
      <ComicBurst text="YAP YAP YAP" frame={frame} start={95} x="50%" y="46%" color="#FF6B6B" />

      {/* Pat-on-the-head bursts */}
      {patBursts.map((start, i) => (
        <ComicBurst key={i} text="PAT!" frame={frame} start={start} x="42%" y="60%" color="#7BD389" rotate={i % 2 ? 8 : -8} />
      ))}
      <ComicBurst text="BOING~" frame={frame} start={266} x="46%" y="55%" color="#FFD400" rotate={-4} />

      {/* Moral outro overlay */}
      {frame >= BEAT_TWIST_END && <MoralCard frame={frame - BEAT_TWIST_END} accentColor={accentColor} />}
    </AbsoluteFill>
  );
};

export default LittleBullyScene;
