import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface Node {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  color?: string;
}

interface Connection {
  from: string;
  to: string;
  label?: string;
}

interface ArchDiagramProps {
  title: string;
  nodes?: Node[];
  connections?: Connection[];
  bgColor?: string;
}

const DEFAULT_NODES: Node[] = [
  { id: 'client', label: 'Client App', icon: '📱', x: 10, y: 45, color: '#6C63FF' },
  { id: 'cdn', label: 'CDN', icon: '🌐', x: 28, y: 20, color: '#4FACFE' },
  { id: 'lb', label: 'Load Balancer', icon: '⚖️', x: 45, y: 45, color: '#43E97B' },
  { id: 'api1', label: 'API Server 1', icon: '🖥️', x: 63, y: 25, color: '#F7971E' },
  { id: 'api2', label: 'API Server 2', icon: '🖥️', x: 63, y: 65, color: '#F7971E' },
  { id: 'db', label: 'Database', icon: '🗄️', x: 82, y: 35, color: '#FA709A' },
  { id: 'cache', label: 'Redis Cache', icon: '⚡', x: 82, y: 65, color: '#30CFD0' },
];

const DEFAULT_CONNECTIONS: Connection[] = [
  { from: 'client', to: 'cdn', label: 'HTTPS' },
  { from: 'client', to: 'lb', label: 'API' },
  { from: 'cdn', to: 'lb' },
  { from: 'lb', to: 'api1' },
  { from: 'lb', to: 'api2' },
  { from: 'api1', to: 'db' },
  { from: 'api2', to: 'db' },
  { from: 'api1', to: 'cache' },
  { from: 'api2', to: 'cache' },
];

export const ArchDiagramScene: React.FC<ArchDiagramProps> = ({
  title = 'System Architecture',
  nodes = DEFAULT_NODES,
  connections = DEFAULT_CONNECTIONS,
  bgColor = '#0D1117',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const W = 1280;
  const H = 720;

  // Title
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Node animations - staggered appearance
  const nodeAnimations = nodes.map((_, i) => ({
    scale: spring({ frame: frame - (10 + i * 8), fps, config: { damping: 12, stiffness: 100 } }),
    opacity: interpolate(frame, [10 + i * 8, 25 + i * 8], [0, 1], { extrapolateRight: 'clamp' }),
  }));

  // Connection line animations - appear after nodes
  const connAnimations = connections.map((_, i) => ({
    progress: interpolate(
      frame,
      [60 + i * 6, 80 + i * 6],
      [0, 1],
      { extrapolateRight: 'clamp' }
    ),
    opacity: interpolate(frame, [60 + i * 6, 70 + i * 6], [0, 1], { extrapolateRight: 'clamp' }),
  }));

  // Data flow animation (moving dots on connections)
  const flowOffset = (frame / 30) % 1;

  const getNodePos = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x / 100 * W, y: node.y / 100 * H };
  };

  return (
    <AbsoluteFill style={{
      background: bgColor,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(108,99,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(67,233,123,0.05) 0%, transparent 50%)`,
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 40, left: 60,
        opacity: titleOpacity,
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          System Design Overview
        </div>
      </div>

      {/* SVG for connections */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>

        {connections.map((conn, i) => {
          const from = getNodePos(conn.from);
          const to = getNodePos(conn.to);
          const anim = connAnimations[i];

          // Interpolate line drawing
          const midX = from.x + (to.x - from.x) * anim.progress;
          const midY = from.y + (to.y - from.y) * anim.progress;

          // Moving dot position
          const dotX = from.x + (to.x - from.x) * ((flowOffset + i * 0.15) % 1);
          const dotY = from.y + (to.y - from.y) * ((flowOffset + i * 0.15) % 1);

          return (
            <g key={i} opacity={anim.opacity}>
              <line
                x1={from.x} y1={from.y}
                x2={midX} y2={midY}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                markerEnd="url(#arrowhead)"
              />
              {/* Moving data packet */}
              {anim.progress > 0.9 && (
                <circle cx={dotX} cy={dotY} r={4} fill="#6C63FF" opacity={0.8}>
                </circle>
              )}
              {/* Connection label */}
              {conn.label && anim.progress > 0.5 && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 8}
                  fill="rgba(255,255,255,0.4)"
                  fontSize={11}
                  textAnchor="middle"
                >
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => {
        const anim = nodeAnimations[i];
        const px = node.x / 100 * W;
        const py = node.y / 100 * H;
        const color = node.color || '#6C63FF';

        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: px - 60,
              top: py - 45,
              width: 120,
              height: 90,
              opacity: anim.opacity,
              transform: `scale(${Math.min(1, anim.scale)})`,
              transformOrigin: 'center',
            }}
          >
            <div style={{
              background: `linear-gradient(135deg, ${color}20, ${color}10)`,
              border: `1.5px solid ${color}60`,
              borderRadius: 16,
              padding: '12px 8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: `0 4px 20px ${color}30`,
              height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <div style={{ fontSize: 24 }}>{node.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {node.label}
              </div>
            </div>
            {/* Glow dot */}
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 10, height: 10, borderRadius: '50%',
              background: '#43E97B',
              boxShadow: '0 0 8px #43E97B',
              opacity: interpolate(Math.sin((frame / 30) * Math.PI + i), [-1, 1], [0.4, 1]),
            }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
