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
  staticFile,
} from "remotion";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BaranganehScene = {
  type:
    | "hook"        // 3 detik — pernyataan mustahil, teks besar dramatis
    | "catalog"     // deskripsi dingin objek + gambar objek muncul
    | "anomaly"     // inti — narasi + kurator + objek berdampingan
    | "implication" // hubungan ke masa kini, pertanyaan retoris
    | "seal"        // penutup brand
    | "chapter"     // pembatas bab — judul bab baru
    | "object_reveal" // reveal objek dramatis dengan efek spotlight
    | "object_focus" // objek full-screen dominan dengan slow zoom (video jika tersedia)
    | "fact"        // fakta + label sumber/validitas, objek di samping
    | "context"     // latar sejarah/konteks, teks naratif panjang
    | "lesson"      // ilmu kehidupan / refleksi filosofis
    | "price"       // harga non-moneter (konsep @baranganeh)
    | "quote"       // kutipan dramatis, teks besar italic
    | "info_box"    // kotak informasi dengan efek blur-in, fade-in, float
    | "highlight";  // teks dengan highlight/stabilo pada kata-kata kunci
  text?: string;           // teks narasi utama
  subtext?: string;        // teks sekunder
  lotNumber?: string;      // nomor lot, misal "LOT #247"
  chapterTitle?: string;   // untuk scene type "chapter"
  duration?: number;       // dalam frame, default 90 (3 detik)
  textSpeed?: "slow" | "normal" | "fast"; // kecepatan typewriter
  glitchWords?: string[];  // kata-kata yang akan di-glitch
  showObject?: boolean;    // tampilkan gambar objek di scene ini
  showCurator?: boolean;   // tampilkan gambar kurator di scene ini
  objectPosition?: "left" | "right" | "center" | "background"; // posisi objek
  curatorPosition?: "left" | "right"; // posisi kurator
  factLabel?: string;      // label untuk scene fact: "TERDOKUMENTASI" | "DIPERDEBATKAN" | "SPEKULATIF"
  source?: string;         // sumber fakta, misal "Royal Observatory, 1820"
  priceLabel?: string;     // untuk scene price: harga non-moneter
  riskStatus?: string;     // untuk scene price: status risiko
  label?: string;          // label kecil di atas scene (eyebrow), misal "FAKTA", "KONTEKS"
  highlightWords?: string[]; // kata-kata yang akan di-highlight (untuk scene highlight)
};

export type BaranganehVideoProps = {
  scenes: BaranganehScene[];
  curatorImageUrl?: string;    // URL gambar kurator dari Replicate Flux
  objectImageUrl?: string;     // URL gambar objek dari Replicate Flux
  objectVideoUrl?: string;     // URL video objek dari WAN i2v (opsional)
  backgroundType?: "library" | "archive" | "auction" | "lab" | "void";
  accentColor?: string;        // default: #C9A84C (emas tua)
  lotNumber?: string;          // nomor lot global
  category?: "dark_obsession" | "satirical_anomaly" | "logic_glitch";
  partLabel?: string;          // label bagian untuk video multi-part, misal "BAGIAN 1/3"
};

// ─── Konstanta Visual ────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0A0805",
  bgLight: "#12100C",
  text: "#E8E0D0",
  accent: "#C9A84C",
  sepia: "#8B7355",
  shadow: "#000000",
  red: "#8B1A1A",
  green: "#1A4A2E",
};

const FONTS = {
  serif: "'Georgia', 'Times New Roman', serif",
  mono: "'Courier New', 'Courier', monospace",
  sans: "'Arial', sans-serif",
};

// ─── Utility: Typewriter ─────────────────────────────────────────────────────

const TypewriterText: React.FC<{
  text: string;
  frame: number;
  startFrame?: number;
  speed?: "slow" | "normal" | "fast";
  style?: React.CSSProperties;
  glitchWords?: string[];
  accentColor?: string;
  sceneDuration?: number;   // total frame scene; aktifkan auto-fit jika diisi
  holdFrames?: number;      // frame sisa untuk "hold" (baca) setelah teks selesai
}> = ({ text, frame, startFrame = 0, speed = "normal", style, glitchWords = [], accentColor = COLORS.accent, sceneDuration, holdFrames = 30 }) => {
  // Kecepatan dasar (chars per frame). Lebih lambat dari sebelumnya agar mudah dibaca.
  let charsPerFrame = speed === "slow" ? 0.28 : speed === "fast" ? 0.9 : 0.5;
  // Auto-fit: jika sceneDuration diketahui, pastikan teks selesai sebelum (durasi - hold),
  // tapi JANGAN melebihi kecepatan dasar (biar tetap lambat & terbaca).
  if (sceneDuration && text.length > 0) {
    const framesForTyping = Math.max(1, sceneDuration - startFrame - holdFrames);
    const requiredCpf = text.length / framesForTyping;
    // jika butuh lebih cepat dari kecepatan dasar, percepat secukupnya (cap di 1.6)
    if (requiredCpf > charsPerFrame) charsPerFrame = Math.min(1.6, requiredCpf);
  }
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.floor(elapsed * charsPerFrame);
  const visibleText = text.slice(0, visibleChars);

  // Split text untuk highlight kata-kata tertentu
  const words = visibleText.split(" ");

  return (
    <span style={style}>
      {words.map((word, i) => {
        const isGlitch = glitchWords.some(gw => word.toLowerCase().includes(gw.toLowerCase()));
        const glitchOffset = isGlitch && frame % 8 < 2 ? Math.sin(frame * 0.7) * 3 : 0;
        const glitchColor = isGlitch && frame % 12 < 3 ? "#FF4444" : undefined;

        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: isGlitch ? (glitchColor || accentColor) : undefined,
                transform: `translateX(${glitchOffset}px)`,
                display: "inline-block",
                textShadow: isGlitch ? `0 0 8px ${accentColor}` : undefined,
              }}
            >
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
      {/* Cursor berkedip */}
      {visibleChars < text.length && (
        <span style={{
          opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          color: accentColor,
        }}>▌</span>
      )}
    </span>
  );
};

// ─── Utility: Film Grain Overlay ─────────────────────────────────────────────

const FilmGrain: React.FC<{ frame: number; intensity?: number }> = ({ frame, intensity = 0.04 }) => {
  // Simulasi grain dengan pattern yang berubah tiap frame
  const grainSeed = frame * 7919;
  const grainPattern = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${grainSeed % 100}'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      backgroundImage: grainPattern,
      backgroundSize: "200px 200px",
      opacity: intensity,
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }} />
  );
};

