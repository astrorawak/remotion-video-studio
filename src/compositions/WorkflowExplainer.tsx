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
import { resolveTheme, hexToRgba, ThemeTokens } from './wfThemes';

// ─── Types ──────────────────────────────────────────────────────────────────
// Workflow Explainer: ubah sebuah workflow/infografis menjadi video animasi
// step-by-step. Mendukung TEMA ADAPTIF (mengikuti warna/gaya gambar sumber)
// + elemen storytelling (label monospace, highlight kata) ala kreator referensi.

export type WorkflowScene =
  | {
      type: 'intro';
      title: string;
      subtitle?: string;
      icon?: string;
      badge?: string;
      duration?: number;
      sceneImage?: string;
      highlight?: string; // kata di title yang di-highlight warna aksen
    }
  | {
      type: 'step';
      stepNumber: number | string;
      title: string;
      description?: string;
      points?: Array<string | { text: string; icon?: string; image?: string; highlight?: boolean }>;
      icon?: string;
      tools?: string[];
      duration?: number;
      sceneImage?: string;
      label?: string;     // pill monospace konteks, mis. "< CARA LAMA >"
      highlight?: string; // kata di title yang di-highlight
    }
  | {
      type: 'connector';
      text?: string;
      duration?: number;
      sceneImage?: string;
    }
  | {
      type: 'spotlight'; // scene "MOMEN WAH": satu kalimat besar dominan
      text: string;
      highlight?: string;
      label?: string;
      duration?: number;
      sceneImage?: string;
    }
  | {
      type: 'statement'; // gaya "podcast subtitle": kalimat ALL-CAPS karaoke per kata
      text: string;
      highlight?: string;     // satu/beberapa kata kunci diberi warna aksen
      label?: string;
      duration?: number;
      sceneImage?: string;
      align?: 'center' | 'bottom'; // posisi teks (default center)
    }
  | {
      type: 'summary';
      title?: string;
      steps: string[];
      duration?: number;
      sceneImage?: string;
    }
  | {
      type: 'outro';
      title: string;
      subtitle?: string;
      cta?: string;
      handle?: string;
      duration?: number;
      sceneImage?: string;
      highlight?: string;
    };

export interface WorkflowExplainerProps {
  topic?: string;
  scenes: WorkflowScene[];
  // Tema: bisa preset name + override warna agar mengikuti gambar sumber.
  theme?: string;
  mode?: 'dark' | 'light';
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

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

// Render judul dengan satu kata/frasa di-highlight warna aksen.
const HighlightText: React.FC<{ text: string; highlight?: string; accent: string }> = ({ text, highlight, accent }) => {
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);
  return (
    <>
      {before}
      <span style={{ color: accent }}>{match}</span>
      {after}
    </>
  );
};

