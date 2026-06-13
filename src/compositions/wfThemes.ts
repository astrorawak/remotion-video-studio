// Theme system untuk WorkflowExplainer.
// Memungkinkan video MENGIKUTI gaya/warna gambar workflow (bukan template seragam).

export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  mode: ThemeMode;
  bg: string;          // warna latar dasar
  accent: string;      // aksen utama (highlight, tombol, garis)
  secondary: string;   // aksen kedua (gradien, chip)
  text: string;        // teks utama
  textMuted: string;   // teks sekunder
  card: string;        // latar kartu/poin
  cardBorder: string;  // border kartu/poin
  brandText: string;   // warna teks brand tag
}

export interface ThemeInput {
  theme?: string;        // nama preset, mis. 'light-terracotta'
  mode?: ThemeMode;      // override terang/gelap
  accentColor?: string;  // override aksen (dari warna dominan gambar)
  secondaryColor?: string;
  bgColor?: string;      // override latar manual
}

// Helper: ubah hex -> rgba string
const hexToRgba = (hex: string, alpha: number): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Bangun token untuk mode terang/gelap dari sepasang warna aksen.
const buildTokens = (mode: ThemeMode, bg: string, accent: string, secondary: string): ThemeTokens => {
  if (mode === 'light') {
    return {
      mode,
      bg,
      accent,
      secondary,
      text: '#1A1410',
      textMuted: 'rgba(26,20,16,0.62)',
      card: 'rgba(0,0,0,0.04)',
      cardBorder: hexToRgba(accent, 0.5),
      brandText: '#1A1410',
    };
  }
  return {
    mode,
    bg,
    accent,
    secondary,
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.72)',
    card: 'rgba(255,255,255,0.05)',
    cardBorder: hexToRgba(accent, 0.5),
    brandText: '#ffffff',
  };
};

// ─── PRESET (minimal 8 agar tidak monoton) ────────────────────────────────────
export const THEME_PRESETS: Record<string, ThemeTokens> = {
  // Brand lama (default)
  'dark-purple': buildTokens('dark', '#0B0710', '#7B3FA0', '#A855F7'),
  // Gaya kreator referensi (Devini): off-white + terracotta
  'light-terracotta': buildTokens('light', '#F5EFE9', '#D9663F', '#E08A5F'),
  'dark-emerald': buildTokens('dark', '#06120D', '#10B981', '#34D399'),
  'light-blue': buildTokens('light', '#EEF3FB', '#2563EB', '#3B82F6'),
  'dark-gold': buildTokens('dark', '#0E0A05', '#D4A24E', '#F2C572'),
  'dark-crimson': buildTokens('dark', '#120608', '#E11D48', '#FB7185'),
  'light-mono': buildTokens('light', '#F2F1EE', '#111111', '#444444'),
  'dark-cyan': buildTokens('dark', '#04101A', '#06B6D4', '#22D3EE'),
};

const DEFAULT_BG_FOR_MODE: Record<ThemeMode, string> = {
  dark: '#0B0710',
  light: '#F5EFE9',
};

// Resolve token akhir: preset -> override warna -> default.
export const resolveTheme = (input: ThemeInput): ThemeTokens => {
  let base: ThemeTokens | undefined =
    input.theme && THEME_PRESETS[input.theme] ? { ...THEME_PRESETS[input.theme] } : undefined;

  // Jika ada accentColor manual tanpa preset, bangun token dari mode.
  const mode: ThemeMode = input.mode || base?.mode || 'dark';

  if (!base) {
    const accent = input.accentColor || '#7B3FA0';
    const secondary = input.secondaryColor || accent;
    const bg = input.bgColor || DEFAULT_BG_FOR_MODE[mode];
    base = buildTokens(mode, bg, accent, secondary);
  }

  // Terapkan override di atas preset bila ada.
  if (input.accentColor) base.accent = input.accentColor;
  if (input.secondaryColor) base.secondary = input.secondaryColor;
  if (input.bgColor) base.bg = input.bgColor;
  if (input.mode && input.mode !== base.mode) {
    // Re-derive teks/kartu sesuai mode baru namun pertahankan warna aksen.
    base = buildTokens(input.mode, input.bgColor || DEFAULT_BG_FOR_MODE[input.mode], base.accent, base.secondary);
  }
  // pastikan cardBorder selaras accent terbaru
  base.cardBorder = hexToRgba(base.accent, 0.5);

  return base;
};

export { hexToRgba };
