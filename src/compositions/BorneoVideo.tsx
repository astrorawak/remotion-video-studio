import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  OffthreadVideo,
  Sequence,
} from "remotion";

// ════════════════════════════════════════════════════════════════════════════
//  BORNEO PRIDE — "Silent Witness" Series
//  Komponen Remotion untuk YouTube long-form (1920×1080, 16:9, 24fps).
//  Konten: environmental storytelling tentang tanaman akuatik & hutan Kalimantan.
//  Pipeline: Flux Dev (gambar) → WAN 2.5 i2v (animasi) → Remotion (compose).
// ════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export type BorneoScene = {
  type:
    | "hook"           // pernyataan pembuka memikat (3-5 detik), teks besar sinematik
    | "species_reveal" // reveal spesies/tanaman dramatis dengan spotlight + label
    | "species_focus"  // spesies FULL-SCREEN dominan dengan slow zoom (video WAN i2v jika ada)
    | "data_fact"      // fakta + angka + label sumber, media di samping (data-heavy)
    | "context"        // latar naratif panjang (sejarah hutan, ekosistem)
    | "investigation"  // pertanyaan investigatif retoris (mode detektif)
    | "paradox"        // kontradiksi kebijakan ditampilkan dramatis
    | "comparison"     // perbandingan dua angka/keadaan (before/after, ekonomi vs lingkungan)
    | "lesson"         // refleksi / makna naratif
    | "quote"          // kutipan dramatis (pejabat, ilmuwan, sumber)
    | "highlight"      // teks dengan stabilo pada kata kunci
    | "chapter"        // pembatas Act/Bab
    | "call_to_action" // pertanyaan penutup (bukan ceramah)
    | "outro";         // penutup brand BORNEO PRIDE
  text?: string;
  subtext?: string;
  chapterTitle?: string;
  duration?: number;       // dalam frame (24fps): 24=1dtk, 72=3dtk, 120=5dtk
  textSpeed?: "slow" | "normal" | "fast";
  glitchWords?: string[];  // kata yang diberi aksen/getar
  factLabel?: string;      // "VERIFIED" | "DOCUMENTED" | "DISPUTED"
  source?: string;         // sumber fakta / atribusi kutipan
  label?: string;          // eyebrow label kecil ("THE DATA", "THE PARADOX")
  highlightWords?: string[];
  // Untuk scene comparison:
  leftLabel?: string;
  leftValue?: string;
  rightLabel?: string;
  rightValue?: string;
};

export type BorneoVideoProps = {
  scenes: BorneoScene[];
  naturalistImageUrl?: string; // URL gambar naturalis/botanis dari Flux (opsional, jarang tampil)
  speciesImageUrl?: string;    // URL gambar spesies/tanaman dari Flux
  speciesVideoUrl?: string;    // URL video spesies dari WAN i2v (opsional)
  accentColor?: string;        // default: #3FA66A (hijau hutan terang)
  secondaryColor?: string;     // default: #7B3FA0 (ungu logo user)
  episodeLabel?: string;       // misal "EPISODE 01 — THE RAFFLESIA PARADOX"
  partLabel?: string;          // misal "PART 1/4" untuk video multi-bagian
  seriesName?: string;         // default "BORNEO PRIDE"
};

// ─── Konstanta Visual ────────────────────────────────────────────────────────
// Palet: hutan gelap basah + hijau lumut + biru sungai + aksen ungu logo.

const COLORS = {
  bg: "#0A1410",        // hijau-hitam pekat (lantai hutan malam)
  bgLight: "#10201A",   // hijau gelap
  bgDeep: "#060D0A",    // nyaris hitam
  text: "#EAF2E8",      // putih kehijauan lembut
  textSoft: "#A9C2AE",  // hijau pucat untuk teks sekunder
  accent: "#3FA66A",    // hijau hutan terang (utama)
  river: "#2E8FA6",     // biru sungai
  purple: "#7B3FA0",    // ungu logo user
  moss: "#6B8F52",      // hijau lumut
  amber: "#C7A24A",     // amber kayu kering (peringatan halus)
  danger: "#C0492F",    // merah bata (untuk angka kritis)
};