// ─── Utility: Vignette ───────────────────────────────────────────────────────

const Vignette: React.FC<{ frame: number; intensity?: number }> = ({ frame, intensity = 0.7 }) => {
  // Pulse sangat halus
  const pulse = Math.sin(frame / 90) * 0.05;
  const opacity = intensity + pulse;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${opacity}) 100%)`,
      pointerEvents: "none",
    }} />
  );
};

// ─── Utility: Candle Flicker ─────────────────────────────────────────────────

const useCandleFlicker = (frame: number) => {
  // Flicker tidak reguler menggunakan beberapa sine wave
  const flicker1 = Math.sin(frame * 0.13) * 0.04;
  const flicker2 = Math.sin(frame * 0.37) * 0.02;
  const flicker3 = Math.sin(frame * 0.71) * 0.015;
  // Occasional big flicker
  const bigFlicker = (frame % 47 < 3) ? -0.08 : 0;
  return 1 + flicker1 + flicker2 + flicker3 + bigFlicker;
};

// ─── Utility: Dust Particles ─────────────────────────────────────────────────

const DustParticles: React.FC<{ frame: number; count?: number }> = ({ frame, count = 20 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const speed = 0.3 + (i * 0.17) % 0.5;
        const startX = (i * 37 + 11) % 100;
        const startY = (i * 53 + 7) % 100;
        const x = (startX + frame * speed * 0.1) % 100;
        const y = (startY - frame * speed * 0.05 + 100) % 100;
        const size = 1 + (i % 3);
        const opacity = 0.1 + (i % 5) * 0.05;
        const wobble = Math.sin(frame * 0.05 + i) * 0.5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x + wobble}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: COLORS.accent,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};

// ─── Utility: ObjectMedia (Video jika ada, Gambar jika tidak) ────────────────
// Menampilkan objek sebagai video bergerak (WAN i2v) bila objectVideoUrl tersedia,
// jika tidak, fallback ke gambar diam. Objek adalah bintang utama konten @baranganeh.

const ObjectMedia: React.FC<{
  imageUrl?: string;
  videoUrl?: string;
  style?: React.CSSProperties;
}> = ({ imageUrl, videoUrl, style }) => {
  if (videoUrl) {
    return (
      <OffthreadVideo
        src={videoUrl}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
      />
    );
  }
  if (imageUrl) {
    return (
      <Img
        src={imageUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
      />
    );
  }
  return null;
};

// ─── Utility: Animated Pill Box ─────────────────────────────────────────────
// Kotak dengan efek blur-in, fade-in, float, dan breathing scale

const AnimatedPillBox: React.FC<{
  text: string;
  frame: number;
  startFrame?: number;
  duration?: number;
  color?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}> = ({ text, frame, startFrame = 0, duration = 120, color = COLORS.bgLight, accentColor = COLORS.accent, style }) => {
  const relFrame = Math.max(0, frame - startFrame);
  const progress = Math.min(1, relFrame / 30); // 30 frame untuk blur-in
  
  // Blur-in effect
  const blur = interpolate(progress, [0, 1], [15, 0]);
  
  // Fade-in
  const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.3, 1]);
  
  // Slide up
  const translateY = interpolate(progress, [0, 1], [20, 0]);
  
  // Floating bob (naik-turun halus)
  const float = Math.sin(relFrame * 0.05) * 3;
  
  // Breathing scale (pulsing)
  const breathing = 1 + Math.sin(relFrame * 0.04) * 0.02;
  
  return (
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) translateY(${translateY + float}px) scale(${breathing})`,
      padding: "16px 24px",
      background: color,
      border: `2px solid ${accentColor}`,
      borderRadius: "50px",
      color: COLORS.text,
      fontSize: "18px",
      fontFamily: FONTS.serif,
      fontWeight: "normal",
      textAlign: "center",
      whiteSpace: "nowrap",
      opacity,
      filter: `blur(${blur}px)`,
      boxShadow: `0 0 30px rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.3)`,
      ...style,
    }}>
      {text}
    </div>
  );
};

// ─── Utility: Motion Background ──────────────────────────────────────────────
// Gradien warna yang bergerak halus

const MotionBackground: React.FC<{
  frame: number;
  colors?: [string, string, string];
}> = ({ frame, colors = ["#0A0805", "#12100C", "#1A1410"] }) => {
  const position = (frame * 0.5) % 100;
  
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: `
        linear-gradient(45deg,
          ${colors[0]} ${position}%,
          ${colors[1]} ${position + 30}%,
          ${colors[2]} ${position + 60}%
        )
      `,
      backgroundSize: "200% 200%",
      animation: "none",
    }} />
  );
};

