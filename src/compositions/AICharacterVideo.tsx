import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Sequence,
} from "remotion";

export type AICharacterScene = {
  type: "intro" | "character" | "stat" | "comparison" | "list" | "outro";
  imageUrl?: string; // URL gambar dari Replicate
  title?: string;
  subtitle?: string;
  value?: string;
  unit?: string;
  description?: string;
  items?: string[];
  label1?: string;
  label2?: string;
  value1?: number;
  value2?: number;
  duration?: number; // dalam frame (default 90 = 3 detik)
};

export type AICharacterVideoProps = {
  scenes: AICharacterScene[];
  bgColor?: string;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  characterName?: string;
  characterTitle?: string;
  characterImageUrl?: string; // Gambar karakter utama dari Replicate
};

const defaultProps: AICharacterVideoProps = {
  scenes: [
    {
      type: "character",
      title: "Elon Musk",
      subtitle: "CEO Tesla & SpaceX",
      duration: 90,
    },
    {
      type: "stat",
      title: "Net Worth",
      value: "$250",
      unit: "BILLION",
      description: "Orang terkaya di dunia",
      duration: 90,
    },
  ],
  bgColor: "#0a0a1a",
  accentColor: "#f97316",
  textColor: "#ffffff",
  characterName: "Elon Musk",
  characterTitle: "Entrepreneur & Visionary",
};

