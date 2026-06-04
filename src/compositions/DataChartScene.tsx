import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

interface DataChartProps {
  title: string;
  subtitle?: string;
  data: DataItem[];
  unit?: string;
  chartType?: 'bar' | 'race';
  bgColor?: string;
  accentColor?: string;
}

const COLORS = [
  '#6C63FF', '#FF6584', '#43E97B', '#F7971E', '#4FACFE',
  '#FA709A', '#00F2FE', '#30CFD0', '#667EEA', '#F093FB',
];

export const DataChartScene: React.FC<DataChartProps> = ({
  title = 'Data Visualization',
  subtitle = '',
  data = [
    { label: 'Indonesia', value: 275 },
    { label: 'Malaysia', value: 33 },
    { label: 'Thailand', value: 72 },
    { label: 'Vietnam', value: 97 },
    { label: 'Philippines', value: 115 },
  ],
  unit = 'juta',
  chartType = 'bar',
  bgColor = '#0D1117',
  accentColor = '#6C63FF',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sort data by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...sortedData.map(d => d.value));

  // Title entrance
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [-30, 0], { extrapolateRight: 'clamp' });

  // Bar animations - staggered
  const barAnimations = sortedData.map((item, i) => {
    const startFrame = 20 + i * 8;
    const width = interpolate(
      frame,
      [startFrame, startFrame + 40],
      [0, (item.value / maxValue) * 100],
      { extrapolateRight: 'clamp' }
    );
    const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateRight: 'clamp' });
    const labelX = interpolate(frame, [startFrame, startFrame + 40], [-20, 0], { extrapolateRight: 'clamp' });
    const valueOpacity = interpolate(frame, [startFrame + 30, startFrame + 45], [0, 1], { extrapolateRight: 'clamp' });
    return { width, opacity, labelX, valueOpacity };
  });

  // Counter animation for total
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const animatedTotal = Math.round(
    interpolate(frame, [20, 120], [0, totalValue], { extrapolateRight: 'clamp' })
  );

  // Axis line entrance
  const axisWidth = interpolate(frame, [10, 30], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: bgColor,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }} />

      <div style={{ padding: '60px 80px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginBottom: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
          }}>
            <div style={{
              width: 6, height: 40, borderRadius: 3,
              background: `linear-gradient(180deg, ${accentColor}, #FF6584)`,
            }} />
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Axis line */}
        <div style={{
          width: `${axisWidth}%`, height: 2,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          marginBottom: 32, borderRadius: 1,
        }} />

        {/* Bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          {sortedData.map((item, i) => {
            const color = item.color || COLORS[i % COLORS.length];
            const anim = barAnimations[i];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                opacity: anim.opacity,
              }}>
                {/* Label */}
                <div style={{
                  width: 160, textAlign: 'right', fontSize: 16,
                  fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                  transform: `translateX(${anim.labelX}px)`,
                  flexShrink: 0,
                }}>
                  {item.label}
                </div>

                {/* Bar container */}
                <div style={{
                  flex: 1, height: 44, background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8, overflow: 'hidden', position: 'relative',
                }}>
                  {/* Bar fill */}
                  <div style={{
                    width: `${anim.width}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    borderRadius: 8,
                    boxShadow: `0 0 20px ${color}40`,
                    transition: 'none',
                  }} />
                </div>

                {/* Value */}
                <div style={{
                  width: 100, fontSize: 18, fontWeight: 700,
                  color: color, opacity: anim.valueOpacity,
                  flexShrink: 0,
                }}>
                  {item.value.toLocaleString()} {unit}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 40,
          marginTop: 24, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>
              {animatedTotal.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Total {unit}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#43E97B' }}>
              {sortedData[0]?.label}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Tertinggi</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