// ─── Utility: Text Highlight ────────────────────────────────────────────────
// Highlight teks dengan warna (stabilo effect)

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
  const progress = Math.min(1, relFrame / 20); // 20 frame untuk reveal
  
  // Highlight animation — expand dari kiri ke kanan
  const highlightWidth = interpolate(progress, [0, 1], [0, 100]);
  
  const words = text.split(" ");
  
  return (
    <div style={{
      position: "relative",
      display: "inline-block",
      ...style,
    }}>
      {words.map((word, idx) => {
        const isHighlighted = highlightWords.some(hw => word.toLowerCase().includes(hw.toLowerCase()));
        return (
          <span key={idx} style={{
            position: "relative",
            marginRight: "0.3em",
            color: isHighlighted ? "#000" : color,
          }}>
            {isHighlighted && (
              <span style={{
                position: "absolute",
                inset: "-2px -4px",
                background: accentColor,
                borderRadius: "4px",
                opacity: progress,
                zIndex: -1,
              }} />
            )}
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Background Scenes ───────────────────────────────────────────────────────

const BackgroundLibrary: React.FC<{ frame: number; flickerBrightness: number }> = ({ frame, flickerBrightness }) => (
  <AbsoluteFill style={{ background: COLORS.bg }}>
    {/* Gradient background yang mensimulasikan perpustakaan */}
    <div style={{
      position: "absolute", inset: 0,
      background: `
        radial-gradient(ellipse at 20% 50%, rgba(201,168,76,${0.06 * flickerBrightness}) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 50%, rgba(201,168,76,${0.04 * flickerBrightness}) 0%, transparent 50%),
        linear-gradient(to bottom, #0A0805 0%, #12100C 50%, #0A0805 100%)
      `,
    }} />
    {/* Simulasi rak buku — garis horizontal */}
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        left: 0, right: 0,
        top: `${10 + i * 11}%`,
        height: 1,
        background: `rgba(201,168,76,${0.04 * flickerBrightness})`,
      }} />
    ))}
    {/* Simulasi buku-buku — blok vertikal */}
    {Array.from({ length: 30 }).map((_, i) => {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const width = 20 + (i * 13) % 30;
      const height = 60 + (i * 7) % 40;
      const opacity = 0.03 + (i % 5) * 0.01;
      return (
        <div key={i} style={{
          position: "absolute",
          left: `${col * 10 + (row * 3) % 5}%`,
          top: `${10 + row * 25}%`,
          width, height,
          background: `rgba(${139 + (i * 17) % 60}, ${90 + (i * 11) % 40}, ${50 + (i * 7) % 30}, ${opacity})`,
          borderRight: `1px solid rgba(201,168,76,0.02)`,
        }} />
      );
    })}
  </AbsoluteFill>
);

