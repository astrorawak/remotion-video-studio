import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
} from 'remotion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExplainerScene =
  | { type: 'intro'; title: string; subtitle?: string; icon?: string; bgColor?: string; accentColor?: string }
  | { type: 'stat'; label: string; value: number; unit?: string; icon?: string; description?: string; accentColor?: string }
  | { type: 'comparison'; leftLabel: string; leftValue: number; rightLabel: string; rightValue: number; title?: string; unit?: string; accentColor?: string }
  | { type: 'progress'; label: string; percentage: number; description?: string; icon?: string; accentColor?: string }
  | { type: 'countdown'; from: number; to: number; label: string; unit?: string; accentColor?: string }
  | { type: 'list'; title: string; items: string[]; icon?: string; accentColor?: string }
  | { type: 'orbit'; centerLabel: string; orbitLabel: string; fact: string; accentColor?: string }
  | { type: 'timeline'; events: Array<{ year: string; label: string }>; title?: string; accentColor?: string }
  | { type: 'fact'; headline: string; body: string; icon?: string; accentColor?: string }
  | { type: 'outro'; title: string; subtitle?: string; cta?: string; accentColor?: string };

export interface ExplainerVideoProps {
  topic: string;
  scenes: ExplainerScene[];
  bgColor?: string;
  accentColor?: string;
  fontStyle?: 'modern' | 'bold' | 'minimal';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const useSpring = (frame: number, delay = 0, stiffness = 120) =>
  spring({ frame: frame - delay, fps: 30, config: { stiffness, damping: 14, mass: 1 }, durationInFrames: 40 });

const useFade = (frame: number, delay = 0, duration = 20) =>
  interpolate(frame, [delay, delay + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const useCountUp = (frame: number, from: number, to: number, startFrame = 0, duration = 60) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return Math.round(from + (to - from) * progress);
};

// ─── Scene Components ─────────────────────────────────────────────────────────

const IntroScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'intro' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const titleSpring = useSpring(frame, 5);
  const subtitleFade = useFade(frame, 20);
  const iconSpring = useSpring(frame, 0, 80);
  const float = Math.sin(frame / 20) * 6;

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      
      {scene.icon && (
        <div style={{ fontSize: 100, marginBottom: 30, transform: `scale(${iconSpring}) translateY(${float}px)` }}>
          {scene.icon}
        </div>
      )}
      <div style={{
        fontSize: 72, fontWeight: 900, color: '#FFFFFF', textAlign: 'center',
        transform: `scale(${titleSpring})`, letterSpacing: '-2px', lineHeight: 1.1,
        textShadow: `0 0 60px ${accent}88`, maxWidth: 900, padding: '0 40px',
      }}>
        {scene.title}
      </div>
      {scene.subtitle && (
        <div style={{ fontSize: 28, color: `${accent}`, marginTop: 20, opacity: subtitleFade, letterSpacing: 4, textTransform: 'uppercase' }}>
          {scene.subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const StatScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'stat' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const countedValue = useCountUp(frame, 0, scene.value, 10, 70);
  const labelFade = useFade(frame, 5);
  const valueFade = useFade(frame, 10);
  const descFade = useFade(frame, 50);
  const iconSpring = useSpring(frame, 0, 80);
  const float = Math.sin(frame / 18) * 5;

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      
      {scene.icon && (
        <div style={{ fontSize: 80, marginBottom: 20, transform: `scale(${iconSpring}) translateY(${float}px)` }}>
          {scene.icon}
        </div>
      )}
      <div style={{ opacity: labelFade, fontSize: 22, color: accent, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 16 }}>
        {scene.label}
      </div>
      <div style={{ opacity: valueFade, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 120, fontWeight: 900, color: '#FFFFFF', lineHeight: 1, textShadow: `0 0 40px ${accent}66` }}>
          {countedValue.toLocaleString()}
        </span>
        {scene.unit && <span style={{ fontSize: 36, color: accent, fontWeight: 600 }}>{scene.unit}</span>}
      </div>
      {scene.description && (
        <div style={{ opacity: descFade, fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 20, textAlign: 'center', maxWidth: 600 }}>
          {scene.description}
        </div>
      )}
    </AbsoluteFill>
  );
};

const ComparisonScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'comparison' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const titleFade = useFade(frame, 5);
  const leftSpring = useSpring(frame, 15);
  const rightSpring = useSpring(frame, 30);
  const max = Math.max(scene.leftValue, scene.rightValue);
  const leftH = (scene.leftValue / max) * 260;
  const rightH = (scene.rightValue / max) * 260;
  const leftCount = useCountUp(frame, 0, scene.leftValue, 15, 60);
  const rightCount = useCountUp(frame, 0, scene.rightValue, 30, 60);

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {scene.title && (
        <div style={{ opacity: titleFade, fontSize: 32, color: '#FFFFFF', fontWeight: 700, marginBottom: 50, letterSpacing: 2 }}>
          {scene.title}
        </div>
      )}
      <div style={{ display: 'flex', gap: 80, alignItems: 'flex-end' }}>
        {/* Left bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF' }}>{leftCount.toLocaleString()}{scene.unit && <span style={{ fontSize: 18, color: accent }}> {scene.unit}</span>}</div>
          <div style={{ width: 120, height: leftH * leftSpring, background: `linear-gradient(to top, ${accent}, ${accent}88)`, borderRadius: '8px 8px 0 0', minHeight: 4 }} />
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 140 }}>{scene.leftLabel}</div>
        </div>
        {/* Right bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF' }}>{rightCount.toLocaleString()}{scene.unit && <span style={{ fontSize: 18, color: accent }}> {scene.unit}</span>}</div>
          <div style={{ width: 120, height: rightH * rightSpring, background: `linear-gradient(to top, #FF6B6B, #FF6B6B88)`, borderRadius: '8px 8px 0 0', minHeight: 4 }} />
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 140 }}>{scene.rightLabel}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProgressScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'progress' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const labelFade = useFade(frame, 5);
  const barProgress = interpolate(frame, [15, 75], [0, scene.percentage / 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const countedPct = useCountUp(frame, 0, scene.percentage, 15, 60);
  const descFade = useFade(frame, 60);
  const iconSpring = useSpring(frame, 0, 80);

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
      {scene.icon && (
        <div style={{ fontSize: 70, marginBottom: 24, transform: `scale(${iconSpring})` }}>{scene.icon}</div>
      )}
      <div style={{ opacity: labelFade, fontSize: 28, color: accent, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 30 }}>
        {scene.label}
      </div>
      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 800, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: '100%', width: `${barProgress * 100}%`, background: `linear-gradient(to right, ${accent}, ${accent}cc)`, borderRadius: 12, boxShadow: `0 0 20px ${accent}88` }} />
      </div>
      <div style={{ fontSize: 80, fontWeight: 900, color: '#FFFFFF', marginTop: 24, textShadow: `0 0 40px ${accent}66` }}>
        {countedPct}%
      </div>
      {scene.description && (
        <div style={{ opacity: descFade, fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 16, textAlign: 'center' }}>
          {scene.description}
        </div>
      )}
    </AbsoluteFill>
  );
};

const CountdownScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'countdown' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const counted = useCountUp(frame, scene.from, scene.to, 10, 70);
  const labelFade = useFade(frame, 5);
  const ring = interpolate(frame, [10, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const circumference = 2 * Math.PI * 120;

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: 300, height: 300, marginBottom: 30 }}>
        <svg width="300" height="300" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="150" cy="150" r="120" fill="none" stroke={accent} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ring)}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 12px ${accent})` }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{counted.toLocaleString()}</div>
          {scene.unit && <div style={{ fontSize: 20, color: accent, letterSpacing: 2 }}>{scene.unit}</div>}
        </div>
      </div>
      <div style={{ opacity: labelFade, fontSize: 28, color: 'rgba(255,255,255,0.8)', letterSpacing: 3, textTransform: 'uppercase' }}>
        {scene.label}
      </div>
    </AbsoluteFill>
  );
};

const ListScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'list' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const titleFade = useFade(frame, 5);

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
      <div style={{ opacity: titleFade, fontSize: 36, fontWeight: 800, color: '#FFFFFF', marginBottom: 40, textAlign: 'center', letterSpacing: 1 }}>
        {scene.icon && <span style={{ marginRight: 16 }}>{scene.icon}</span>}
        {scene.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 800 }}>
        {scene.items.map((item, i) => {
          const itemSpring = useSpring(frame, 15 + i * 12);
          const itemFade = useFade(frame, 15 + i * 12);
          return (
            <div key={i} style={{
              opacity: itemFade,
              transform: `translateX(${interpolate(itemSpring, [0, 1], [-60, 0])}px)`,
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px 24px',
              borderLeft: `4px solid ${accent}`,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 22, color: '#FFFFFF', fontWeight: 500 }}>{item}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const OrbitScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'orbit' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 90], [0, 360], { extrapolateRight: 'clamp' });
  const rad = (angle * Math.PI) / 180;
  const orbitR = 160;
  const ox = Math.cos(rad) * orbitR;
  const oy = Math.sin(rad) * orbitR;
  const centerSpring = useSpring(frame, 5, 100);
  const factFade = useFade(frame, 50);

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 400, height: 400, marginBottom: 30 }}>
        {/* Orbit ring */}
        <svg width="400" height="400" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx="200" cy="200" r={orbitR} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="6 4" />
        </svg>
        {/* Center */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${centerSpring})`, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${accent}, ${accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#000', textAlign: 'center', boxShadow: `0 0 30px ${accent}88` }}>
          {scene.centerLabel}
        </div>
        {/* Orbiting body */}
        <div style={{ position: 'absolute', top: `calc(50% + ${oy}px)`, left: `calc(50% + ${ox}px)`, transform: 'translate(-50%, -50%)', width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle, #FF6B6B, #CC3333)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFF', textAlign: 'center', boxShadow: '0 0 20px #FF6B6B88' }}>
          {scene.orbitLabel}
        </div>
      </div>
      <div style={{ opacity: factFade, fontSize: 26, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 700, lineHeight: 1.5 }}>
        {scene.fact}
      </div>
    </AbsoluteFill>
  );
};

const TimelineScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'timeline' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const titleFade = useFade(frame, 5);
  const lineProgress = interpolate(frame, [15, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
      {scene.title && (
        <div style={{ opacity: titleFade, fontSize: 32, fontWeight: 800, color: '#FFFFFF', marginBottom: 40, letterSpacing: 2 }}>
          {scene.title}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
        {/* Timeline line */}
        <div style={{ position: 'absolute', top: 20, left: 0, height: 3, width: `${lineProgress * 100}%`, background: `linear-gradient(to right, ${accent}, ${accent}88)`, borderRadius: 2 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 0 }}>
          {scene.events.map((ev, i) => {
            const dotSpring = useSpring(frame, 20 + i * 10);
            const textFade = useFade(frame, 30 + i * 10);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: accent, transform: `scale(${dotSpring})`, boxShadow: `0 0 12px ${accent}` }} />
                <div style={{ opacity: textFade, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: accent }}>{ev.year}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 100 }}>{ev.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FactScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'fact' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const iconSpring = useSpring(frame, 0, 100);
  const headlineFade = useFade(frame, 15);
  const bodyFade = useFade(frame, 35);
  const float = Math.sin(frame / 20) * 5;

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      {scene.icon && (
        <div style={{ fontSize: 80, marginBottom: 24, transform: `scale(${iconSpring}) translateY(${float}px)` }}>
          {scene.icon}
        </div>
      )}
      <div style={{ opacity: headlineFade, fontSize: 52, fontWeight: 900, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.2, marginBottom: 24, textShadow: `0 0 40px ${accent}55` }}>
        {scene.headline}
      </div>
      <div style={{ opacity: bodyFade, fontSize: 24, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.6, maxWidth: 800 }}>
        {scene.body}
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ scene: Extract<ExplainerScene, { type: 'outro' }>; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const frame = useCurrentFrame();
  const titleSpring = useSpring(frame, 5, 80);
  const subtitleFade = useFade(frame, 25);
  const ctaSpring = useSpring(frame, 45, 120);
  const float = Math.sin(frame / 18) * 6;

  return (
    <AbsoluteFill style={{ background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <div style={{ fontSize: 72, fontWeight: 900, color: '#FFFFFF', textAlign: 'center', transform: `scale(${titleSpring}) translateY(${float}px)`, textShadow: `0 0 60px ${accent}88`, letterSpacing: '-2px', maxWidth: 900, padding: '0 40px' }}>
        {scene.title}
      </div>
      {scene.subtitle && (
        <div style={{ opacity: subtitleFade, fontSize: 26, color: accent, marginTop: 20, letterSpacing: 4, textTransform: 'uppercase' }}>
          {scene.subtitle}
        </div>
      )}
      {scene.cta && (
        <div style={{ transform: `scale(${ctaSpring})`, marginTop: 40, background: accent, color: '#000', padding: '16px 48px', borderRadius: 50, fontSize: 22, fontWeight: 800, letterSpacing: 1, boxShadow: `0 0 40px ${accent}88` }}>
          {scene.cta}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Scene Wrapper ────────────────────────────────────────────────────────────

const SCENE_DURATION = 90; // 3 seconds at 30fps

const SceneWrapper: React.FC<{ scene: ExplainerScene; accent: string; bg: string }> = ({ scene, accent, bg }) => {
  const sceneAccent = (scene as any).accentColor || accent;
  switch (scene.type) {
    case 'intro': return <IntroScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'stat': return <StatScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'comparison': return <ComparisonScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'progress': return <ProgressScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'countdown': return <CountdownScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'list': return <ListScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'orbit': return <OrbitScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'timeline': return <TimelineScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'fact': return <FactScene scene={scene} accent={sceneAccent} bg={bg} />;
    case 'outro': return <OutroScene scene={scene} accent={sceneAccent} bg={bg} />;
    default: return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ExplainerVideoScene: React.FC<ExplainerVideoProps> = ({
  topic,
  scenes,
  bgColor = '#0A0A14',
  accentColor = '#6C63FF',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: bgColor, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * SCENE_DURATION} durationInFrames={SCENE_DURATION}>
          <SceneWrapper scene={scene} accent={accentColor} bg={bgColor} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