const FONTS = {
  // Serif elegan untuk narasi sinematik, sans bersih untuk data, mono untuk label.
  serif: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
  sans: "'Inter', 'Helvetica Neue', 'Arial', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};

// Helper konversi hex → rgba
const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─── Utility: Typewriter (auto-fit, terbaca penuh) ───────────────────────────

const TypewriterText: React.FC<{
  text: string;
  frame: number;
  startFrame?: number;
  speed?: "slow" | "normal" | "fast";
  style?: React.CSSProperties;
  glitchWords?: string[];
  accentColor?: string;
  sceneDuration?: number;
  holdFrames?: number;
}> = ({ text, frame, startFrame = 0, speed = "normal", style, glitchWords = [], accentColor = COLORS.accent, sceneDuration, holdFrames = 36 }) => {
  let charsPerFrame = speed === "slow" ? 0.30 : speed === "fast" ? 0.95 : 0.55;
  if (sceneDuration && text.length > 0) {
    const framesForTyping = Math.max(1, sceneDuration - startFrame - holdFrames);
    const requiredCpf = text.length / framesForTyping;
    if (requiredCpf > charsPerFrame) charsPerFrame = Math.min(1.7, requiredCpf);
  }
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.floor(elapsed * charsPerFrame);
  const visibleText = text.slice(0, visibleChars);
  const words = visibleText.split(" ");

  return (
    <span style={style}>
      {words.map((word, i) => {
        const isGlitch = glitchWords.some((gw) => word.toLowerCase().includes(gw.toLowerCase()));
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: isGlitch ? accentColor : undefined,
                display: "inline-block",
                textShadow: isGlitch ? `0 0 16px ${accentColor}80` : undefined,
                fontWeight: isGlitch ? 600 : undefined,
              }}
            >
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
      {visibleChars < text.length && (
        <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: accentColor }}>▌</span>
      )}
    </span>
  );
};

// ─── Utility: Film Grain ─────────────────────────────────────────────────────

const FilmGrain: React.FC<{ frame: number; intensity?: number }> = ({ frame, intensity = 0.04 }) => {
  const grainSeed = frame * 7919;
  const grainPattern = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${grainSeed % 100}'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: grainPattern, backgroundSize: "200px 200px",
      opacity: intensity, mixBlendMode: "overlay", pointerEvents: "none",
    }} />
  );
};

// ─── Utility: Vignette ───────────────────────────────────────────────────────

const Vignette: React.FC<{ frame: number; intensity?: number }> = ({ frame, intensity = 0.7 }) => {
  const pulse = Math.sin(frame / 90) * 0.04;
  const opacity = intensity + pulse;
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `radial-gradient(ellipse at center, transparent 42%, rgba(2,8,5,${opacity}) 100%)`,
      pointerEvents: "none",
    }} />
  );
};

// ─── Utility: Light Flicker (sinar matahari menembus kanopi) ──────────────────

const useCanopyFlicker = (frame: number) => {
  const f1 = Math.sin(frame * 0.11) * 0.04;
  const f2 = Math.sin(frame * 0.31) * 0.025;
  const f3 = Math.sin(frame * 0.67) * 0.015;
  return 1 + f1 + f2 + f3;
};

// ─── Utility: Floating Spores (partikel serbuk/spora hutan) ──────────────────

const FloatingSpores: React.FC<{ frame: number; count?: number; color?: string }> = ({ frame, count = 24, color = COLORS.accent }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const speed = 0.25 + (i * 0.17) % 0.5;
        const startX = (i * 37 + 11) % 100;
        const startY = (i * 53 + 7) % 100;
        const x = (startX + frame * speed * 0.08) % 100;
        const y = (startY - frame * speed * 0.05 + 100) % 100;
        const size = 1.5 + (i % 3);
        const opacity = 0.08 + (i % 5) * 0.04;
        const wobble = Math.sin(frame * 0.04 + i) * 0.8;
        const glow = i % 4 === 0;
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${x + wobble}%`, top: `${y}%`,
            width: size, height: size,
            borderRadius: "50%",
            background: color,
            opacity,
            boxShadow: glow ? `0 0 6px ${color}` : undefined,
          }} />
        );
      })}
    </>
  );
};

// ─── Utility: SpeciesMedia (video WAN i2v jika ada, gambar jika tidak) ────────

const SpeciesMedia: React.FC<{
  imageUrl?: string;
  videoUrl?: string;
  style?: React.CSSProperties;
}> = ({ imageUrl, videoUrl, style }) => {
  if (videoUrl) {
    return <OffthreadVideo src={videoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />;
  }
  if (imageUrl) {
    return <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />;
  }
  return null;
};

// ─── Utility: Text Highlight (stabilo) ────────────────────────────────────────

const TextHighlight: React.FC<{
  text: string;
  highlightWords?: string[];
  frame: number;
  startFrame?: number;
  color?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}> = ({ text, highlightWords = [], frame, startFrame = 0, color = COLORS.text, accentColor = COLORS.accent, style }) => {
  const relFrame = Math.max(0, frame - startFrame);
  const progress = Math.min(1, relFrame / 22);
  const words = text.split(" ");
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      {words.map((word, idx) => {
        const isHighlighted = highlightWords.some((hw) => word.toLowerCase().includes(hw.toLowerCase()));
        return (
          <span key={idx} style={{ position: "relative", marginRight: "0.3em", color: isHighlighted ? "#06120C" : color }}>
            {isHighlighted && (
              <span style={{
                position: "absolute", inset: "-2px -6px",
                background: accentColor, borderRadius: "4px",
                opacity: progress, zIndex: -1,
              }} />
            )}
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Background: Rainforest (gradien hutan dinamis) ──────────────────────────

const BackgroundForest: React.FC<{ frame: number; flicker: number; accentColor: string; secondaryColor: string }> = ({ frame, flicker, accentColor, secondaryColor }) => (
  <AbsoluteFill style={{ background: COLORS.bg }}>
    {/* Sinar kanopi dari atas */}
    <div style={{
      position: "absolute", inset: 0,
      background: `
        radial-gradient(ellipse at 30% 0%, ${hexToRgba(accentColor, 0.10 * flicker)} 0%, transparent 45%),
        radial-gradient(ellipse at 75% 10%, ${hexToRgba(secondaryColor, 0.06 * flicker)} 0%, transparent 50%),
        linear-gradient(to bottom, ${COLORS.bgDeep} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)
      `,
    }} />
    {/* Simulasi siluet batang pohon vertikal */}
    {Array.from({ length: 9 }).map((_, i) => {
      const x = (i * 12 + 4) % 100;
      const w = 30 + (i * 17) % 60;
      const op = 0.05 + (i % 4) * 0.02;
      return (
        <div key={i} style={{
          position: "absolute", bottom: 0, left: `${x}%`,
          width: w, height: "100%",
          background: `linear-gradient(to top, ${hexToRgba("#020805", op * 1.5)} 0%, ${hexToRgba("#020805", op)} 60%, transparent 100%)`,
          filter: "blur(2px)",
        }} />
      );
    })}
    {/* Kabut bawah */}
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: "30%",
      background: `linear-gradient(to top, ${hexToRgba(accentColor, 0.05)} 0%, transparent 100%)`,
      opacity: 0.6 + Math.sin(frame / 70) * 0.15,
    }} />
  </AbsoluteFill>
);

const BackgroundVoid: React.FC<{ frame: number; accentColor: string; secondaryColor: string }> = ({ frame, accentColor, secondaryColor }) => {
  const pulse = Math.sin(frame / 60) * 0.02;
  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse at 40% 45%, ${hexToRgba(accentColor, 0.07 + pulse)} 0%, transparent 60%),
          radial-gradient(ellipse at 70% 60%, ${hexToRgba(secondaryColor, 0.05)} 0%, transparent 65%)
        `,
      }} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