const BackgroundVoid: React.FC<{ frame: number; accentColor: string }> = ({ frame, accentColor }) => {
  const pulse = Math.sin(frame / 60) * 0.02;
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, ${accentColor}${Math.floor((0.05 + pulse) * 255).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── Scene: HOOK ─────────────────────────────────────────────────────────────

const HookScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  lotNumber?: string;
}> = ({ scene, frame, fps, accentColor, lotNumber }) => {
  const flickerBrightness = useCandleFlicker(frame);

  // Animasi masuk
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const textScale = spring({ frame, fps, config: { damping: 30, stiffness: 80 }, from: 1.05, to: 1 });

  // Slow Ken Burns
  const bgScale = interpolate(frame, [0, scene.duration || 90], [1, 1.04], { extrapolateRight: "clamp" });

  // Line yang tumbuh dari kiri
  const lineWidth = interpolate(frame, [15, 50], [0, 100], { extrapolateRight: "clamp" });

  // Lot number fade in
  const lotOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundVoid frame={frame} accentColor={accentColor} />
      </div>

      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.85} />
      <DustParticles frame={frame} count={15} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
        {/* Lot number */}
        {(lotNumber || scene.lotNumber) && (
          <div style={{
            position: "absolute",
            top: 60,
            left: 80,
            opacity: lotOpacity,
            fontFamily: FONTS.mono,
            fontSize: 14,
            letterSpacing: 6,
            color: COLORS.sepia,
            textTransform: "uppercase",
          }}>
            {lotNumber || scene.lotNumber} — TERMINAL ARCHIVES
          </div>
        )}

        {/* Garis aksen */}
        <div style={{
          position: "absolute",
          top: "38%",
          left: "8%",
          width: `${lineWidth}%`,
          height: 1,
          background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
          opacity: 0.6,
        }} />

        {/* Teks hook utama */}
        <div style={{
          opacity: textOpacity,
          transform: `scale(${textScale})`,
          textAlign: "center",
          maxWidth: 900,
        }}>
          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 52,
            fontStyle: "italic",
            color: COLORS.text,
            lineHeight: 1.3,
            letterSpacing: -0.5,
            textShadow: `0 0 80px ${accentColor}30`,
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={10}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={scene.duration || 90}
            />
          </div>
        </div>

        {/* Garis bawah */}
        <div style={{
          position: "absolute",
          bottom: "38%",
          left: "8%",
          width: `${lineWidth * 0.6}%`,
          height: 1,
          background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: OBJECT REVEAL ────────────────────────────────────────────────────

const ObjectRevealScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  objectImageUrl?: string;
  objectVideoUrl?: string;
}> = ({ scene, frame, fps, accentColor, objectImageUrl, objectVideoUrl }) => {
  const flickerBrightness = useCandleFlicker(frame);

  // Spotlight yang tumbuh dari gelap
  const spotlightSize = spring({ frame, fps, config: { damping: 25, stiffness: 40 }, from: 0, to: 100 });
  const imageOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const imageScale = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 50 }, from: 0.85, to: 1 });

  // Float animation
  const floatY = Math.sin(frame / 40) * 8;

  // Glow pulse
  const glowPulse = Math.sin(frame / 25) * 0.3 + 0.7;

  // Teks muncul setelah gambar
  const textOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  // Scan line effect
  const scanLineY = (frame * 4) % 1080;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Spotlight background */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at center, rgba(201,168,76,${0.08 * flickerBrightness}) 0%, rgba(20,15,8,0.95) ${spotlightSize * 0.6}%, #000 100%)`,
      }} />

      <FilmGrain frame={frame} intensity={0.08} />

      {/* Scan line */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        top: scanLineY,
        height: 2,
        background: `rgba(201,168,76,0.03)`,
        pointerEvents: "none",
      }} />

      <Vignette frame={frame} intensity={0.9} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {/* Objek */}
        {(objectImageUrl || objectVideoUrl) && (
          <div style={{
            opacity: imageOpacity,
            transform: `scale(${imageScale}) translateY(${floatY}px)`,
            position: "relative",
          }}>
            {/* Glow ring berputar */}
            <div style={{
              position: "absolute",
              inset: -20,
              borderRadius: 20,
              border: `1px solid ${accentColor}`,
              opacity: glowPulse * 0.4,
              transform: `rotate(${frame * 0.3}deg)`,
            }} />
            <div style={{
              position: "absolute",
              inset: -35,
              borderRadius: 24,
              border: `1px solid ${accentColor}`,
              opacity: glowPulse * 0.2,
              transform: `rotate(-${frame * 0.2}deg)`,
            }} />

            {/* Media objek — video bergerak (WAN i2v) atau gambar */}
            <div style={{
              width: 460,
              height: 540,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: `0 0 60px ${accentColor}${Math.floor(glowPulse * 40).toString(16).padStart(2,'0')}, 0 0 120px rgba(0,0,0,0.8)`,
              border: `1px solid ${accentColor}40`,
            }}>
              <ObjectMedia
                imageUrl={objectImageUrl}
                videoUrl={objectVideoUrl}
                style={{ filter: "sepia(20%) contrast(1.1)" }}
              />
            </div>

            {/* Corner brackets */}
            {[
              { top: -8, left: -8, borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` },
              { top: -8, right: -8, borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` },
              { bottom: -8, left: -8, borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` },
              { bottom: -8, right: -8, borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` },
            ].map((style, i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, ...style }} />
            ))}
          </div>
        )}

        {/* Label objek */}
        {scene.text && (
          <div style={{
            position: "absolute",
            bottom: 80,
            opacity: textOpacity,
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 13,
              letterSpacing: 5,
              color: COLORS.sepia,
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              OBJEK KATALOG
            </div>
            <div style={{
              fontFamily: FONTS.serif,
              fontSize: 22,
              color: COLORS.text,
              fontStyle: "italic",
            }}>
              {scene.text}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: CATALOG ──────────────────────────────────────────────────────────

const CatalogScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  objectImageUrl?: string;
  objectVideoUrl?: string;
  curatorImageUrl?: string;
}> = ({ scene, frame, fps, accentColor, objectImageUrl, objectVideoUrl, curatorImageUrl }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const bgScale = interpolate(frame, [0, scene.duration || 90], [1, 1.03], { extrapolateRight: "clamp" });

  // Gambar objek muncul dari kanan
  const objX = spring({ frame, fps, config: { damping: 25, stiffness: 60 }, from: 60, to: 0 });
  const objOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });

  // Teks dari kiri
  const textX = spring({ frame: frame - 10, fps, config: { damping: 25, stiffness: 60 }, from: -40, to: 0 });
  const textOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });

  // Float
  const floatY = Math.sin(frame / 45) * 6;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundLibrary frame={frame} flickerBrightness={flickerBrightness} />
      </div>

      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.75} />
      <DustParticles frame={frame} count={25} />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 80px", gap: 60 }}>
        {/* Panel kiri — teks */}
        <div style={{
          flex: 1,
          opacity: textOpacity,
          transform: `translateX(${textX}px)`,
        }}>
          {/* Label katalog */}
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            letterSpacing: 5,
            color: COLORS.sepia,
            textTransform: "uppercase",
            marginBottom: 20,
            borderLeft: `2px solid ${accentColor}`,
            paddingLeft: 12,
          }}>
            ENTRI KATALOG
          </div>

          {/* Teks narasi */}
          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 26,
            color: COLORS.text,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={15}
              speed={scene.textSpeed || "normal"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={scene.duration || 90}
            />
          </div>

          {scene.subtext && (
            <div style={{
              marginTop: 24,
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: COLORS.sepia,
              lineHeight: 1.8,
              opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
            }}>
              {scene.subtext}
            </div>
          )}
        </div>

        {/* Panel kanan — media objek (video/gambar) */}
        {(objectImageUrl || objectVideoUrl) && (
          <div style={{
            opacity: objOpacity,
            transform: `translateX(${objX}px) translateY(${floatY}px)`,
            flexShrink: 0,
          }}>
            <div style={{
              width: 340,
              height: 410,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${accentColor}40`,
              boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 20px ${accentColor}20`,
              filter: "sepia(15%) contrast(1.05)",
            }}>
              <ObjectMedia imageUrl={objectImageUrl} videoUrl={objectVideoUrl} />
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: ANOMALY ──────────────────────────────────────────────────────────

const AnomalyScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  curatorImageUrl?: string;
  objectImageUrl?: string;
  objectVideoUrl?: string;
}> = ({ scene, frame, fps, accentColor, curatorImageUrl, objectImageUrl, objectVideoUrl }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const bgScale = interpolate(frame, [0, scene.duration || 120], [1, 1.05], { extrapolateRight: "clamp" });

  const curatorOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const curatorScale = spring({ frame, fps, config: { damping: 20, stiffness: 50 }, from: 0.95, to: 1 });
  const floatY = Math.sin(frame / 50) * 10;

  const textOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const textX = spring({ frame: frame - 20, fps, config: { damping: 25, stiffness: 70 }, from: 30, to: 0 });

  // Glow berputar di sekitar kurator
  const glowAngle = (frame * 1.2) % 360;
  const glowPulse = Math.sin(frame / 30) * 0.2 + 0.8;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundLibrary frame={frame} flickerBrightness={flickerBrightness} />
      </div>

      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.8} />
      <DustParticles frame={frame} count={30} />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 60px", gap: 50 }}>
        {/* Kurator — kiri */}
        {curatorImageUrl && (
          <div style={{
            opacity: curatorOpacity,
            transform: `scale(${curatorScale}) translateY(${floatY}px)`,
            flexShrink: 0,
            position: "relative",
          }}>
            {/* Glow ring berputar */}
            <div style={{
              position: "absolute",
              inset: -15,
              borderRadius: "50%",
              background: `conic-gradient(from ${glowAngle}deg, transparent 0%, ${accentColor} 10%, transparent 20%)`,
              opacity: glowPulse * 0.3,
              filter: "blur(8px)",
            }} />

            <div style={{
              width: 260,
              height: 340,
              borderRadius: "50% 50% 45% 45% / 55% 55% 45% 45%",
              overflow: "hidden",
              border: `1px solid ${accentColor}50`,
              boxShadow: `0 0 50px rgba(0,0,0,0.9), 0 0 30px ${accentColor}15`,
              filter: "contrast(1.1) brightness(0.9)",
            }}>
              <Img src={curatorImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            {/* Shadow di bawah */}
            <div style={{
              position: "absolute",
              bottom: -20,
              left: "10%",
              right: "10%",
              height: 20,
              background: `radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)`,
              filter: "blur(8px)",
            }} />
          </div>
        )}

        {/* Teks narasi — kanan */}
        <div style={{
          flex: 1,
          opacity: textOpacity,
          transform: `translateX(${textX}px)`,
        }}>
          {/* Divider line */}
          <div style={{
            width: 40,
            height: 2,
            background: accentColor,
            marginBottom: 20,
            boxShadow: `0 0 10px ${accentColor}`,
          }} />

          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 24,
            color: COLORS.text,
            lineHeight: 1.7,
            fontStyle: "italic",
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={25}
              speed={scene.textSpeed || "normal"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={scene.duration || 90}
            />
          </div>

          {/* Media objek kecil di pojok */}
          {(objectImageUrl || objectVideoUrl) && (
            <div style={{
              marginTop: 30,
              opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}>
              <div style={{
                width: 90,
                height: 110,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${accentColor}30`,
                filter: "sepia(20%)",
              }}>
                <ObjectMedia imageUrl={objectImageUrl} videoUrl={objectVideoUrl} />
              </div>
              {scene.subtext && (
                <div style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  color: COLORS.sepia,
                  lineHeight: 1.6,
                  maxWidth: 250,
                }}>
                  {scene.subtext}
                </div>
              )}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: IMPLICATION ──────────────────────────────────────────────────────

const ImplicationScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  curatorImageUrl?: string;
}> = ({ scene, frame, fps, accentColor, curatorImageUrl }) => {
  const flickerBrightness = useCandleFlicker(frame);

  const bgScale = interpolate(frame, [0, scene.duration || 90], [1.02, 1.06], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const curatorOpacity = interpolate(frame, [10, 40], [0, 0.15], { extrapolateRight: "clamp" });
  const floatY = Math.sin(frame / 55) * 8;

  // Teks muncul dari bawah
  const textY = spring({ frame, fps, config: { damping: 30, stiffness: 60 }, from: 30, to: 0 });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundLibrary frame={frame} flickerBrightness={flickerBrightness} />
      </div>

      {/* Kurator sebagai background ghost */}
      {curatorImageUrl && (
        <div style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 400,
          height: 500,
          opacity: curatorOpacity,
          transform: `translateY(${floatY}px)`,
          filter: "blur(2px) sepia(50%)",
        }}>
          <Img src={curatorImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          {/* Gradient fade */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to right, ${COLORS.bg} 0%, transparent 40%, transparent 100%)`,
          }} />
        </div>
      )}

      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.8} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
        <div style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
          maxWidth: 800,
        }}>
          {/* Quote marks besar */}
          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 120,
            color: accentColor,
            opacity: 0.15,
            lineHeight: 0.5,
            marginBottom: 20,
          }}>
            "
          </div>

          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 30,
            color: COLORS.text,
            lineHeight: 1.6,
            fontStyle: "italic",
            letterSpacing: 0.5,
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={10}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={scene.duration || 90}
            />
          </div>

          {/* Garis dekoratif */}
          <div style={{
            width: interpolate(frame, [40, 80], [0, 200], { extrapolateRight: "clamp" }),
            height: 1,
            background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
            margin: "30px auto 0",
          }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: CHAPTER ──────────────────────────────────────────────────────────

const ChapterScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const lineWidth = interpolate(frame, [5, 40], [0, 100], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const textScale = spring({ frame: frame - 20, fps, config: { damping: 25, stiffness: 70 }, from: 0.95, to: 1 });

  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
      <FilmGrain frame={frame} intensity={0.07} />

      {/* Garis atas */}
      <div style={{
        position: "absolute",
        top: "42%",
        left: `${(100 - lineWidth) / 2}%`,
        width: `${lineWidth}%`,
        height: 1,
        background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
      }} />

      {/* Teks chapter */}
      <div style={{ opacity: textOpacity, transform: `scale(${textScale})`, textAlign: "center" }}>
        <div style={{
          fontFamily: FONTS.mono,
          fontSize: 13,
          letterSpacing: 8,
          color: COLORS.sepia,
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          {scene.subtext || "BAGIAN"}
        </div>
        <div style={{
          fontFamily: FONTS.serif,
          fontSize: 56,
          color: COLORS.text,
          letterSpacing: -1,
          fontStyle: "italic",
        }}>
          {scene.chapterTitle || scene.text}
        </div>
      </div>

      {/* Garis bawah */}
      <div style={{
        position: "absolute",
        bottom: "42%",
        left: `${(100 - lineWidth * 0.5) / 2}%`,
        width: `${lineWidth * 0.5}%`,
        height: 1,
        background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── Scene: OBJECT FOCUS ─────────────────────────────────────────────────────
// Objek full-screen dominan dengan slow zoom (Ken Burns). Render video bila tersedia.

const ObjectFocusScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  objectImageUrl?: string;
  objectVideoUrl?: string;
  lotNumber?: string;
}> = ({ scene, frame, fps, accentColor, objectImageUrl, objectVideoUrl, lotNumber }) => {
  const duration = scene.duration || 120;

  // Slow Ken Burns zoom-in pada objek
  const zoom = interpolate(frame, [0, duration], [1.0, 1.12], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, duration], [-1.5, 1.5], { extrapolateRight: "clamp" });
  const mediaOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [duration - 18, duration], [1, 0], { extrapolateRight: "clamp" });

  // Label naik dari bawah
  const labelOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });
  const labelY = spring({ frame: frame - 25, fps, config: { damping: 30, stiffness: 60 }, from: 20, to: 0 });

  // Scan line halus
  const scanLineY = (frame * 5) % 1350;

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeOut }}>
      {/* Media objek full-screen */}
      {(objectImageUrl || objectVideoUrl) && (
        <AbsoluteFill style={{
          opacity: mediaOpacity,
          transform: `scale(${zoom}) translateX(${panX}%)`,
          transformOrigin: "center",
        }}>
          <ObjectMedia
            imageUrl={objectImageUrl}
            videoUrl={objectVideoUrl}
            style={{ filter: "sepia(18%) contrast(1.12) brightness(0.92)" }}
          />
        </AbsoluteFill>
      )}

      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: scanLineY, height: 2,
        background: `rgba(201,168,76,0.04)`, pointerEvents: "none",
      }} />

      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.92} />

      {/* Lot number atas */}
      {lotNumber && (
        <div style={{
          position: "absolute", top: 60, left: 80,
          fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 6,
          color: COLORS.sepia, textTransform: "uppercase",
          opacity: labelOpacity,
        }}>
          {lotNumber} — OBJEK
        </div>
      )}

      {/* Label objek bawah */}
      {(scene.text || scene.subtext) && (
        <div style={{
          position: "absolute", bottom: 90, left: 80, right: 80,
          opacity: labelOpacity, transform: `translateY(${labelY}px)`,
        }}>
          <div style={{ width: 50, height: 2, background: accentColor, marginBottom: 16, boxShadow: `0 0 10px ${accentColor}` }} />
          {scene.text && (
            <div style={{ fontFamily: FONTS.serif, fontSize: 30, color: COLORS.text, fontStyle: "italic", lineHeight: 1.4 }}>
              {scene.text}
            </div>
          )}
          {scene.subtext && (
            <div style={{ marginTop: 12, fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 1, color: COLORS.sepia, lineHeight: 1.7 }}>
              {scene.subtext}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Scene: SEAL ─────────────────────────────────────────────────────────────

const SealScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  curatorImageUrl?: string;
  lotNumber?: string;
}> = ({ scene, frame, fps, accentColor, curatorImageUrl, lotNumber }) => {
  const flickerBrightness = useCandleFlicker(frame);

  const scale = spring({ frame, fps, config: { damping: 20, stiffness: 40 }, from: 0.9, to: 1 });
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame / 20) * 0.3 + 0.7;
  const floatY = Math.sin(frame / 40) * 8;

  // Fade out di akhir
  const duration = scene.duration || 90;
  const fadeOut = interpolate(frame, [duration - 20, duration], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, rgba(201,168,76,${0.06 * flickerBrightness}) 0%, transparent 60%)`,
      }} />

      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.85} />
      <DustParticles frame={frame} count={20} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: opacity * fadeOut }}>
        {/* Kurator kecil */}
        {curatorImageUrl && (
          <div style={{
            transform: `scale(${scale}) translateY(${floatY}px)`,
            marginBottom: 30,
          }}>
            <div style={{
              width: 100,
              height: 120,
              borderRadius: "50% 50% 45% 45% / 55% 55% 45% 45%",
              overflow: "hidden",
              border: `1px solid ${accentColor}`,
              boxShadow: `0 0 30px ${accentColor}${Math.floor(glowPulse * 30).toString(16).padStart(2,'0')}`,
              margin: "0 auto",
            }}>
              <Img src={curatorImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
          {/* Lot number */}
          {lotNumber && (
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              letterSpacing: 6,
              color: COLORS.sepia,
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              {lotNumber}
            </div>
          )}

          {/* Garis */}
          <div style={{
            width: 60,
            height: 1,
            background: accentColor,
            margin: "0 auto 20px",
            opacity: 0.6,
          }} />

          {/* Teks seal */}
          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 22,
            color: COLORS.text,
            fontStyle: "italic",
            lineHeight: 1.6,
            maxWidth: 600,
            margin: "0 auto",
          }}>
            <TypewriterText
              text={scene.text || "Lot ini ditutup untuk sementara. Katalog berikutnya akan tersedia ketika Anda sudah siap."}
              frame={frame}
              startFrame={20}
              speed="slow"
              accentColor={accentColor}
              sceneDuration={scene.duration || 90}
            />
          </div>

          {/* Brand tag */}
          <div style={{
            marginTop: 30,
            fontFamily: FONTS.mono,
            fontSize: 13,
            letterSpacing: 5,
            color: accentColor,
            textTransform: "uppercase",
            opacity: interpolate(frame, [50, 70], [0, 0.8], { extrapolateRight: "clamp" }),
          }}>
            @baranganeh
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Komponen Utama ───────────────────────────────────────────────────────────

// ─── Scene: FACT (fakta + label sumber, objek di samping) ────────────────────

const FactScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
  objectImageUrl?: string;
  objectVideoUrl?: string;
}> = ({ scene, frame, fps, accentColor, objectImageUrl, objectVideoUrl }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const dur = scene.duration || 150;
  const bgScale = interpolate(frame, [0, dur], [1.02, 1.06], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const objOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });
  const floatY = Math.sin(frame / 50) * 6;
  const hasMedia = !!(objectImageUrl || objectVideoUrl);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundLibrary frame={frame} flickerBrightness={flickerBrightness} />
      </div>
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.75} />

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 90px", gap: 50 }}>
        {/* Kolom teks */}
        <div style={{ flex: 1, opacity: textOpacity }}>
          <div style={{
            fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 4,
            color: accentColor, marginBottom: 8, textTransform: "uppercase",
          }}>
            {scene.label || "FAKTA"}
          </div>
          {scene.factLabel && (
            <div style={{
              display: "inline-block", fontFamily: FONTS.mono, fontSize: 13,
              letterSpacing: 2, color: COLORS.bg, background: accentColor,
              padding: "3px 10px", borderRadius: 2, marginBottom: 18,
            }}>
              {scene.factLabel}
            </div>
          )}
          <div style={{ fontFamily: FONTS.serif, fontSize: 34, color: COLORS.text, lineHeight: 1.5 }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={12}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={dur}
            />
          </div>
          {scene.source && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 16, color: COLORS.sepia,
              marginTop: 22, opacity: interpolate(frame, [dur * 0.5, dur * 0.7], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>
              — {scene.source}
            </div>
          )}
        </div>
        {/* Kolom objek */}
        {hasMedia && (
          <div style={{
            width: 380, height: 480, opacity: objOpacity,
            transform: `translateY(${floatY}px)`,
            boxShadow: `0 0 60px ${accentColor}25`,
            border: `1px solid ${accentColor}30`,
          }}>
            <ObjectMedia imageUrl={objectImageUrl} videoUrl={objectVideoUrl} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: CONTEXT (narasi sejarah panjang, teks tengah) ────────────────────

const ContextScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const dur = scene.duration || 180;
  const bgScale = interpolate(frame, [0, dur], [1.03, 1.08], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, transformOrigin: "center" }}>
        <BackgroundLibrary frame={frame} flickerBrightness={flickerBrightness * 0.85} />
      </div>
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.85} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 110px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 860 }}>
          <div style={{
            fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 5,
            color: accentColor, marginBottom: 26, textTransform: "uppercase",
          }}>
            {scene.label || "KONTEKS"}
          </div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 32, color: COLORS.text, lineHeight: 1.65 }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={12}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={dur}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: LESSON (ilmu kehidupan / refleksi) ───────────────────────────────

const LessonScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const dur = scene.duration || 165;
  const bgPulse = 0.3 + Math.sin(frame / 40) * 0.1;
  const textOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [20, 60], [0, 120], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${accentColor}10 0%, transparent 55%)`,
        opacity: bgPulse,
      }} />
      <DustParticles frame={frame} count={16} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 820 }}>
          <div style={{ width: lineW, height: 1, background: accentColor, margin: "0 auto 30px" }} />
          <div style={{
            fontFamily: FONTS.serif, fontSize: 38, color: COLORS.text,
            lineHeight: 1.6, fontStyle: "italic",
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={15}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={dur}
            />
          </div>
          <div style={{ width: lineW, height: 1, background: accentColor, margin: "30px auto 0" }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: PRICE (harga non-moneter — konsep @baranganeh) ────────────────────

const PriceScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const dur = scene.duration || 150;
  const labelOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const priceScale = spring({ frame, fps, config: { damping: 28, stiffness: 70 }, from: 0.9, to: 1 });
  const priceOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = 0.4 + Math.sin(frame / 25) * 0.25;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${COLORS.red}18 0%, transparent 60%)`,
        opacity: glowPulse,
      }} />
      <DustParticles frame={frame} count={14} />
      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.92} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
        <div style={{ textAlign: "center", maxWidth: 880 }}>
          <div style={{
            fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 5,
            color: accentColor, marginBottom: 30, opacity: labelOpacity,
            textTransform: "uppercase",
          }}>
            {scene.label || "HARGA — NON-MONETER"}
          </div>
          <div style={{
            fontFamily: FONTS.serif, fontSize: 46, color: COLORS.text,
            lineHeight: 1.4, opacity: priceOpacity,
            transform: `scale(${priceScale})`,
            textShadow: `0 0 40px ${accentColor}30`,
          }}>
            <TypewriterText
              text={scene.priceLabel || scene.text || ""}
              frame={frame}
              startFrame={15}
              speed={scene.textSpeed || "slow"}
              accentColor={accentColor}
              sceneDuration={dur}
            />
          </div>
          {scene.riskStatus && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 17, letterSpacing: 2,
              color: COLORS.red, marginTop: 34,
              opacity: interpolate(frame, [dur * 0.55, dur * 0.75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>
              STATUS RISIKO: {scene.riskStatus}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: QUOTE (kutipan dramatis besar) ───────────────────────────────────

const QuoteScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const dur = scene.duration || 150;
  const textOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const quoteScale = spring({ frame, fps, config: { damping: 30, stiffness: 60 }, from: 0.96, to: 1 });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${accentColor}0E 0%, transparent 60%)`,
      }} />
      <DustParticles frame={frame} count={12} />
      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 110px" }}>
        <div style={{ opacity: textOpacity, textAlign: "center", maxWidth: 860, transform: `scale(${quoteScale})` }}>
          <div style={{
            fontFamily: FONTS.serif, fontSize: 110, color: accentColor,
            opacity: 0.18, lineHeight: 0.4, marginBottom: 10,
          }}>“</div>
          <div style={{
            fontFamily: FONTS.serif, fontSize: 40, color: COLORS.text,
            lineHeight: 1.55, fontStyle: "italic",
          }}>
            <TypewriterText
              text={scene.text || ""}
              frame={frame}
              startFrame={12}
              speed={scene.textSpeed || "slow"}
              glitchWords={scene.glitchWords}
              accentColor={accentColor}
              sceneDuration={dur}
            />
          </div>
          {scene.source && (
            <div style={{
              fontFamily: FONTS.mono, fontSize: 16, color: COLORS.sepia, marginTop: 28,
              opacity: interpolate(frame, [dur * 0.55, dur * 0.75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
            }}>— {scene.source}</div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: INFO_BOX ─────────────────────────────────────────────────────────

const InfoBoxScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const duration = scene.duration || 120;
  const fadeOut = interpolate(frame, [duration - 20, duration], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, rgba(201,168,76,${0.06 * flickerBrightness}) 0%, transparent 60%)`,
      }} />

      <FilmGrain frame={frame} intensity={0.06} />
      <Vignette frame={frame} intensity={0.8} />
      <DustParticles frame={frame} count={15} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
        <AnimatedPillBox
          text={scene.text || ""}
          frame={frame}
          startFrame={0}
          duration={duration}
          color={COLORS.bgLight}
          accentColor={accentColor}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene: HIGHLIGHT ────────────────────────────────────────────────────────

const HighlightScene: React.FC<{
  scene: BaranganehScene;
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ scene, frame, fps, accentColor }) => {
  const flickerBrightness = useCandleFlicker(frame);
  const duration = scene.duration || 150;
  const fadeOut = interpolate(frame, [duration - 20, duration], [1, 0], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 30], [0.95, 1]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, rgba(201,168,76,${0.06 * flickerBrightness}) 0%, transparent 60%)`,
      }} />

      <FilmGrain frame={frame} intensity={0.05} />
      <Vignette frame={frame} intensity={0.8} />
      <DustParticles frame={frame} count={20} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut, transform: `scale(${scale})` }}>
        <div style={{ maxWidth: 900, padding: "40px 60px", textAlign: "center" }}>
          <div style={{
            fontFamily: FONTS.serif,
            fontSize: 32,
            lineHeight: 1.8,
            color: COLORS.text,
          }}>
            <TextHighlight
              text={scene.text || ""}
              highlightWords={scene.highlightWords || []}
              frame={frame}
              startFrame={20}
              color={COLORS.text}
              accentColor={accentColor}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const BaranganehVideo: React.FC<BaranganehVideoProps> = (props) => {
  const {
    scenes = [],
    curatorImageUrl,
    objectImageUrl,
    objectVideoUrl,
    backgroundType = "library",
    accentColor = COLORS.accent,
    lotNumber,
    category = "dark_obsession",
    partLabel,
  } = props;

  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {scenes.map((scene, i) => {
        const duration = scene.duration || 90;
        const startFrame = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 90), 0);

        return (
          <Sequence key={i} from={startFrame} durationInFrames={duration}>
            {scene.type === "hook" && (
              <HookScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} lotNumber={lotNumber} />
            )}
            {scene.type === "object_reveal" && (
              <ObjectRevealScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} objectImageUrl={objectImageUrl} objectVideoUrl={objectVideoUrl} />
            )}
            {scene.type === "catalog" && (
              <CatalogScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} objectImageUrl={objectImageUrl} objectVideoUrl={objectVideoUrl} curatorImageUrl={curatorImageUrl} />
            )}
            {scene.type === "anomaly" && (
              <AnomalyScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} curatorImageUrl={curatorImageUrl} objectImageUrl={objectImageUrl} objectVideoUrl={objectVideoUrl} />
            )}
            {scene.type === "object_focus" && (
              <ObjectFocusScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} objectImageUrl={objectImageUrl} objectVideoUrl={objectVideoUrl} lotNumber={lotNumber} />
            )}
            {scene.type === "implication" && (
              <ImplicationScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} curatorImageUrl={curatorImageUrl} />
            )}
            {scene.type === "chapter" && (
              <ChapterScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "seal" && (
              <SealScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} curatorImageUrl={curatorImageUrl} lotNumber={lotNumber} />
            )}
            {scene.type === "fact" && (
              <FactScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} objectImageUrl={objectImageUrl} objectVideoUrl={objectVideoUrl} />
            )}
            {scene.type === "context" && (
              <ContextScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "lesson" && (
              <LessonScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "price" && (
              <PriceScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "quote" && (
              <QuoteScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "info_box" && (
              <InfoBoxScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
            {scene.type === "highlight" && (
              <HighlightScene scene={scene} frame={frame - startFrame} fps={fps} accentColor={accentColor} />
            )}
          </Sequence>
        );
      })}

      {/* Badge bagian (multi-part) di pojok kanan atas */}
      {partLabel && (
        <div style={{
          position: "absolute", top: 28, right: 32,
          fontFamily: FONTS.mono, fontSize: 16, letterSpacing: 2,
          color: accentColor, opacity: 0.75,
          border: `1px solid ${accentColor}40`, padding: "4px 12px",
          borderRadius: 2, background: "rgba(10,8,5,0.5)",
        }}>
          {partLabel}
        </div>
      )}
    </AbsoluteFill>
  );
};
