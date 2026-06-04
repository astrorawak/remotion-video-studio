import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface MobileAppProps {
  appName?: string;
  scenario?: 'checkout' | 'success' | 'onboarding' | 'notification';
  primaryColor?: string;
  bgColor?: string;
  title?: string;
  subtitle?: string;
}

export const MobileAppScene: React.FC<MobileAppProps> = ({
  appName = 'PayQuick',
  scenario = 'checkout',
  primaryColor = '#6C63FF',
  bgColor = '#0A0A0F',
  title = 'Pembayaran Berhasil',
  subtitle = 'Transaksi Anda telah dikonfirmasi',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone entrance
  const phoneScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Screen content animations
  const scannerOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });
  const scanLineY = interpolate(frame, [30, 90], [0, 180], { extrapolateRight: 'clamp' });
  const scanLineOpacity = interpolate(frame, [30, 40, 85, 95], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  // QR Code scan success
  const successOpacity = interpolate(frame, [95, 115], [0, 1], { extrapolateRight: 'clamp' });
  const checkScale = spring({ frame: frame - 95, fps, config: { damping: 10, stiffness: 150 } });
  const checkOpacity = interpolate(frame, [95, 110], [0, 1], { extrapolateRight: 'clamp' });

  // Ripple effect on success
  const ripple1 = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: 'clamp' });
  const ripple2 = interpolate(frame, [110, 150], [0, 1], { extrapolateRight: 'clamp' });
  const ripple3 = interpolate(frame, [120, 160], [0, 1], { extrapolateRight: 'clamp' });

  // Amount counter
  const amount = Math.round(interpolate(frame, [115, 145], [0, 150000], { extrapolateRight: 'clamp' }));

  // Background particles
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 50 + Math.cos(i * Math.PI / 4) * 30,
    y: 50 + Math.sin(i * Math.PI / 4) * 30,
    opacity: interpolate(frame, [100, 120, 160, 180], [0, 1, 1, 0], { extrapolateRight: 'clamp' }),
    scale: interpolate(frame, [100, 160], [0, 1], { extrapolateRight: 'clamp' }),
  }));

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #1a0a2e 0%, ${bgColor} 70%)`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}10 0%, transparent 70%)`,
      }} />

      {/* App name */}
      <div style={{
        position: 'absolute', top: 60,
        fontSize: 42, fontWeight: 900, color: '#fff',
        opacity: phoneOpacity,
        letterSpacing: '-1px',
      }}>
        {appName}
      </div>

      {/* Phone frame */}
      <div style={{
        transform: `scale(${Math.min(1, phoneScale)})`,
        opacity: phoneOpacity,
        position: 'relative',
      }}>
        <div style={{
          width: 280, height: 560,
          background: '#1a1a2e',
          borderRadius: 40,
          border: '3px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)`,
          position: 'relative',
        }}>
          {/* Status bar */}
          <div style={{
            height: 44, background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', fontSize: 12, color: 'rgba(255,255,255,0.7)',
          }}>
            <span>9:41</span>
            <div style={{
              width: 80, height: 20, background: '#000',
              borderRadius: 10, position: 'absolute', left: '50%',
              transform: 'translateX(-50%)',
            }} />
            <span>●●●</span>
          </div>

          {/* App header */}
          <div style={{
            padding: '16px 20px 12px',
            background: `linear-gradient(180deg, ${primaryColor}20, transparent)`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {scenario === 'checkout' ? 'Scan & Pay' : title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {scenario === 'checkout' ? 'Arahkan kamera ke QR Code' : subtitle}
            </div>
          </div>

          {/* Main content area */}
          <div style={{
            flex: 1, padding: '0 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {/* QR Scanner box */}
            <div style={{
              width: 200, height: 200, position: 'relative',
              opacity: scannerOpacity,
              marginTop: 20,
            }}>
              {/* Corner brackets */}
              {[
                { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid' },
                { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid' },
                { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid' },
                { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid' },
              ].map((style, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 24, height: 24,
                  borderColor: primaryColor, ...style,
                }} />
              ))}

              {/* QR Code pattern */}
              <div style={{
                position: 'absolute', inset: 20,
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2, opacity: 0.6,
              }}>
                {Array.from({ length: 49 }, (_, i) => (
                  <div key={i} style={{
                    background: [0,1,2,7,8,14,42,43,49,48,47,35,36,37,38,39,40,41,21,28].includes(i)
                      ? '#fff' : 'transparent',
                    borderRadius: 1,
                  }} />
                ))}
              </div>

              {/* Scan line */}
              <div style={{
                position: 'absolute',
                left: 10, right: 10,
                top: 10 + scanLineY,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
                opacity: scanLineOpacity,
                boxShadow: `0 0 8px ${primaryColor}`,
              }} />

              {/* Success overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `${primaryColor}20`,
                borderRadius: 8,
                opacity: successOpacity,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Ripple circles */}
                {[ripple1, ripple2, ripple3].map((r, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: 40 + r * 160,
                    height: 40 + r * 160,
                    borderRadius: '50%',
                    border: `2px solid ${primaryColor}`,
                    opacity: (1 - r) * 0.5,
                  }} />
                ))}

                {/* Check icon */}
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `linear-gradient(135deg, #43E97B, #38F9D7)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: `scale(${Math.min(1, checkScale)})`,
                  opacity: checkOpacity,
                  boxShadow: '0 0 20px rgba(67,233,123,0.5)',
                  fontSize: 28,
                }}>
                  ✓
                </div>
              </div>
            </div>

            {/* Amount display */}
            <div style={{
              marginTop: 24, textAlign: 'center',
              opacity: interpolate(frame, [115, 130], [0, 1], { extrapolateRight: 'clamp' }),
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                Jumlah Pembayaran
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, color: '#fff',
                letterSpacing: '-1px',
              }}>
                Rp {amount.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Status badge */}
            <div style={{
              marginTop: 16,
              opacity: interpolate(frame, [130, 145], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `scale(${spring({ frame: frame - 130, fps, config: { damping: 12 } })})`,
            }}>
              <div style={{
                background: 'rgba(67,233,123,0.15)',
                border: '1px solid rgba(67,233,123,0.4)',
                borderRadius: 20, padding: '8px 20px',
                fontSize: 14, fontWeight: 600, color: '#43E97B',
              }}>
                ✓ Pembayaran Berhasil
              </div>
            </div>
          </div>
        </div>

        {/* Phone shadow */}
        <div style={{
          position: 'absolute', bottom: -20, left: '10%', right: '10%',
          height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,0.4)',
          filter: 'blur(10px)',
        }} />
      </div>
    </AbsoluteFill>
  );
};