type SceneCommon = {
  scene: BorneoScene;
  frame: number;
  fps: number;
  accentColor: string;
  secondaryColor: string;
};

// ─── Scene: HOOK ─────────────────────────────────────────────────────────────

const HookScene: React.FC<SceneCommon & { episodeLabel?: string }> = ({ scene, frame, fps, accentColor, secondaryColor, episodeLabel }) => {
  const flicker = useCanopyFlicker(frame);
  const dur = scene.duration || 96;
  const textOpacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const textScale = spring({ frame, fps, config: { damping: 30, stiffness: 80 }, from: 1.04, to: 1 });
  const bgScale = interpolate(frame, [0, dur], [1, 1.06], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [18, 56], [0, 100], { extrapolateRight: "clamp" });
  const epOpacity = interpolate(frame, [6, 28], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundVoid frame={frame} accentColor={accentColor} secondaryColor={secondaryColor} />
      </div>
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.88} />
      <FloatingSpores frame={frame} count={18} color={accentColor} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 160px" }}>
        {episodeLabel && (
          <div style={{
            position: "absolute", top: 70, left: 160, opacity: epOpacity,
            fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 8,
            color: COLORS.textSoft, textTransform: "uppercase",
          }}>
            {episodeLabel}
          </div>
        )}
        <div style={{
          position: "absolute", top: "34%", left: "12%",
          width: `${lineWidth * 0.76}%`, height: 1,
          background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`, opacity: 0.6,
        }} />
        <div style={{ opacity: textOpacity, transform: `scale(${textScale})`, textAlign: "center", maxWidth: 1400 }}>
          <div style={{
            fontFamily: FONTS.serif, fontSize: 76, fontStyle: "italic",
            color: COLORS.text, lineHeight: 1.28, letterSpacing: -0.5,
            textShadow: `0 0 90px ${hexToRgba(accentColor, 0.25)}`,
          }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={12} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
        </div>
        <div style={{
          position: "absolute", bottom: "34%", left: "12%",
          width: `${lineWidth * 0.45}%`, height: 1,
          background: `linear-gradient(to right, transparent, ${hexToRgba(accentColor, 0.5)}, transparent)`,
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: SPECIES REVEAL (reveal dramatis dengan spotlight) ────────────────

const SpeciesRevealScene: React.FC<SceneCommon & { speciesImageUrl?: string; speciesVideoUrl?: string }> = ({ scene, frame, fps, accentColor, secondaryColor, speciesImageUrl, speciesVideoUrl }) => {
  const flicker = useCanopyFlicker(frame);
  const dur = scene.duration || 120;
  const spotlight = spring({ frame, fps, config: { damping: 25, stiffness: 40 }, from: 0, to: 100 });
  const imageOpacity = interpolate(frame, [18, 48], [0, 1], { extrapolateRight: "clamp" });
  const imageScale = spring({ frame: frame - 18, fps, config: { damping: 20, stiffness: 50 }, from: 0.86, to: 1 });
  const floatY = Math.sin(frame / 42) * 8;
  const glowPulse = Math.sin(frame / 26) * 0.3 + 0.7;
  const textOpacity = interpolate(frame, [48, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at center, ${hexToRgba(accentColor, 0.09 * flicker)} 0%, ${hexToRgba(COLORS.bg, 0.96)} ${spotlight * 0.6}%, ${COLORS.bgDeep} 100%)`,
      }} />
      <FilmGrain frame={frame} intensity={0.07} />
      <Vignette frame={frame} intensity={0.9} />
      <FloatingSpores frame={frame} count={22} color={accentColor} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {(speciesImageUrl || speciesVideoUrl) && (
          <div style={{ opacity: imageOpacity, transform: `scale(${imageScale}) translateY(${floatY}px)`, position: "relative" }}>
            <div style={{
              position: "absolute", inset: -22, borderRadius: 20,
              border: `1px solid ${accentColor}`, opacity: glowPulse * 0.4, transform: `rotate(${frame * 0.25}deg)`,
            }} />
            <div style={{
              position: "absolute", inset: -38, borderRadius: 26,
              border: `1px solid ${secondaryColor}`, opacity: glowPulse * 0.25, transform: `rotate(-${frame * 0.18}deg)`,
            }} />
            <div style={{
              width: 720, height: 540, borderRadius: 18, overflow: "hidden",
              boxShadow: `0 0 80px ${hexToRgba(accentColor, glowPulse * 0.35)}, 0 0 160px rgba(0,0,0,0.85)`,
              border: `1px solid ${hexToRgba(accentColor, 0.3)}`,
            }}>
              <SpeciesMedia imageUrl={speciesImageUrl} videoUrl={speciesVideoUrl} style={{ filter: "saturate(1.08) contrast(1.06)" }} />
            </div>
            {[
              { top: -10, left: -10, borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` },
              { top: -10, right: -10, borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` },
              { bottom: -10, left: -10, borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` },
              { bottom: -10, right: -10, borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` },
            ].map((style, i) => (
              <div key={i} style={{ position: "absolute", width: 26, height: 26, ...style }} />
            ))}
          </div>
        )}
        {scene.text && (
          <div style={{ position: "absolute", bottom: 90, opacity: textOpacity, textAlign: "center" }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 6,
              color: accentColor, textTransform: "uppercase", marginBottom: 12,
            }}>
              {scene.label || "ENDEMIC SPECIES"}
            </div>
            <div style={{ fontFamily: FONTS.serif, fontSize: 38, color: COLORS.text, fontStyle: "italic" }}>
              {scene.text}
            </div>
            {scene.subtext && (
              <div style={{ marginTop: 10, fontFamily: FONTS.sans, fontSize: 22, color: COLORS.textSoft }}>
                {scene.subtext}
              </div>
            )}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: SPECIES FOCUS (full-screen dominan, Ken Burns) ───────────────────

const SpeciesFocusScene: React.FC<SceneCommon & { speciesImageUrl?: string; speciesVideoUrl?: string; episodeLabel?: string }> = ({ scene, frame, fps, accentColor, speciesImageUrl, speciesVideoUrl, episodeLabel }) => {
  const dur = scene.duration || 144;
  const zoom = interpolate(frame, [0, dur], [1.0, 1.14], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, dur], [-2, 2], { extrapolateRight: "clamp" });
  const mediaOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [dur - 18, dur], [1, 0], { extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [28, 54], [0, 1], { extrapolateRight: "clamp" });
  const labelY = spring({ frame: frame - 28, fps, config: { damping: 30, stiffness: 60 }, from: 24, to: 0 });

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeOut }}>
      {(speciesImageUrl || speciesVideoUrl) && (
        <AbsoluteFill style={{ opacity: mediaOpacity, transform: `scale(${zoom}) translateX(${panX}%)`, transformOrigin: "center" }}>
          <SpeciesMedia imageUrl={speciesImageUrl} videoUrl={speciesVideoUrl} style={{ filter: "saturate(1.1) contrast(1.05) brightness(0.96)" }} />
        </AbsoluteFill>
      )}
      {/* Gradien bawah agar teks terbaca */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "45%",
        background: `linear-gradient(to top, rgba(2,8,5,0.92) 0%, transparent 100%)`,
      }} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.78} />

      {episodeLabel && (
        <div style={{
          position: "absolute", top: 70, left: 90, opacity: labelOpacity,
          fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 6, color: COLORS.textSoft, textTransform: "uppercase",
        }}>
          {episodeLabel}
        </div>
      )}
      {(scene.text || scene.subtext) && (
        <div style={{ position: "absolute", bottom: 110, left: 90, right: 90, opacity: labelOpacity, transform: `translateY(${labelY}px)` }}>
          <div style={{ width: 64, height: 3, background: accentColor, marginBottom: 20, boxShadow: `0 0 14px ${accentColor}` }} />
          {scene.text && (
            <div style={{ fontFamily: FONTS.serif, fontSize: 46, color: COLORS.text, fontStyle: "italic", lineHeight: 1.35, maxWidth: 1400 }}>
              {scene.text}
            </div>
          )}
          {scene.subtext && (
            <div style={{ marginTop: 16, fontFamily: FONTS.sans, fontSize: 24, color: COLORS.textSoft, lineHeight: 1.6, maxWidth: 1200 }}>
              {scene.subtext}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Scene: DATA FACT (fakta + angka + sumber, media di samping) ─────────────

const DataFactScene: React.FC<SceneCommon & { speciesImageUrl?: string; speciesVideoUrl?: string }> = ({ scene, frame, fps, accentColor, secondaryColor, speciesImageUrl, speciesVideoUrl }) => {
  const flicker = useCanopyFlicker(frame);
  const dur = scene.duration || 168;
  const bgScale = interpolate(frame, [0, dur], [1.02, 1.06], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const objOpacity = interpolate(frame, [12, 42], [0, 1], { extrapolateRight: "clamp" });
  const floatY = Math.sin(frame / 50) * 8;
  const hasMedia = !!(speciesImageUrl || speciesVideoUrl);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundForest frame={frame} flicker={flicker} accentColor={accentColor} secondaryColor={secondaryColor} />
      </div>
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.76} />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 130px", gap: 80 }}>
        <div style={{ flex: 1, opacity: textOpacity }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 5, color: accentColor, textTransform: "uppercase" }}>
              {scene.label || "THE DATA"}
            </div>
            {scene.factLabel && (
              <div style={{
                fontFamily: FONTS.mono, fontSize: 16, letterSpacing: 2,
                color: COLORS.bgDeep, background: accentColor, padding: "4px 12px", borderRadius: 3,
              }}>
                {scene.factLabel}
              </div>
            )}
          </div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 46, color: COLORS.text, lineHeight: 1.42 }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={14} speed={scene.textSpeed || "normal"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
          {scene.source && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 20, color: COLORS.textSoft, marginTop: 28,
              opacity: interpolate(frame, [dur * 0.5, dur * 0.7], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>
              SOURCE — {scene.source}
            </div>
          )}
        </div>
        {hasMedia && (
          <div style={{
            width: 560, height: 620, opacity: objOpacity, transform: `translateY(${floatY}px)`, flexShrink: 0,
            borderRadius: 14, overflow: "hidden",
            boxShadow: `0 0 80px ${hexToRgba(accentColor, 0.2)}, 0 0 40px rgba(0,0,0,0.6)`,
            border: `1px solid ${hexToRgba(accentColor, 0.25)}`,
          }}>
            <SpeciesMedia imageUrl={speciesImageUrl} videoUrl={speciesVideoUrl} style={{ filter: "saturate(1.06)" }} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: CONTEXT (narasi panjang, teks tengah) ────────────────────────────

const ContextScene: React.FC<SceneCommon> = ({ scene, frame, accentColor, secondaryColor }) => {
  const flicker = useCanopyFlicker(frame);
  const dur = scene.duration || 192;
  const bgScale = interpolate(frame, [0, dur], [1.03, 1.08], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundForest frame={frame} flicker={flicker * 0.85} accentColor={accentColor} secondaryColor={secondaryColor} />
      </div>
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.84} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 1340 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 6, color: accentColor, marginBottom: 30, textTransform: "uppercase" }}>
            {scene.label || "CONTEXT"}
          </div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 42, color: COLORS.text, lineHeight: 1.6 }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={14} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: INVESTIGATION (pertanyaan investigatif retoris) ──────────────────

const InvestigationScene: React.FC<SceneCommon> = ({ scene, frame, fps, accentColor, secondaryColor }) => {
  const dur = scene.duration || 156;
  const textOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const textY = spring({ frame, fps, config: { damping: 30, stiffness: 60 }, from: 28, to: 0 });
  const markPulse = 0.4 + Math.sin(frame / 22) * 0.2;

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${hexToRgba(secondaryColor, 0.10)} 0%, transparent 60%)`,
      }} />
      <FloatingSpores frame={frame} count={16} color={secondaryColor} />
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
        <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, textAlign: "center", maxWidth: 1300 }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 150, color: secondaryColor, opacity: markPulse, lineHeight: 0.4, marginBottom: 30 }}>?</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 50, color: COLORS.text, lineHeight: 1.5, fontStyle: "italic" }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={12} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={secondaryColor} sceneDuration={dur} />
          </div>
          <div style={{ width: interpolate(frame, [40, 80], [0, 240], { extrapolateRight: "clamp" }), height: 1, background: `linear-gradient(to right, transparent, ${secondaryColor}, transparent)`, margin: "36px auto 0" }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: PARADOX (kontradiksi kebijakan, dramatis) ────────────────────────

const ParadoxScene: React.FC<SceneCommon> = ({ scene, frame, accentColor }) => {
  const dur = scene.duration || 168;
  const labelOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [14, 44], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = 0.4 + Math.sin(frame / 24) * 0.22;

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${hexToRgba(COLORS.danger, 0.14)} 0%, transparent 62%)`,
        opacity: glowPulse,
      }} />
      <FloatingSpores frame={frame} count={14} color={COLORS.amber} />
      <FilmGrain frame={frame} intensity={0.07} />
      <Vignette frame={frame} intensity={0.92} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 180px" }}>
        <div style={{ textAlign: "center", maxWidth: 1340 }}>
          <div style={{
            fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 6, color: COLORS.amber,
            marginBottom: 34, opacity: labelOpacity, textTransform: "uppercase",
          }}>
            {scene.label || "THE PARADOX"}
          </div>
          <div style={{
            fontFamily: FONTS.serif, fontSize: 52, color: COLORS.text, lineHeight: 1.42,
            opacity: textOpacity, textShadow: `0 0 50px ${hexToRgba(COLORS.danger, 0.3)}`,
          }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={14} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={COLORS.amber} sceneDuration={dur} />
          </div>
          {scene.source && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 19, color: COLORS.textSoft, marginTop: 34,
              opacity: interpolate(frame, [dur * 0.55, dur * 0.75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>
              — {scene.source}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: COMPARISON (dua angka/keadaan berdampingan) ──────────────────────

const ComparisonScene: React.FC<SceneCommon> = ({ scene, frame, fps, accentColor, secondaryColor }) => {
  const dur = scene.duration || 156;
  const headerOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const leftIn = spring({ frame: frame - 14, fps, config: { damping: 26, stiffness: 60 }, from: -50, to: 0 });
  const rightIn = spring({ frame: frame - 20, fps, config: { damping: 26, stiffness: 60 }, from: 50, to: 0 });
  const cardsOpacity = interpolate(frame, [14, 44], [0, 1], { extrapolateRight: "clamp" });

  const Card: React.FC<{ label?: string; value?: string; color: string; tx: number }> = ({ label, value, color, tx }) => (
    <div style={{
      flex: 1, transform: `translateX(${tx}px)`, opacity: cardsOpacity,
      background: hexToRgba(color, 0.08), border: `1px solid ${hexToRgba(color, 0.4)}`,
      borderRadius: 16, padding: "56px 40px", textAlign: "center",
      boxShadow: `0 0 60px ${hexToRgba(color, 0.12)}`,
    }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 24, letterSpacing: 4, color: color, textTransform: "uppercase", marginBottom: 24 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONTS.serif, fontSize: 82, fontWeight: 700, color: COLORS.text, lineHeight: 1.05 }}>
        {value}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${hexToRgba(accentColor, 0.06)} 0%, transparent 60%)` }} />
      <FloatingSpores frame={frame} count={14} color={accentColor} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.82} />
      <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 160px" }}>
        {scene.text && (
          <div style={{ opacity: headerOpacity, fontFamily: FONTS.serif, fontSize: 44, color: COLORS.text, textAlign: "center", marginBottom: 56, maxWidth: 1300, fontStyle: "italic", lineHeight: 1.4 }}>
            {scene.text}
          </div>
        )}
        <div style={{ display: "flex", gap: 60, width: "100%", maxWidth: 1400, alignItems: "stretch" }}>
          <Card label={scene.leftLabel} value={scene.leftValue} color={accentColor} tx={leftIn} />
          <div style={{ display: "flex", alignItems: "center", fontFamily: FONTS.serif, fontSize: 60, color: COLORS.textSoft, opacity: cardsOpacity }}>vs</div>
          <Card label={scene.rightLabel} value={scene.rightValue} color={COLORS.danger} tx={rightIn} />
        </div>
        {scene.source && (
          <div style={{
            fontFamily: FONTS.mono, fontSize: 18, color: COLORS.textSoft, marginTop: 48,
            opacity: interpolate(frame, [dur * 0.5, dur * 0.7], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}>
            SOURCE — {scene.source}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: LESSON (refleksi naratif) ────────────────────────────────────────

const LessonScene: React.FC<SceneCommon> = ({ scene, frame, accentColor }) => {
  const dur = scene.duration || 180;
  const bgPulse = 0.3 + Math.sin(frame / 40) * 0.1;
  const textOpacity = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [20, 60], [0, 160], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 45%, ${hexToRgba(accentColor, 0.10)} 0%, transparent 56%)`, opacity: bgPulse }} />
      <FloatingSpores frame={frame} count={14} color={accentColor} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 220px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 1280 }}>
          <div style={{ width: lineW, height: 1, background: accentColor, margin: "0 auto 36px" }} />
          <div style={{ fontFamily: FONTS.serif, fontSize: 50, color: COLORS.text, lineHeight: 1.55, fontStyle: "italic" }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={16} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
          <div style={{ width: lineW, height: 1, background: accentColor, margin: "36px auto 0" }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: QUOTE (kutipan dramatis besar) ───────────────────────────────────

const QuoteScene: React.FC<SceneCommon> = ({ scene, frame, fps, accentColor }) => {
  const dur = scene.duration || 168;
  const textOpacity = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });
  const quoteScale = spring({ frame, fps, config: { damping: 30, stiffness: 60 }, from: 0.96, to: 1 });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, ${hexToRgba(accentColor, 0.07)} 0%, transparent 60%)` }} />
      <FloatingSpores frame={frame} count={12} color={accentColor} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 1320, transform: `scale(${quoteScale})` }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 160, color: accentColor, opacity: 0.18, lineHeight: 0.4, marginBottom: 16 }}>“</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 56, color: COLORS.text, lineHeight: 1.5, fontStyle: "italic" }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={14} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
          {scene.source && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 20, color: COLORS.textSoft, marginTop: 34,
              opacity: interpolate(frame, [dur * 0.55, dur * 0.75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>— {scene.source}</div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: HIGHLIGHT (stabilo kata kunci) ───────────────────────────────────

const HighlightScene: React.FC<SceneCommon> = ({ scene, frame, accentColor, secondaryColor }) => {
  const flicker = useCanopyFlicker(frame);
  const dur = scene.duration || 156;
  const fadeOut = interpolate(frame, [dur - 20, dur], [1, 0], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 30], [0.96, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${hexToRgba(accentColor, 0.07 * flicker)} 0%, transparent 60%)` }} />
      <FloatingSpores frame={frame} count={18} color={secondaryColor} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.82} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut, transform: `scale(${scale})` }}>
        <div style={{ maxWidth: 1400, padding: "60px 100px", textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 48, lineHeight: 1.7, color: COLORS.text }}>
            <TextHighlight text={scene.text || ""} highlightWords={scene.highlightWords || []} frame={frame} startFrame={20} color={COLORS.text} accentColor={accentColor} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: CHAPTER (pembatas Act/Bab) ───────────────────────────────────────

