// ─────────────────────────────────────────────
// The Last Fold: Kalimantan's Lament — global constants
// 30s vertical short (1080x1920 @ 30fps = 900 frames)
// ─────────────────────────────────────────────

export const VIDEO = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 900,
};

// Scene timing is fixed by the storyboard — frames, not seconds.
export const SCENES = {
  SCENE_01: { from: 0, duration: 240 }, // Hutan origami rimbun — slow dolly out
  SCENE_02: { from: 240, duration: 150 }, // Transisi lipatan pertama
  SCENE_03: { from: 390, duration: 300 }, // Invasi sawit geometris — shaky cam
  SCENE_04: { from: 690, duration: 210 }, // Fade to black + final text
};

export const COLORS = {
  // Paper base
  paperCream: '#F3EBD8',
  paperShade: '#E2D6BC',
  skyDawn: '#E8DCC0',

  // Scene 1 — lush origami forest
  forestDeep: '#1E4D2B',
  forestMid: '#2E7D46',
  forestLight: '#5BA36F',
  leafHighlight: '#8FC9A0',
  trunkBrown: '#6B4A2F',
  trunkShadow: '#4A331F',
  mossGround: '#7FA872',

  // Scene 3 — industrial monoculture
  palmDull: '#7A8C3F',
  palmDark: '#55622C',
  ochre: '#C4923A',
  ochreShadow: '#9A6F2A',
  earthScar: '#8C5A33',
  earthDark: '#6E4526',
  hazeSmoke: '#B8AB93',

  // Scene 4 — lament
  nearBlack: '#0C0B09',
  textCream: '#EFE7D4',
};

// Repo convention: CSS font stacks, no webfont loading.
export const FONTS = {
  sans: "'Inter', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif",
};
