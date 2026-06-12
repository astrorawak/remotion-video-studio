import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

// ════════════════════════════════════════════════════════════════
// TRADING SCENES — Visual finansial profesional & berkelas
// Semua komponen responsif: membaca width/height via useVideoConfig()
// sehingga bisa render portrait (TikTok/IG), landscape (YouTube), square.
// Background gelap solid agar bisa di-blend "Screen" di CapCut sebagai overlay.
// ════════════════════════════════════════════════════════════════

const FONT_SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Roboto Mono', monospace";

const COL_UP = '#00E08A';
const COL_DOWN = '#FF4D5E';
const COL_BG = '#080A12';

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Film grain + vignette untuk kesan premium (mengurangi tampilan "flat AI")
const GrainVignette: React.FC<{ accent?: string }> = ({ accent = '#7B3FA0' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(0,0,0,0.55) 100%)`,
        pointerEvents: 'none', zIndex: 50,
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, zIndex: 51, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        transform: `translate(${(frame % 3) - 1}px, ${(frame % 2)}px)`,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.6, zIndex: 52,
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// 1. STOCK TICKER — pita harga berjalan ala Bloomberg/CNBC
// ─────────────────────────────────────────────────────────────
export interface TickerItem { symbol: string; price: number; changePct: number; }
export const StockTickerScene: React.FC<{
  items?: TickerItem[];
  title?: string;
  subtitle?: string;
  accentColor?: string;
}> = ({
  items = [],
  title = 'MARKET WATCH',
  subtitle = 'LIVE',
  accentColor = '#7B3FA0',
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;

  const data = items.length ? items : [
    { symbol: 'BTC', price: 71234.5, changePct: 3.42 },
    { symbol: 'ETH', price: 3842.1, changePct: 2.15 },
    { symbol: 'IHSG', price: 7321.8, changePct: -0.87 },
    { symbol: 'USD/IDR', price: 16245, changePct: 0.34 },
    { symbol: 'GOLD', price: 2387.6, changePct: 1.05 },
    { symbol: 'NASDAQ', price: 18342.2, changePct: -1.23 },
  ];

  const titleProg = spring({ frame, fps, config: { damping: 18 } });
  // Pita berjalan: dua salinan agar loop mulus
  const loop = data.concat(data);
  const scrollSpeed = isPortrait ? 2.6 : 3.4;
  const scrollX = -((frame * scrollSpeed) % (width));

  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width, height, background: COL_BG, position: 'relative', overflow: 'hidden', fontFamily: FONT_SANS, opacity: fadeOut }}>
      {/* Glow latar */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${accentColor}22, transparent 60%)` }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: isPortrait ? '12%' : '14%', left: 0, right: 0,
        textAlign: 'center', transform: `translateY(${(1 - titleProg) * -40}px)`, opacity: titleProg,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14,
          padding: '10px 26px', borderRadius: 999,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}66`,
        }}>
          <span style={{ width: 12, height: 12, borderRadius: 999, background: COL_DOWN, boxShadow: `0 0 16px ${COL_DOWN}`, opacity: 0.6 + 0.4 * Math.sin(frame / 6) }} />
          <span style={{ color: '#fff', fontSize: isPortrait ? 26 : 30, fontWeight: 800, letterSpacing: 6 }}>{subtitle}</span>
        </div>
        <h1 style={{
          color: '#fff', fontSize: isPortrait ? 64 : 84, fontWeight: 900, margin: '24px 0 0',
          letterSpacing: -1, textShadow: `0 0 40px ${accentColor}88`,
        }}>{title}</h1>
      </div>

      {/* Kartu harga grid (statis, fokus) */}
      <div style={{
        position: 'absolute', top: isPortrait ? '34%' : '40%', left: '6%', right: '6%',
        display: 'grid', gridTemplateColumns: isPortrait ? '1fr 1fr' : '1fr 1fr 1fr', gap: isPortrait ? 18 : 24,
      }}>
        {data.slice(0, 6).map((it, i) => {
          const up = it.changePct >= 0;
          const appear = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 16 } });
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${up ? COL_UP : COL_DOWN}44`,
              borderRadius: 18, padding: isPortrait ? '20px 22px' : '24px 28px',
              transform: `translateY(${(1 - appear) * 30}px) scale(${0.92 + appear * 0.08})`, opacity: appear,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: '#9aa0b5', fontSize: isPortrait ? 24 : 26, fontWeight: 700, letterSpacing: 1, fontFamily: FONT_MONO }}>{it.symbol}</div>
              <div style={{ color: '#fff', fontSize: isPortrait ? 40 : 46, fontWeight: 800, margin: '6px 0', fontFamily: FONT_MONO }}>
                {fmtNum(it.price, it.price > 1000 ? 0 : 2)}
              </div>
              <div style={{ color: up ? COL_UP : COL_DOWN, fontSize: isPortrait ? 28 : 30, fontWeight: 800, fontFamily: FONT_MONO }}>
                {up ? '▲' : '▼'} {up ? '+' : ''}{fmtNum(it.changePct)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Pita berjalan bawah */}
      <div style={{
        position: 'absolute', bottom: isPortrait ? '10%' : '8%', left: 0, right: 0, height: isPortrait ? 90 : 78,
        background: 'rgba(0,0,0,0.6)', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}`,
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', gap: 0, transform: `translateX(${scrollX}px)`, whiteSpace: 'nowrap' }}>
          {loop.map((it, i) => {
            const up = it.changePct >= 0;
            return (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 36px', fontFamily: FONT_MONO }}>
                <span style={{ color: '#fff', fontSize: isPortrait ? 30 : 32, fontWeight: 800 }}>{it.symbol}</span>
                <span style={{ color: '#cfd3e0', fontSize: isPortrait ? 28 : 30 }}>{fmtNum(it.price, it.price > 1000 ? 0 : 2)}</span>
                <span style={{ color: up ? COL_UP : COL_DOWN, fontSize: isPortrait ? 28 : 30, fontWeight: 800 }}>
                  {up ? '+' : ''}{fmtNum(it.changePct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <GrainVignette accent={accentColor} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. CANDLESTICK CHART — chart candlestick trading dengan animasi reveal
// ─────────────────────────────────────────────────────────────
export interface Candle { o: number; h: number; l: number; c: number; }
export const CandlestickScene: React.FC<{
  candles?: Candle[];
  symbol?: string;
  timeframe?: string;
  priceLabel?: string;
  changePct?: number;
  accentColor?: string;
}> = ({
  candles = [],
  symbol = 'BTC/USD',
  timeframe = '4H',
  priceLabel = '',
  changePct = 0,
  accentColor = '#7B3FA0',
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;

  // Data default: tren naik realistis dengan koreksi
  const data: Candle[] = candles.length ? candles : (() => {
    const arr: Candle[] = [];
    let price = 100;
    for (let i = 0; i < 24; i++) {
      const drift = Math.sin(i / 3) * 4 + (i * 0.8) + (Math.random() - 0.4) * 6;
      const o = price;
      const c = price + drift;
      const h = Math.max(o, c) + Math.random() * 4;
      const l = Math.min(o, c) - Math.random() * 4;
      arr.push({ o, h, l, c });
      price = c;
    }
    return arr;
  })();

  const allHigh = Math.max(...data.map(d => d.h));
  const allLow = Math.min(...data.map(d => d.l));
  const range = allHigh - allLow || 1;

  const chartLeft = width * 0.08;
  const chartRight = width * 0.92;
  const chartTop = height * (isPortrait ? 0.34 : 0.30);
  const chartBottom = height * (isPortrait ? 0.80 : 0.84);
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;
  const candleSlot = chartW / data.length;
  const candleW = candleSlot * 0.6;

  const yOf = (v: number) => chartTop + (1 - (v - allLow) / range) * chartH;

  const titleProg = spring({ frame, fps, config: { damping: 18 } });
  const up = changePct >= 0;
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width, height, background: COL_BG, position: 'relative', overflow: 'hidden', fontFamily: FONT_SANS, opacity: fadeOut }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 70% 20%, ${accentColor}1f, transparent 55%)` }} />

      {/* Header simbol */}
      <div style={{ position: 'absolute', top: isPortrait ? '13%' : '12%', left: '8%', right: '8%', transform: `translateY(${(1 - titleProg) * -30}px)`, opacity: titleProg }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontSize: isPortrait ? 56 : 64, fontWeight: 900, fontFamily: FONT_MONO }}>{symbol}</span>
          <span style={{ color: accentColor, fontSize: isPortrait ? 26 : 28, fontWeight: 800, padding: '4px 14px', border: `1px solid ${accentColor}`, borderRadius: 8 }}>{timeframe}</span>
        </div>
        {(priceLabel || changePct !== 0) && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 10, fontFamily: FONT_MONO }}>
            {priceLabel ? <span style={{ color: '#fff', fontSize: isPortrait ? 44 : 50, fontWeight: 800 }}>{priceLabel}</span> : null}
            <span style={{ color: up ? COL_UP : COL_DOWN, fontSize: isPortrait ? 32 : 36, fontWeight: 800 }}>
              {up ? '▲ +' : '▼ '}{fmtNum(changePct)}%
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <svg style={{ position: 'absolute', inset: 0 }} width={width} height={height}>
        {Array.from({ length: 5 }).map((_, i) => {
          const y = chartTop + (chartH / 4) * i;
          const val = allHigh - (range / 4) * i;
          return (
            <g key={i}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />
              <text x={chartRight + 8} y={y + 6} fill="#6b7185" fontSize={isPortrait ? 22 : 20} fontFamily={FONT_MONO}>{fmtNum(val, 0)}</text>
            </g>
          );
        })}

        {/* Candles reveal progresif */}
        {data.map((d, i) => {
          const revealStart = 12 + i * 1.6;
          const rev = interpolate(frame, [revealStart, revealStart + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          if (rev <= 0) return null;
          const cx = chartLeft + candleSlot * i + candleSlot / 2;
          const bull = d.c >= d.o;
          const color = bull ? COL_UP : COL_DOWN;
          const bodyTop = yOf(Math.max(d.o, d.c));
          const bodyBot = yOf(Math.min(d.o, d.c));
          const bodyH = Math.max(2, (bodyBot - bodyTop) * rev);
          return (
            <g key={i} opacity={rev}>
              <line x1={cx} y1={yOf(d.h)} x2={cx} y2={yOf(d.l)} stroke={color} strokeWidth={2} />
              <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={2} />
            </g>
          );
        })}

        {/* Garis harga terakhir */}
        {(() => {
          const last = data[data.length - 1];
          const ly = yOf(last.c);
          const dash = interpolate(frame, [data.length * 1.6 + 14, data.length * 1.6 + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <line x1={chartLeft} y1={ly} x2={chartLeft + chartW * dash} y2={ly} stroke={accentColor} strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
          );
        })()}
      </svg>

      <GrainVignette accent={accentColor} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. BREAKING NEWS — banner berita finansial ala TV
// ─────────────────────────────────────────────────────────────
export const BreakingNewsScene: React.FC<{
  headline?: string;
  source?: string;
  ticker?: string;
  category?: string;
  accentColor?: string;
}> = ({
  headline = 'FED HOLDS RATES STEADY AT 4.25%',
  source = 'BLOOMBERG',
  ticker = 'Markets react cautiously · Dollar steady · Asian futures mixed',
  category = 'BREAKING',
  accentColor = '#FF4D5E',
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;

  const badgeProg = spring({ frame, fps, config: { damping: 14 } });
  const barProg = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const headProg = spring({ frame: frame - 14, fps, config: { damping: 20 } });
  const tickerX = -((frame * 3) % (width * 1.5));
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width, height, background: COL_BG, position: 'relative', overflow: 'hidden', fontFamily: FONT_SANS, opacity: fadeOut }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${accentColor}11 100%)` }} />

      {/* Konten utama di bawah-tengah (ruang atas utk wajah) */}
      <div style={{ position: 'absolute', bottom: isPortrait ? '18%' : '14%', left: 0, right: 0 }}>
        {/* Badge kategori */}
        <div style={{ paddingLeft: '6%', transform: `translateX(${(1 - badgeProg) * -60}px)`, opacity: badgeProg }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: accentColor, color: '#fff', fontWeight: 900,
            fontSize: isPortrait ? 32 : 34, letterSpacing: 3, padding: '10px 24px', borderRadius: 6,
            boxShadow: `0 0 30px ${accentColor}aa`,
          }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: '#fff', opacity: 0.5 + 0.5 * Math.sin(frame / 5) }} />
            {category}
          </span>
        </div>

        {/* Bar headline */}
        <div style={{
          marginTop: 18, background: 'rgba(8,10,18,0.92)', borderLeft: `10px solid ${accentColor}`,
          padding: isPortrait ? '26px 6% 26px 6%' : '30px 6%',
          transform: `scaleX(${barProg})`, transformOrigin: 'left', 
        }}>
          <h1 style={{
            color: '#fff', fontSize: isPortrait ? 52 : 60, fontWeight: 900, margin: 0, lineHeight: 1.1,
            opacity: headProg, letterSpacing: -0.5,
          }}>{headline}</h1>
          <div style={{ color: '#8b91a6', fontSize: isPortrait ? 26 : 28, fontWeight: 700, marginTop: 14, letterSpacing: 1, opacity: headProg }}>
            SOURCE: {source}
          </div>
        </div>
      </div>

      {/* Ticker berjalan paling bawah */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: isPortrait ? 76 : 64,
        background: accentColor, display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <span style={{ background: '#000', color: '#fff', fontWeight: 900, fontSize: isPortrait ? 28 : 26, padding: '0 22px', height: '100%', display: 'flex', alignItems: 'center', letterSpacing: 2 }}>LIVE</span>
        <div style={{ whiteSpace: 'nowrap', transform: `translateX(${tickerX}px)`, color: '#fff', fontWeight: 700, fontSize: isPortrait ? 28 : 27, fontFamily: FONT_MONO }}>
          {ticker} &nbsp;·&nbsp; {ticker} &nbsp;·&nbsp; {ticker}
        </div>
      </div>

      <GrainVignette accent={accentColor} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 4. MARKET DASHBOARD — counter angka besar + multi-metrik
// ─────────────────────────────────────────────────────────────
export interface Metric { label: string; value: number; suffix?: string; prefix?: string; changePct?: number; }
export const MarketDashboardScene: React.FC<{
  title?: string;
  subtitle?: string;
  metrics?: Metric[];
  accentColor?: string;
}> = ({
  title = 'MARKET SNAPSHOT',
  subtitle = 'Today · Key Numbers',
  metrics = [],
  accentColor = '#7B3FA0',
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;

  const data: Metric[] = metrics.length ? metrics : [
    { label: 'S&P 500', value: 5234.18, changePct: 0.62 },
    { label: 'BITCOIN', value: 71234, prefix: '$', changePct: 3.4 },
    { label: 'INFLATION', value: 3.2, suffix: '%', changePct: -0.3 },
    { label: 'USD/IDR', value: 16245, prefix: 'Rp', changePct: 0.34 },
  ];

  const titleProg = spring({ frame, fps, config: { damping: 18 } });
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width, height, background: COL_BG, position: 'relative', overflow: 'hidden', fontFamily: FONT_SANS, opacity: fadeOut }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 25%, ${accentColor}22, transparent 60%)` }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: isPortrait ? '12%' : '13%', left: 0, right: 0, textAlign: 'center', transform: `translateY(${(1 - titleProg) * -40}px)`, opacity: titleProg }}>
        <h1 style={{ color: '#fff', fontSize: isPortrait ? 60 : 76, fontWeight: 900, margin: 0, letterSpacing: -1, textShadow: `0 0 40px ${accentColor}88` }}>{title}</h1>
        <p style={{ color: '#8b91a6', fontSize: isPortrait ? 28 : 30, fontWeight: 600, marginTop: 12, letterSpacing: 2 }}>{subtitle}</p>
      </div>

      {/* Grid metrik dengan counter */}
      <div style={{
        position: 'absolute', top: isPortrait ? '32%' : '38%', left: '6%', right: '6%',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isPortrait ? 22 : 30,
      }}>
        {data.slice(0, 4).map((m, i) => {
          const appear = spring({ frame: frame - 12 - i * 6, fps, config: { damping: 15 } });
          const countProg = interpolate(frame, [12 + i * 6, 42 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          const shown = m.value * countProg;
          const up = (m.changePct ?? 0) >= 0;
          const decimals = m.value % 1 !== 0 ? 2 : 0;
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}33`, borderRadius: 22,
              padding: isPortrait ? '26px 24px' : '34px 32px',
              transform: `translateY(${(1 - appear) * 40}px) scale(${0.9 + appear * 0.1})`, opacity: appear,
            }}>
              <div style={{ color: '#9aa0b5', fontSize: isPortrait ? 26 : 28, fontWeight: 700, letterSpacing: 1 }}>{m.label}</div>
              <div style={{ color: '#fff', fontSize: isPortrait ? 50 : 60, fontWeight: 900, margin: '8px 0', fontFamily: FONT_MONO }}>
                {m.prefix || ''}{fmtNum(shown, decimals)}{m.suffix || ''}
              </div>
              {m.changePct !== undefined && (
                <div style={{ color: up ? COL_UP : COL_DOWN, fontSize: isPortrait ? 28 : 30, fontWeight: 800, fontFamily: FONT_MONO }}>
                  {up ? '▲ +' : '▼ '}{fmtNum(m.changePct)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      <GrainVignette accent={accentColor} />
    </div>
  );
};