const ChapterScene: React.FC<SceneCommon> = ({ scene, frame, fps, accentColor }) => {
  const lineWidth = interpolate(frame, [5, 42], [0, 100], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [20, 46], [0, 1], { extrapolateRight: "clamp" });
  const textScale = spring({ frame: frame - 20, fps, config: { damping: 25, stiffness: 70 }, from: 0.95, to: 1 });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep, alignItems: "center", justifyContent: "center" }}>
      <FilmGrain frame={frame} intensity={0.07} />
      <FloatingSpores frame={frame} count={10} color={accentColor} />
      <div style={{
        position: "absolute", top: "42%", left: `${(100 - lineWidth) / 2}%`,
        width: `${lineWidth}%`, height: 1, background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
      }} />
      <div style={{ opacity: textOpacity, transform: `scale(${textScale})`, textAlign: "center" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 20, letterSpacing: 10, color: COLORS.textSoft, textTransform: "uppercase", marginBottom: 22 }}>
          {scene.subtext || "ACT"}
        </div>
        <div style={{ fontFamily: FONTS.serif, fontSize: 78, color: COLORS.text, letterSpacing: -1, fontStyle: "italic" }}>
          {scene.chapterTitle || scene.text}
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: "42%", left: `${(100 - lineWidth * 0.5) / 2}%`,
        width: `${lineWidth * 0.5}%`, height: 1, background: `linear-gradient(to right, transparent, ${hexToRgba(accentColor, 0.5)}, transparent)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── Scene: CALL TO ACTION (pertanyaan penutup) ──────────────────────────────

const CallToActionScene: React.FC<SceneCommon> = ({ scene, frame, accentColor, secondaryColor }) => {
  const dur = scene.duration || 168;
  const textOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = 0.5 + Math.sin(frame / 28) * 0.25;

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${hexToRgba(secondaryColor, 0.10 * glowPulse)} 0%, transparent 60%)`,
      }} />
      <FloatingSpores frame={frame} count={20} color={accentColor} />
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 1320 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 6, color: accentColor, marginBottom: 36, textTransform: "uppercase" }}>
            {scene.label || "WHAT WILL YOU DO?"}
          </div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 56, color: COLORS.text, lineHeight: 1.45, fontStyle: "italic" }}>
            <TypewriterText text={scene.text || ""} frame={frame} startFrame={16} speed={scene.textSpeed || "slow"} glitchWords={scene.glitchWords} accentColor={accentColor} sceneDuration={dur} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: OUTRO (penutup brand BORNEO PRIDE) ───────────────────────────────

