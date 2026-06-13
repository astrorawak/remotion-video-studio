import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
  Img,
} from 'remotion';

// ─── Types ──────────────────────────────────────────────────────────────────
// Workflow Explainer: ubah sebuah workflow/infografis menjadi video animasi
// step-by-step yang menjelaskan setiap langkah. Dirancang agar pas dipadukan
// dengan narasi text-to-speech (TTS) di CapCut.

export type WorkflowScene =
  | {
      type: 'intro';
      title: string;
      subtitle?: string;
      icon?: string;
      badge?: string;
      duration?: number;
    }
  | {
      type: 'step';
      stepNumber: number | string;
      title: string;
      description?: string;
      points?: string[];
      icon?: string;
      tools?: string[];
      duration?: number;
    }
  | {
      type: 'connector';
      text?: string;
      duration?: number;
    }
  | {
      type: 'summary';
      title?: string;
      steps: string[];
      duration?: number;
    }
  | {
      type: 'outro';
      title: string;
      subtitle?: string;
      cta?: string;
      handle?: string;
      duration?: number;
    };

export interface WorkflowExplainerProps {
  topic?: string;
  scenes: WorkflowScene[];
  bgColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  brandName?: string;
  referenceImageUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const useSpringVal = (frame: number, delay = 0, stiffness = 120, fps = 30) =>
  spring({ frame: frame - delay, fps, config: { stiffness, damping: 16, mass: 1 }, durationInFrames: 40 });

const useFade = (frame: number, delay = 0, duration = 18) =>
  interpolate(frame, [delay, delay + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Subtle animated background: grid + soft glow (terasa premium, tidak murahan)
const AnimatedBackground: React.FC<{ accent: string; secondary: string; bg: string }> = ({ accent, secondary, bg }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 30;
  const drift2 = Math.cos(frame / 80) * 40;
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      {/* soft glows */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, top: `${20 + drift / 10}%`, left: `${10 + drift / 12}%`, filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${secondary}1A 0%, transparent 70%)`, bottom: `${10 + drift2 / 12}%`, right: `${5 + drift2 / 14}%`, filter: 'blur(20px)' }} />
      {/* faint grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${accent}0A 1px, transparent 1px), linear-gradient(90deg, ${accent}0A 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
      }} />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.04, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id="wf-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 10} />
        </filter>
        <rect width="100%" height="100%" filter="url(#wf-noise)" />
      </svg>
    </AbsoluteFill>
  );
};

const BrandTag: React.FC<{ brandName?: string; accent: string }> = ({ brandName, accent }) => {
  if (!brandName) return null;
  return (
    <div style={{ position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <div style={{ width: 14, height: 14, borderRadius: 4, background: accent, boxShadow: `0 0 16px ${accent}` }} />
      <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 3, textTransform: 'uppercase' }}>{brandName}</span>
    </div>
  );
};

// ─── Scene Components ───────────────────────────────────────────────────────────

const IntroScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'intro' }>; accent: string; secondary: string; brandName?: string }> = ({ scene, accent, secondary, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const isPortrait = useVideoConfig().height > width;
  const titleSpring = useSpringVal(frame, 6, 110, fps);
  const subFade = useFade(frame, 24);
  const iconSpring = useSpringVal(frame, 0, 90, fps);
  const badgeFade = useFade(frame, 2);
  const float = Math.sin(frame / 22) * 6;

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isPortrait ? '0 80px' : '0 140px' }}>
      <BrandTag brandName={brandName} accent={accent} />
      {scene.badge && (
        <div style={{ opacity: badgeFade, marginBottom: 28, padding: '10px 26px', borderRadius: 999, border: `1.5px solid ${accent}`, background: `${accent}1A`, color: accent, fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
          {scene.badge}
        </div>
      )}
      {scene.icon && (
        <div style={{ fontSize: isPortrait ? 120 : 100, marginBottom: 28, transform: `scale(${iconSpring}) translateY(${float}px)` }}>{scene.icon}</div>
      )}
      <div style={{ fontSize: isPortrait ? 92 : 84, fontWeight: 900, color: '#fff', textAlign: 'center', transform: `scale(${titleSpring})`, letterSpacing: '-2px', lineHeight: 1.05, textShadow: `0 0 70px ${accent}77`, maxWidth: 1100 }}>
        {scene.title}
      </div>
      {scene.subtitle && (
        <div style={{ opacity: subFade, fontSize: isPortrait ? 34 : 30, color: secondary, marginTop: 26, letterSpacing: 2, textAlign: 'center', maxWidth: 900, fontWeight: 500 }}>
          {scene.subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const StepScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'step' }>; accent: string; secondary: string; brandName?: string }> = ({ scene, accent, secondary, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const numSpring = useSpringVal(frame, 2, 100, fps);
  const titleFade = useFade(frame, 12);
  const titleSlide = interpolate(useSpringVal(frame, 12, 120, fps), [0, 1], [40, 0]);
  const descFade = useFade(frame, 28);
  const iconSpring = useSpringVal(frame, 4, 90, fps);

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isPortrait ? '0 90px' : '0 160px' }}>
      <BrandTag brandName={brandName} accent={accent} />

      {/* Step number badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 40 }}>
        <div style={{
          transform: `scale(${numSpring})`,
          width: isPortrait ? 130 : 120, height: isPortrait ? 130 : 120, borderRadius: 30,
          background: `linear-gradient(135deg, ${accent}, ${secondary})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isPortrait ? 64 : 58, fontWeight: 900, color: '#fff',
          boxShadow: `0 18px 50px ${accent}55`, flexShrink: 0,
        }}>
          {scene.stepNumber}
        </div>
        {scene.icon && (
          <div style={{ fontSize: isPortrait ? 84 : 76, transform: `scale(${iconSpring})` }}>{scene.icon}</div>
        )}
      </div>

      {/* Title */}
      <div style={{ opacity: titleFade, transform: `translateY(${titleSlide}px)`, fontSize: isPortrait ? 70 : 64, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 24, textShadow: `0 0 40px ${accent}44`, maxWidth: 1100 }}>
        {scene.title}
      </div>

      {/* Description */}
      {scene.description && (
        <div style={{ opacity: descFade, fontSize: isPortrait ? 34 : 30, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, maxWidth: 1000, marginBottom: 28 }}>
          {scene.description}
        </div>
      )}

      {/* Points (muncul satu per satu) */}
      {scene.points && scene.points.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000 }}>
          {scene.points.map((p, i) => {
            const delay = 38 + i * 14;
            const pFade = useFade(frame, delay);
            const pSlide = interpolate(useSpringVal(frame, delay, 140, fps), [0, 1], [-50, 0]);
            return (
              <div key={i} style={{ opacity: pFade, transform: `translateX(${pSlide}px)`, display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: isPortrait ? '20px 26px' : '18px 26px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: accent, boxShadow: `0 0 12px ${accent}`, flexShrink: 0 }} />
                <span style={{ fontSize: isPortrait ? 30 : 27, color: '#fff', fontWeight: 500 }}>{p}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tools chips */}
      {scene.tools && scene.tools.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
          {scene.tools.map((t, i) => {
            const delay = 38 + (scene.points?.length || 0) * 14 + i * 10;
            const cFade = useFade(frame, delay);
            const cScale = useSpringVal(frame, delay, 160, fps);
            return (
              <div key={i} style={{ opacity: cFade, transform: `scale(${cScale})`, padding: '12px 24px', borderRadius: 999, background: `${secondary}22`, border: `1.5px solid ${secondary}`, color: '#fff', fontSize: isPortrait ? 26 : 23, fontWeight: 700 }}>
                {t}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const ConnectorScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'connector' }>; accent: string; secondary: string }> = ({ scene, accent, secondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arrowProg = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const textFade = useFade(frame, 8);
  const pulse = 1 + Math.sin(frame / 8) * 0.06;

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${pulse})` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 0, height: 0,
            borderLeft: '26px solid transparent', borderRight: '26px solid transparent',
            borderTop: `34px solid ${accent}`,
            opacity: interpolate(arrowProg, [i * 0.25, i * 0.25 + 0.3], [0.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            filter: `drop-shadow(0 0 12px ${accent}88)`,
          }} />
        ))}
      </div>
      {scene.text && (
        <div style={{ opacity: textFade, fontSize: 38, fontWeight: 700, color: secondary, letterSpacing: 2, textAlign: 'center', maxWidth: 800 }}>
          {scene.text}
        </div>
      )}
    </AbsoluteFill>
  );
};

const SummaryScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'summary' }>; accent: string; secondary: string; brandName?: string }> = ({ scene, accent, secondary, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const titleFade = useFade(frame, 5);

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isPortrait ? '0 90px' : '0 160px' }}>
      <BrandTag brandName={brandName} accent={accent} />
      <div style={{ opacity: titleFade, fontSize: isPortrait ? 60 : 54, fontWeight: 900, color: '#fff', marginBottom: 44, textAlign: 'center', letterSpacing: '-1px' }}>
        {scene.title || 'Recap'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: 1000 }}>
        {scene.steps.map((s, i) => {
          const delay = 14 + i * 12;
          const f = useFade(frame, delay);
          const sc = useSpringVal(frame, delay, 140, fps);
          return (
            <div key={i} style={{ opacity: f, transform: `scale(${sc})`, display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: isPortrait ? '22px 28px' : '20px 28px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${accent}, ${secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: isPortrait ? 32 : 28, color: '#fff', fontWeight: 600 }}>{s}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'outro' }>; accent: string; secondary: string; brandName?: string }> = ({ scene, accent, secondary, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const titleSpring = useSpringVal(frame, 6, 90, fps);
  const subFade = useFade(frame, 26);
  const ctaSpring = useSpringVal(frame, 46, 130, fps);
  const float = Math.sin(frame / 18) * 6;

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
      <BrandTag brandName={brandName} accent={accent} />
      <div style={{ fontSize: isPortrait ? 80 : 72, fontWeight: 900, color: '#fff', textAlign: 'center', transform: `scale(${titleSpring}) translateY(${float}px)`, textShadow: `0 0 60px ${accent}88`, letterSpacing: '-2px', maxWidth: 1000 }}>
        {scene.title}
      </div>
      {scene.subtitle && (
        <div style={{ opacity: subFade, fontSize: isPortrait ? 32 : 28, color: 'rgba(255,255,255,0.7)', marginTop: 22, textAlign: 'center', maxWidth: 800 }}>
          {scene.subtitle}
        </div>
      )}
      {scene.cta && (
        <div style={{ transform: `scale(${ctaSpring})`, marginTop: 42, background: `linear-gradient(135deg, ${accent}, ${secondary})`, color: '#fff', padding: '18px 52px', borderRadius: 999, fontSize: 26, fontWeight: 800, letterSpacing: 1, boxShadow: `0 0 50px ${accent}99` }}>
          {scene.cta}
        </div>
      )}
      {scene.handle && (
        <div style={{ opacity: subFade, marginTop: 28, fontSize: 26, color: accent, fontWeight: 700, letterSpacing: 1 }}>
          {scene.handle}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Scene Wrapper ──────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 120; // 4s @ 30fps — longgar untuk narasi TTS

const SceneRouter: React.FC<{ scene: WorkflowScene; accent: string; secondary: string; brandName?: string }> = ({ scene, accent, secondary, brandName }) => {
  switch (scene.type) {
    case 'intro': return <IntroScene scene={scene} accent={accent} secondary={secondary} brandName={brandName} />;
    case 'step': return <StepScene scene={scene} accent={accent} secondary={secondary} brandName={brandName} />;
    case 'connector': return <ConnectorScene scene={scene} accent={accent} secondary={secondary} />;
    case 'summary': return <SummaryScene scene={scene} accent={accent} secondary={secondary} brandName={brandName} />;
    case 'outro': return <OutroScene scene={scene} accent={accent} secondary={secondary} brandName={brandName} />;
    default: return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkflowExplainer: React.FC<WorkflowExplainerProps> = ({
  scenes,
  bgColor = '#0B0710',
  accentColor = '#7B3FA0',
  secondaryColor = '#A855F7',
  brandName,
  referenceImageUrl,
}) => {
  const { fps } = useVideoConfig();
  let cursor = 0;

  return (
    <AbsoluteFill style={{ background: bgColor, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      <AnimatedBackground accent={accentColor} secondary={secondaryColor} bg={bgColor} />
      {referenceImageUrl ? (
        <AbsoluteFill style={{ opacity: 0.06, filter: 'blur(2px)' }}>
          <Img src={referenceImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      ) : null}

      {scenes.map((scene, i) => {
        const dur = Math.round(((scene as any).duration || (DEFAULT_DURATION / 30)) * fps);
        const from = cursor;
        cursor += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneRouter scene={scene} accent={accentColor} secondary={secondaryColor} brandName={brandName} />
          </Sequence>
        );
      })}

      <Grain />
    </AbsoluteFill>
  );
};

export default WorkflowExplainer;