// Scene: Intro dengan gambar karakter besar
const CharacterScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
  characterImageUrl?: string;
}> = ({ scene, accentColor, textColor, bgColor, characterImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imageScale = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, from: 0.85, to: 1 });
  const imageOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const textY = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 100 }, from: 30, to: 0 });
  const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  const imgUrl = scene.imageUrl || characterImageUrl;

  return (
    <AbsoluteFill style={{ background: bgColor, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Stars background */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            borderRadius: "50%",
            background: "white",
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            opacity: 0.3 + (i % 5) * 0.1,
          }}
        />
      ))}

      {/* Karakter gambar AI */}
      {imgUrl && (
        <div
          style={{
            transform: `scale(${imageScale})`,
            opacity: imageOpacity,
            width: 320,
            height: 400,
            borderRadius: 20,
            overflow: "hidden",
            border: `3px solid ${accentColor}`,
            boxShadow: `0 0 40px ${accentColor}60`,
            marginBottom: 30,
          }}
        >
          <Img
            src={imgUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Nama & Jabatan */}
      <div
        style={{
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: textColor,
            fontFamily: "sans-serif",
            letterSpacing: -1,
            textShadow: `0 0 30px ${accentColor}80`,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            fontSize: 22,
            color: accentColor,
            fontFamily: "sans-serif",
            fontWeight: 600,
            marginTop: 8,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {scene.subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene: Stat dengan count-up
const StatScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
  characterImageUrl?: string;
}> = ({ scene, accentColor, textColor, bgColor, characterImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame, fps, config: { damping: 25, stiffness: 60 }, from: 0, to: 1 });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = spring({ frame, fps, config: { damping: 20, stiffness: 80 }, from: 0.9, to: 1 });

  return (
    <AbsoluteFill style={{ background: bgColor, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40 }}>
      {/* Gambar karakter kecil di sisi kiri */}
      {characterImageUrl && (
        <div
          style={{
            opacity: imgOpacity,
            transform: `scale(${imgScale})`,
            width: 200,
            height: 260,
            borderRadius: 16,
            overflow: "hidden",
            border: `2px solid ${accentColor}60`,
            flexShrink: 0,
          }}
        >
          <Img src={characterImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* Data */}
      <div style={{ textAlign: "center", opacity: titleOpacity }}>
        <div style={{ fontSize: 22, color: accentColor, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
          {scene.title}
        </div>
        <div style={{ fontSize: 100, fontWeight: 900, color: textColor, fontFamily: "sans-serif", lineHeight: 1, textShadow: `0 0 40px ${accentColor}` }}>
          {scene.value}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: accentColor, fontFamily: "sans-serif", letterSpacing: 4, marginTop: 8 }}>
          {scene.unit}
        </div>
        {scene.description && (
          <div style={{ fontSize: 18, color: `${textColor}99`, fontFamily: "sans-serif", marginTop: 16, maxWidth: 300 }}>
            {scene.description}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ width: 300, height: 6, background: `${accentColor}30`, borderRadius: 3, marginTop: 24, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: accentColor, borderRadius: 3 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene: Comparison (dua nilai)
const ComparisonScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
}> = ({ scene, accentColor, textColor, bgColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bar1 = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 60 }, from: 0, to: scene.value1 || 80 });
  const bar2 = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 60 }, from: 0, to: scene.value2 || 40 });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const maxVal = Math.max(scene.value1 || 80, scene.value2 || 40);

  return (
    <AbsoluteFill style={{ background: bgColor, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: titleOpacity, width: "80%" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: accentColor, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 40 }}>
          {scene.title}
        </div>

        {/* Bar chart perbandingan */}
        <div style={{ display: "flex", gap: 40, justifyContent: "center", alignItems: "flex-end", height: 250 }}>
          {/* Bar 1 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: textColor, fontFamily: "sans-serif" }}>
              {scene.value1?.toLocaleString()}
            </div>
            <div style={{
              width: 80,
              height: (bar1 / maxVal) * 180,
              background: `linear-gradient(to top, ${accentColor}, ${accentColor}80)`,
              borderRadius: "8px 8px 0 0",
              boxShadow: `0 0 20px ${accentColor}60`,
            }} />
            <div style={{ fontSize: 16, color: `${textColor}cc`, fontFamily: "sans-serif", fontWeight: 600, textAlign: "center", maxWidth: 100 }}>
              {scene.label1}
            </div>
          </div>

          {/* Bar 2 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: textColor, fontFamily: "sans-serif" }}>
              {scene.value2?.toLocaleString()}
            </div>
            <div style={{
              width: 80,
              height: (bar2 / maxVal) * 180,
              background: `linear-gradient(to top, #6366f1, #6366f180)`,
              borderRadius: "8px 8px 0 0",
              boxShadow: `0 0 20px #6366f160`,
            }} />
            <div style={{ fontSize: 16, color: `${textColor}cc`, fontFamily: "sans-serif", fontWeight: 600, textAlign: "center", maxWidth: 100 }}>
              {scene.label2}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene: List items
const ListScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
  characterImageUrl?: string;
}> = ({ scene, accentColor, textColor, bgColor, characterImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: bgColor, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "85%", opacity: titleOpacity }}>
        {/* Header dengan gambar kecil */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
          {characterImageUrl && (
            <div style={{ width: 70, height: 90, borderRadius: 12, overflow: "hidden", border: `2px solid ${accentColor}`, flexShrink: 0 }}>
              <Img src={characterImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ fontSize: 30, fontWeight: 800, color: textColor, fontFamily: "sans-serif" }}>
            {scene.title}
          </div>
        </div>

        {/* List items */}
        {(scene.items || []).map((item, i) => {
          const itemOpacity = interpolate(frame, [20 + i * 12, 35 + i * 12], [0, 1], { extrapolateRight: "clamp" });
          const itemX = interpolate(frame, [20 + i * 12, 35 + i * 12], [-30, 0], { extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 18,
                opacity: itemOpacity,
                transform: `translateX(${itemX}px)`,
                background: `${accentColor}15`,
                borderRadius: 12,
                padding: "14px 20px",
                borderLeft: `4px solid ${accentColor}`,
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 900,
                color: "#000",
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 22, color: textColor, fontFamily: "sans-serif", fontWeight: 600 }}>
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene: Outro
const OutroScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
  characterImageUrl?: string;
}> = ({ scene, accentColor, textColor, bgColor, characterImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 15, stiffness: 60 }, from: 0.8, to: 1 });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame / 15) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ background: bgColor, alignItems: "center", justifyContent: "center" }}>
      {/* Glow background */}
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
        opacity: glowPulse,
      }} />

      <div style={{ textAlign: "center", opacity, transform: `scale(${scale})` }}>
        {characterImageUrl && (
          <div style={{
            width: 120,
            height: 150,
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            overflow: "hidden",
            border: `3px solid ${accentColor}`,
            margin: "0 auto 24px",
            boxShadow: `0 0 30px ${accentColor}80`,
          }}>
            <Img src={characterImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ fontSize: 42, fontWeight: 900, color: textColor, fontFamily: "sans-serif", marginBottom: 12 }}>
          {scene.title}
        </div>
        {scene.subtitle && (
          <div style={{ fontSize: 20, color: accentColor, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 2 }}>
            {scene.subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Intro scene
const IntroScene: React.FC<{
  scene: AICharacterScene;
  accentColor: string;
  textColor: string;
  bgColor: string;
}> = ({ scene, accentColor, textColor, bgColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, from: 0.7, to: 1 });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [30, 60], [0, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: bgColor, alignItems: "center", justifyContent: "center" }}>
      {/* Stars */}
      {[...Array(40)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: (i % 3) + 1,
          height: (i % 3) + 1,
          borderRadius: "50%",
          background: "white",
          left: `${(i * 43) % 100}%`,
          top: `${(i * 67) % 100}%`,
          opacity: 0.2 + (i % 4) * 0.15,
        }} />
      ))}

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, color: accentColor, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", opacity: subOpacity, marginBottom: 16 }}>
          {scene.subtitle}
        </div>
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: textColor,
          fontFamily: "sans-serif",
          letterSpacing: -2,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          textShadow: `0 0 60px ${accentColor}80`,
        }}>
          {scene.title}
        </div>
        <div style={{ width: lineWidth, height: 4, background: accentColor, borderRadius: 2, margin: "20px auto 0", boxShadow: `0 0 15px ${accentColor}` }} />
      </div>
    </AbsoluteFill>
  );
};

// Komponen utama
export const AICharacterVideo: React.FC<AICharacterVideoProps> = (props) => {
  const {
    scenes = defaultProps.scenes!,
    bgColor = "#0a0a1a",
    accentColor = "#f97316",
    textColor = "#ffffff",
    characterImageUrl,
  } = props;

  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {scenes.map((scene, i) => {
        const duration = scene.duration || 90;
        const startFrame = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 90), 0);

        return (
          <Sequence key={i} from={startFrame} durationInFrames={duration}>
            {scene.type === "intro" && (
              <IntroScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} />
            )}
            {scene.type === "character" && (
              <CharacterScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} characterImageUrl={characterImageUrl} />
            )}
            {scene.type === "stat" && (
              <StatScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} characterImageUrl={characterImageUrl} />
            )}
            {scene.type === "comparison" && (
              <ComparisonScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} />
            )}
            {scene.type === "list" && (
              <ListScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} characterImageUrl={characterImageUrl} />
            )}
            {scene.type === "outro" && (
              <OutroScene scene={scene} accentColor={accentColor} textColor={textColor} bgColor={bgColor} characterImageUrl={characterImageUrl} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