const OutroScene: React.FC<SceneCommon & { seriesName?: string }> = ({ scene, frame, fps, accentColor, secondaryColor, seriesName }) => {
  const scale = spring({ frame, fps, config: { damping: 20, stiffness: 40 }, from: 0.92, to: 1 });
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const dur = scene.duration || 120;
  const fadeOut = interpolate(frame, [dur - 24, dur], [1, 0], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame / 22) * 0.3 + 0.7;
  const tagOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${hexToRgba(accentColor, 0.08 * glowPulse)} 0%, transparent 60%)` }} />
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.86} />
      <FloatingSpores frame={frame} count={18} color={accentColor} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: opacity * fadeOut }}>
        <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
          {/* Monogram logo ungu-hijau */}
          <div style={{
            width: 120, height: 120, margin: "0 auto 32px", borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            background: `conic-gradient(from 0deg, ${secondaryColor}, ${accentColor}, ${secondaryColor})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${hexToRgba(accentColor, glowPulse * 0.4)}`,
          }}>
            <span style={{ fontFamily: FONTS.serif, fontSize: 56, fontWeight: 700, color: COLORS.bgDeep }}>B</span>
          </div>
          <div style={{ width: 70, height: 1, background: accentColor, margin: "0 auto 24px", opacity: 0.6 }} />
          <div style={{ fontFamily: FONTS.serif, fontSize: 34, color: COLORS.text, fontStyle: "italic", lineHeight: 1.55, maxWidth: 900, margin: "0 auto" }}>
            <TypewriterText text={scene.text || "The forest cannot speak. So we must."} frame={frame} startFrame={20} speed="slow" accentColor={accentColor} sceneDuration={dur} />
          </div>
          <div style={{
            marginTop: 34, fontFamily: FONTS.mono, fontSize: 24, letterSpacing: 8,
            color: accentColor, textTransform: "uppercase", opacity: tagOpacity,
          }}>
            {seriesName || "BORNEO PRIDE"}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  KOMPONEN UTAMA
// ════════════════════════════════════════════════════════════════════════════

export const BorneoVideo: React.FC<BorneoVideoProps> = (props) => {
  const {
    scenes = [],
    naturalistImageUrl,
    speciesImageUrl,
    speciesVideoUrl,
    accentColor = COLORS.accent,
    secondaryColor = COLORS.purple,
    episodeLabel,
    partLabel,
    seriesName = "BORNEO PRIDE",
  } = props;

  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {scenes.map((scene, i) => {
        const duration = scene.duration || 120;
        const startFrame = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 120), 0);
        const f = frame - startFrame;
        const common = { scene, frame: f, fps, accentColor, secondaryColor };

        return (
          <Sequence key={i} from={startFrame} durationInFrames={duration}>
            {scene.type === "hook" && <HookScene {...common} episodeLabel={episodeLabel} />}
            {scene.type === "species_reveal" && <SpeciesRevealScene {...common} speciesImageUrl={speciesImageUrl} speciesVideoUrl={speciesVideoUrl} />}
            {scene.type === "species_focus" && <SpeciesFocusScene {...common} speciesImageUrl={speciesImageUrl} speciesVideoUrl={speciesVideoUrl} episodeLabel={episodeLabel} />}
            {scene.type === "data_fact" && <DataFactScene {...common} speciesImageUrl={speciesImageUrl} speciesVideoUrl={speciesVideoUrl} />}
            {scene.type === "context" && <ContextScene {...common} />}
            {scene.type === "investigation" && <InvestigationScene {...common} />}
            {scene.type === "paradox" && <ParadoxScene {...common} />}
            {scene.type === "comparison" && <ComparisonScene {...common} />}
            {scene.type === "lesson" && <LessonScene {...common} />}
            {scene.type === "quote" && <QuoteScene {...common} />}
            {scene.type === "highlight" && <HighlightScene {...common} />}
            {scene.type === "chapter" && <ChapterScene {...common} />}
            {scene.type === "call_to_action" && <CallToActionScene {...common} />}
            {scene.type === "outro" && <OutroScene {...common} seriesName={seriesName} />}
          </Sequence>
        );
      })}

      {/* Badge bagian (multi-part) di pojok kanan atas */}
      {partLabel && (
        <div style={{
          position: "absolute", top: 36, right: 44,
          fontFamily: FONTS.mono, fontSize: 20, letterSpacing: 2,
          color: accentColor, opacity: 0.8,
          border: `1px solid ${hexToRgba(accentColor, 0.4)}`, padding: "6px 16px",
          borderRadius: 3, background: "rgba(6,13,10,0.55)",
        }}>
          {partLabel}
        </div>
      )}
    </AbsoluteFill>
  );
};