// Subtle animated background (mengikuti tema): grid + soft glow. "Layar tak pernah diam".
const AnimatedBackground: React.FC<{ t: ThemeTokens }> = ({ t }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 30;
  const drift2 = Math.cos(frame / 80) * 40;
  const gridAlpha = t.mode === 'light' ? 0.05 : 0.04;
  return (
    <AbsoluteFill style={{ background: t.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${hexToRgba(t.accent, 0.14)} 0%, transparent 70%)`, top: `${20 + drift / 10}%`, left: `${10 + drift / 12}%`, filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${hexToRgba(t.secondary, 0.1)} 0%, transparent 70%)`, bottom: `${10 + drift2 / 12}%`, right: `${5 + drift2 / 14}%`, filter: 'blur(20px)' }} />
      {/* drifting plus marks (ala kreator referensi) */}
      {[...Array(6)].map((_, i) => {
        const x = (i * 137) % 100;
        const y = (i * 211) % 100;
        const fl = Math.sin((frame + i * 40) / 50) * 10;
        return (
          <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translateY(${fl}px) rotate(${frame / 6 + i * 30}deg)`, color: hexToRgba(t.accent, 0.12), fontSize: 30, fontFamily: MONO }}>+</div>
        );
      })}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${hexToRgba(t.accent, gridAlpha)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(t.accent, gridAlpha)} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
      }} />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ t: ThemeTokens }> = ({ t }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: t.mode === 'light' ? 0.025 : 0.04, mixBlendMode: t.mode === 'light' ? 'multiply' : 'overlay', pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id="wf-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 10} />
        </filter>
        <rect width="100%" height="100%" filter="url(#wf-noise)" />
      </svg>
    </AbsoluteFill>
  );
};

// Cinematic per-scene background image dengan Ken Burns + overlay yang menyesuaikan tema.
const SceneImageLayer: React.FC<{ src?: string; t: ThemeTokens }> = ({ src, t }) => {
  const frame = useCurrentFrame();
  if (!src) return null;
  const zoom = 1.08 + Math.min(frame, 240) / 240 * 0.1;
  const driftX = Math.sin(frame / 90) * 14;
  const driftY = Math.cos(frame / 110) * 12;
  const intro = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // overlay base color mengikuti bg tema (gelap untuk dark, terang untuk light)
  const base = t.mode === 'light' ? '245,239,233' : '11,7,16';
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: intro }}>
      <Img
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) translate(${driftX}px, ${driftY}px)` }}
      />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(${base},0.55) 0%, rgba(${base},0.42) 38%, rgba(${base},0.78) 70%, rgba(${base},0.95) 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(${base},0.45) 0%, transparent 55%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, ${hexToRgba(t.accent, 0.1)} 0%, transparent 60%)` }} />
    </AbsoluteFill>
  );
};

const BrandTag: React.FC<{ brandName?: string; t: ThemeTokens }> = ({ brandName, t }) => {
  if (!brandName) return null;
  return (
    <div style={{ position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <div style={{ width: 14, height: 14, borderRadius: 4, background: t.accent, boxShadow: `0 0 16px ${t.accent}` }} />
      <span style={{ fontSize: 20, fontWeight: 800, color: t.brandText, letterSpacing: 3, textTransform: 'uppercase' }}>{brandName}</span>
    </div>
  );
};

// Kotak penyorot beraksen (ala "kotak merah" di video referensi): muncul fade + glow + denyut.
export const HighlightRing: React.FC<{ t: ThemeTokens; frame: number; delay?: number }> = ({ t, frame, delay = 0 }) => {
  const f = useFade(frame, delay, 10);
  const pulse = 1 + Math.sin((frame - delay) / 7) * 0.03;
  return (
    <div style={{ position: 'absolute', inset: -10, borderRadius: 18, border: `3px solid ${t.accent}`, boxShadow: `0 0 24px ${hexToRgba(t.accent, 0.6)}, inset 0 0 18px ${hexToRgba(t.accent, 0.25)}`, opacity: f, transform: `scale(${pulse})`, pointerEvents: 'none' }} />
  );
};

// Pill label monospace di atas-tengah (konteks scene).
const MonoLabel: React.FC<{ label?: string; t: ThemeTokens; frame: number }> = ({ label, t, frame }) => {
  if (!label) return null;
  const f = useFade(frame, 2);
  return (
    <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: f, zIndex: 40 }}>
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: t.accent, padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${hexToRgba(t.accent, 0.45)}`, background: hexToRgba(t.accent, 0.08) }}>
        {label}
      </div>
    </div>
  );
};

// ─── Scene Components ───────────────────────────────────────────────────────────

const IntroScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'intro' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const titleSpring = useSpringVal(frame, 6, 110, fps);
  const subFade = useFade(frame, 24);
  const iconSpring = useSpringVal(frame, 0, 90, fps);
  const badgeFade = useFade(frame, 2);
  const float = Math.sin(frame / 22) * 6;

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isPortrait ? '0 80px' : '0 140px' }}>
      <BrandTag brandName={brandName} t={t} />
      {scene.badge && (
        <div style={{ opacity: badgeFade, marginBottom: 28, padding: '10px 26px', borderRadius: 999, border: `1.5px solid ${t.accent}`, background: hexToRgba(t.accent, 0.1), color: t.accent, fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', fontFamily: MONO }}>
          {scene.badge}
        </div>
      )}
      {scene.icon && (
        <div style={{ fontSize: isPortrait ? 120 : 100, marginBottom: 28, transform: `scale(${iconSpring}) translateY(${float}px)` }}>{scene.icon}</div>
      )}
      <div style={{ fontSize: isPortrait ? 92 : 84, fontWeight: 900, color: t.text, textAlign: 'center', transform: `scale(${titleSpring})`, letterSpacing: '-2px', lineHeight: 1.05, textShadow: t.mode === 'dark' ? `0 0 70px ${hexToRgba(t.accent, 0.47)}` : 'none', maxWidth: 1100 }}>
        <HighlightText text={scene.title} highlight={scene.highlight} accent={t.accent} />
      </div>
      {scene.subtitle && (
        <div style={{ opacity: subFade, fontSize: isPortrait ? 34 : 30, color: t.textMuted, marginTop: 26, letterSpacing: 2, textAlign: 'center', maxWidth: 900, fontWeight: 500 }}>
          {scene.subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const StepScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'step' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
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
      <BrandTag brandName={brandName} t={t} />
      <MonoLabel label={scene.label} t={t} frame={frame} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 40 }}>
        <div style={{
          transform: `scale(${numSpring})`,
          width: isPortrait ? 130 : 120, height: isPortrait ? 130 : 120, borderRadius: 30,
          background: `linear-gradient(135deg, ${t.accent}, ${t.secondary})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isPortrait ? 64 : 58, fontWeight: 900, color: '#fff',
          boxShadow: `0 18px 50px ${hexToRgba(t.accent, 0.33)}`, flexShrink: 0,
        }}>
          {scene.stepNumber}
        </div>
        {scene.icon && (
          <div style={{ fontSize: isPortrait ? 84 : 76, transform: `scale(${iconSpring})` }}>{scene.icon}</div>
        )}
      </div>

      <div style={{ opacity: titleFade, transform: `translateY(${titleSlide}px)`, fontSize: isPortrait ? 70 : 64, fontWeight: 900, color: t.text, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 24, textShadow: t.mode === 'dark' ? `0 0 40px ${hexToRgba(t.accent, 0.27)}` : 'none', maxWidth: 1100 }}>
        <HighlightText text={scene.title} highlight={scene.highlight} accent={t.accent} />
      </div>

      {scene.description && (
        <div style={{ opacity: descFade, fontSize: isPortrait ? 34 : 30, color: t.textMuted, lineHeight: 1.5, maxWidth: 1000, marginBottom: 28 }}>
          {scene.description}
        </div>
      )}

      {scene.points && scene.points.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000 }}>
          {scene.points.map((rawP, i) => {
            const p = typeof rawP === 'string' ? { text: rawP } : rawP;
            const delay = 38 + i * 14;
            const pFade = useFade(frame, delay);
            const pSlide = interpolate(useSpringVal(frame, delay, 140, fps), [0, 1], [-50, 0]);
            const mediaScale = useSpringVal(frame, delay + 2, 150, fps);
            const thumb = isPortrait ? 72 : 64;
            const isHl = (p as any).highlight === true;
            return (
              <div key={i} style={{ position: 'relative', opacity: pFade, transform: `translateX(${pSlide}px)`, display: 'flex', alignItems: 'center', gap: 18, background: t.card, borderLeft: `4px solid ${t.accent}`, borderRadius: 14, padding: isPortrait ? '18px 24px' : '16px 24px' }}>
                {isHl && <HighlightRing t={t} frame={frame} delay={delay + 6} />}
                {p.image ? (
                  <div style={{ width: thumb, height: thumb, borderRadius: 14, overflow: 'hidden', flexShrink: 0, transform: `scale(${mediaScale})`, boxShadow: `0 8px 22px ${hexToRgba(t.accent, 0.27)}`, border: `2px solid ${hexToRgba(t.accent, 0.4)}` }}>
                    <Img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : p.icon ? (
                  <div style={{ width: thumb, height: thumb, borderRadius: 14, flexShrink: 0, transform: `scale(${mediaScale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isPortrait ? 38 : 34, background: `linear-gradient(135deg, ${hexToRgba(t.accent, 0.2)}, ${hexToRgba(t.secondary, 0.13)})`, border: `1.5px solid ${hexToRgba(t.accent, 0.33)}` }}>
                    {p.icon}
                  </div>
                ) : (
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent, boxShadow: `0 0 12px ${t.accent}`, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: isPortrait ? 30 : 27, color: t.text, fontWeight: 500 }}>{p.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {scene.tools && scene.tools.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
          {scene.tools.map((tool, i) => {
            const delay = 38 + (scene.points?.length || 0) * 14 + i * 10;
            const cFade = useFade(frame, delay);
            const cScale = useSpringVal(frame, delay, 160, fps);
            return (
              <div key={i} style={{ opacity: cFade, transform: `scale(${cScale})`, padding: '12px 24px', borderRadius: 999, background: hexToRgba(t.secondary, 0.13), border: `1.5px solid ${t.secondary}`, color: t.text, fontSize: isPortrait ? 26 : 23, fontWeight: 700 }}>
                {tool}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const ConnectorScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'connector' }>; t: ThemeTokens }> = ({ scene, t }) => {
  const frame = useCurrentFrame();
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
            borderTop: `34px solid ${t.accent}`,
            opacity: interpolate(arrowProg, [i * 0.25, i * 0.25 + 0.3], [0.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            filter: `drop-shadow(0 0 12px ${hexToRgba(t.accent, 0.53)})`,
          }} />
        ))}
      </div>
      {scene.text && (
        <div style={{ opacity: textFade, fontSize: 38, fontWeight: 700, color: t.secondary, letterSpacing: 2, textAlign: 'center', maxWidth: 800 }}>
          {scene.text}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Scene "MOMEN WAH": satu kalimat besar dominan + zoom pelan.
const SpotlightScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'spotlight' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const spr = useSpringVal(frame, 4, 90, fps);
  const zoom = 1 + Math.min(frame, 120) / 120 * 0.06;
  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isPortrait ? '0 80px' : '0 160px' }}>
      <BrandTag brandName={brandName} t={t} />
      <MonoLabel label={scene.label} t={t} frame={frame} />
      <div style={{ fontSize: isPortrait ? 96 : 88, fontWeight: 900, color: t.text, textAlign: 'center', transform: `scale(${spr * zoom})`, letterSpacing: '-2px', lineHeight: 1.05, textShadow: t.mode === 'dark' ? `0 0 80px ${hexToRgba(t.accent, 0.5)}` : 'none', maxWidth: 1100 }}>
        <HighlightText text={scene.text} highlight={scene.highlight} accent={t.accent} />
      </div>
    </AbsoluteFill>
  );
};

// Scene gaya "podcast subtitle": kalimat ALL-CAPS muncul KATA PER KATA (karaoke),
// kata kunci (highlight) menyala/membesar. Teks ber-stroke agar terbaca di latar apapun.
const StatementScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'statement' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const words = scene.text.split(' ');
  const hl = (scene.highlight || '').toLowerCase().split(' ').filter(Boolean);
  const stroke = t.mode === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.55)';
  const align = scene.align === 'bottom' ? 'flex-end' : 'center';
  const perWord = 4; // frame antar kata (cepat, ala karaoke)
  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: align, padding: isPortrait ? `0 70px ${scene.align === 'bottom' ? '220px' : '0'}` : '0 160px' }}>
      <BrandTag brandName={brandName} t={t} />
      <MonoLabel label={scene.label} t={t} frame={frame} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', rowGap: isPortrait ? 6 : 8, maxWidth: 1100 }}>
        {words.map((w, i) => {
          const delay = 4 + i * perWord;
          const isHl = hl.some((h) => w.toLowerCase().replace(/[.,!?]/g, '').includes(h));
          const pop = useSpringVal(frame, delay, 220, fps);
          const appear = useFade(frame, delay, 6);
          // kata kunci sedikit "denyut" membesar saat muncul lalu stabil
          const emphasize = isHl ? interpolate(useSpringVal(frame, delay, 200, fps), [0, 1], [1.35, 1.08]) : 1;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: appear,
                transform: `scale(${pop * emphasize})`,
                transformOrigin: 'center',
                fontSize: isPortrait ? 84 : 78,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-1px',
                lineHeight: 1.12,
                marginRight: isPortrait ? 22 : 24,
                paddingLeft: isHl ? 10 : 0,
                paddingRight: isHl ? 10 : 0,
                color: isHl ? t.accent : t.text,
                textShadow: `0 3px 0 ${stroke}, 0 0 ${isHl ? 50 : 24}px ${isHl ? hexToRgba(t.accent, 0.55) : (t.mode === 'dark' ? hexToRgba(t.accent, 0.2) : 'transparent')}`,
                WebkitTextStroke: t.mode === 'light' ? `1px ${hexToRgba(t.text, 0.15)}` : 'none',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SummaryScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'summary' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const titleFade = useFade(frame, 5);

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isPortrait ? '0 90px' : '0 160px' }}>
      <BrandTag brandName={brandName} t={t} />
      <div style={{ opacity: titleFade, fontSize: isPortrait ? 60 : 54, fontWeight: 900, color: t.text, marginBottom: 44, textAlign: 'center', letterSpacing: '-1px' }}>
        {scene.title || 'Recap'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: 1000 }}>
        {scene.steps.map((s, i) => {
          const delay = 14 + i * 12;
          const f = useFade(frame, delay);
          const sc = useSpringVal(frame, delay, 140, fps);
          return (
            <div key={i} style={{ opacity: f, transform: `scale(${sc})`, display: 'flex', alignItems: 'center', gap: 20, background: t.card, borderRadius: 16, padding: isPortrait ? '22px 28px' : '20px 28px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${t.accent}, ${t.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: isPortrait ? 32 : 28, color: t.text, fontWeight: 600 }}>{s}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ scene: Extract<WorkflowScene, { type: 'outro' }>; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const titleSpring = useSpringVal(frame, 6, 90, fps);
  const subFade = useFade(frame, 26);
  const ctaSpring = useSpringVal(frame, 46, 130, fps);
  const float = Math.sin(frame / 18) * 6;

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
      <BrandTag brandName={brandName} t={t} />
      <div style={{ fontSize: isPortrait ? 80 : 72, fontWeight: 900, color: t.text, textAlign: 'center', transform: `scale(${titleSpring}) translateY(${float}px)`, textShadow: t.mode === 'dark' ? `0 0 60px ${hexToRgba(t.accent, 0.53)}` : 'none', letterSpacing: '-2px', maxWidth: 1000 }}>
        <HighlightText text={scene.title} highlight={scene.highlight} accent={t.accent} />
      </div>
      {scene.subtitle && (
        <div style={{ opacity: subFade, fontSize: isPortrait ? 32 : 28, color: t.textMuted, marginTop: 22, textAlign: 'center', maxWidth: 800 }}>
          {scene.subtitle}
        </div>
      )}
      {scene.cta && (
        <div style={{ transform: `scale(${ctaSpring})`, marginTop: 42, background: `linear-gradient(135deg, ${t.accent}, ${t.secondary})`, color: '#fff', padding: '18px 52px', borderRadius: 999, fontSize: 26, fontWeight: 800, letterSpacing: 1, boxShadow: `0 0 50px ${hexToRgba(t.accent, 0.6)}` }}>
          {scene.cta}
        </div>
      )}
      {scene.handle && (
        <div style={{ opacity: subFade, marginTop: 28, fontSize: 26, color: t.accent, fontWeight: 700, letterSpacing: 1, fontFamily: MONO }}>
          {scene.handle}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Scene Wrapper ──────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 120; // 4s @ 30fps

const SceneRouter: React.FC<{ scene: WorkflowScene; t: ThemeTokens; brandName?: string }> = ({ scene, t, brandName }) => {
  const sceneImage = (scene as any).sceneImage as string | undefined;
  let content: React.ReactNode = null;
  switch (scene.type) {
    case 'intro': content = <IntroScene scene={scene} t={t} brandName={brandName} />; break;
    case 'step': content = <StepScene scene={scene} t={t} brandName={brandName} />; break;
    case 'connector': content = <ConnectorScene scene={scene} t={t} />; break;
    case 'spotlight': content = <SpotlightScene scene={scene} t={t} brandName={brandName} />; break;
    case 'statement': content = <StatementScene scene={scene} t={t} brandName={brandName} />; break;
    case 'summary': content = <SummaryScene scene={scene} t={t} brandName={brandName} />; break;
    case 'outro': content = <OutroScene scene={scene} t={t} brandName={brandName} />; break;
    default: return null;
  }
  return (
    <AbsoluteFill>
      <SceneImageLayer src={sceneImage} t={t} />
      {content}
    </AbsoluteFill>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WorkflowExplainer: React.FC<WorkflowExplainerProps> = ({
  scenes,
  theme,
  mode,
  bgColor,
  accentColor,
  secondaryColor,
  brandName,
  referenceImageUrl,
}) => {
  const { fps } = useVideoConfig();
  const t = resolveTheme({ theme, mode, bgColor, accentColor, secondaryColor });
  let cursor = 0;

  return (
    <AbsoluteFill style={{ background: t.bg, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      <AnimatedBackground t={t} />
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
            <SceneRouter scene={scene} t={t} brandName={brandName} />
          </Sequence>
        );
      })}

      <Grain t={t} />
    </AbsoluteFill>
  );
};

export default WorkflowExplainer;
