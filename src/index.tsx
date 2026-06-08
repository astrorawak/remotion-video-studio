import React from 'react';
import { Composition, Series, registerRoot } from 'remotion';
import { TitleScene } from './compositions/TitleScene';
import { TextScene } from './compositions/TextScene';
import { TipsScene } from './compositions/TipsScene';
import { GoogleSearchScene } from './compositions/GoogleSearchScene';
import { LyricScene } from './compositions/LyricScene';
import { OutroScene } from './compositions/OutroScene';
import { GSAPLandingScene } from './compositions/GSAPLandingScene';
import { DataChartScene } from './compositions/DataChartScene';
import { ArchDiagramScene } from './compositions/ArchDiagramScene';
import { Product3DScene } from './compositions/Product3DScene';
import { MobileAppScene } from './compositions/MobileAppScene';
import { CinematicIntroScene } from './compositions/CinematicIntroScene';
import { SocialMediaScene } from './compositions/SocialMediaScene';
import { HUDScene } from './compositions/HUDScene';
import { AlgorithmicScene } from './compositions/AlgorithmicScene';
import { BrutalistScene } from './compositions/BrutalistScene';
import { SketchbookScene } from './compositions/SketchbookScene';
import { WhiteboardScene } from './compositions/WhiteboardScene';
import { KineticTypographyScene } from './compositions/KineticTypographyScene';
import { CommentExplosionScene } from './compositions/CommentExplosionScene';
import { VHSTimelineScene } from './compositions/VHSTimelineScene';
import { MacOSDockScene } from './compositions/MacOSDockScene';
import { YouTubeSubscribeScene } from './compositions/YouTubeSubscribeScene';
import { ExplainerVideoScene } from './compositions/ExplainerVideoScene';
import { CharacterAnimation } from './compositions/CharacterAnimation';
import { AICharacterVideo } from './compositions/AICharacterVideo';
import { BaranganehVideo } from './compositions/BaranganehVideo';

// ─────────────────────────────────────────────
// Multi-Scene Video Composition
// ─────────────────────────────────────────────
interface SceneData {
  type: string;
  text?: string;
  subtext?: string;
  tips?: string[];
  lyrics?: string[];
  cta?: string;
  searchQuery?: string;
  results?: string[];
  duration?: number;
  style?: string;
  // New fields for advanced scenes
  // v4.0 fields
  words?: string[];
  highlightWords?: string[];
  countdown?: number;
  stickies?: any[];
  points?: string[];
  author?: string;
  number?: string;
  bgLayout?: 'full' | 'split' | 'greenscreen';
  productName?: string;
  tagline?: string;
  features?: { icon: string; title: string; desc: string }[];
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  data?: { label: string; value: number; color?: string }[];
  unit?: string;
  chartType?: string;
  nodes?: any[];
  connections?: any[];
  parts?: any[];
  scenario?: string;
  headline?: string;
  stats?: { label: string; value: string; icon: string }[];
  bgGradient?: [string, string];
  username?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  appName?: string;
  // v5.0 fields
  comments?: { username: string; text: string; color?: string }[];
  events?: { year: string; title: string; description?: string }[];
  apps?: { name: string; emoji: string; color: string; badge?: number }[];
  bgStyle?: string;
  channelName?: string;
  targetSubscribers?: number;
  startSubscribers?: number;
  milestone?: string;
  body?: string;
  fontSize?: number;
}

interface MultiSceneVideoProps {
  scenes: SceneData[];
  style?: string;
  fps?: number;
}

const SceneRenderer: React.FC<{ scene: SceneData; style: string }> = ({ scene, style }) => {
  const s = scene.style || style;
  switch (scene.type) {
    // Original scenes
    case 'title_scene':
      return <TitleScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
    case 'text_scene':
      return <TextScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
    case 'tips_scene':
      return <TipsScene title={scene.text} tips={scene.tips || []} style={s} />;
    case 'lyric_scene':
      return <LyricScene lyrics={scene.lyrics || [scene.text || '']} style={s} />;
    case 'outro_scene':
      return <OutroScene text={scene.text || ''} cta={scene.cta} style={s} />;
    case 'google_search':
      return <GoogleSearchScene searchQuery={scene.searchQuery || scene.text || ''} results={scene.results} style={s as 'light' | 'dark'} />;

    // NEW: Advanced scenes
    case 'landing_page':
      return (
        <GSAPLandingScene
          productName={scene.productName || scene.text || 'Product'}
          tagline={scene.tagline || scene.subtext || 'The Future is Here'}
          features={scene.features || []}
          primaryColor={scene.primaryColor}
          accentColor={scene.accentColor}
          bgColor={scene.bgColor}
        />
      );
    case 'data_chart':
      return (
        <DataChartScene
          title={scene.title || scene.text || 'Data Chart'}
          subtitle={scene.subtitle || scene.subtext}
          data={scene.data || []}
          unit={scene.unit || ''}
          chartType={scene.chartType as 'bar' | 'race' || 'bar'}
          bgColor={scene.bgColor}
          accentColor={scene.accentColor || scene.primaryColor}
        />
      );
    case 'arch_diagram':
      return (
        <ArchDiagramScene
          title={scene.title || scene.text || 'System Architecture'}
          nodes={scene.nodes}
          connections={scene.connections}
          bgColor={scene.bgColor}
        />
      );
    case 'product_3d':
      return (
        <Product3DScene
          productName={scene.productName || scene.text || 'Product'}
          tagline={scene.tagline || scene.subtext}
          parts={scene.parts}
          primaryColor={scene.primaryColor}
          bgColor={scene.bgColor}
          mode={scene.scenario as 'showcase' | 'exploded' || 'exploded'}
        />
      );
    case 'mobile_app':
      return (
        <MobileAppScene
          appName={scene.appName || scene.productName || 'App'}
          scenario={scene.scenario as 'checkout' | 'success' | 'onboarding' | 'notification' || 'checkout'}
          primaryColor={scene.primaryColor}
          bgColor={scene.bgColor}
          title={scene.title || scene.text}
          subtitle={scene.subtitle || scene.subtext}
        />
      );
    case 'cinematic_intro':
      return (
        <CinematicIntroScene
          title={scene.title || scene.text || 'Epic Title'}
          subtitle={scene.subtitle || scene.subtext}
          category={scene.category || 'FILM'}
          style={scene.style as 'dark' | 'light' | 'neon' | 'gradient' || 'dark'}
          accentColor={scene.accentColor || scene.primaryColor}
        />
      );
    case 'social_media':
      return (
        <SocialMediaScene
          headline={scene.headline || scene.text || 'Viral Content'}
          subtext={scene.subtext}
          stats={scene.stats}
          style={scene.scenario as 'instagram' | 'tiktok' | 'youtube' | 'twitter' || 'instagram'}
          bgGradient={scene.bgGradient}
          username={scene.username}
        />
      );

    // v4.0 scenes
    case 'hud_scene':
      return (
        <HUDScene
          title={scene.title || scene.text || 'MISSION CONTROL'}
          subtitle={scene.subtitle || scene.subtext || 'SYSTEM ONLINE'}
          stats={scene.stats as any}
          countdown={scene.countdown || 10}
          accentColor={scene.accentColor || scene.primaryColor || '#FF3B30'}
          layout={scene.bgLayout || 'full'}
        />
      );

    case 'algorithmic_scene':
      return (
        <AlgorithmicScene
          title={scene.title || scene.text || 'YOUR YEAR'}
          subtitle={scene.subtitle || scene.subtext || 'Wrapped 2024'}
          stats={scene.stats as any}
          username={scene.username || '@creator'}
          gradient={scene.bgGradient as any || ['#FF006E', '#8338EC', '#3A86FF']}
          layout={scene.bgLayout || 'full'}
        />
      );

    case 'brutalist_scene':
      return (
        <BrutalistScene
          title={scene.title || scene.text || 'DESIGN IS DEAD'}
          subtitle={scene.subtitle || scene.subtext || 'Long live the machine'}
          body={scene.body || ''}
          number={scene.number || '01'}
          layout={scene.bgLayout || 'full'}
        />
      );

    case 'sketchbook_scene':
      return (
        <SketchbookScene
          title={scene.title || scene.text || 'My Big Idea'}
          points={scene.points || scene.tips || []}
          author={scene.author || scene.subtext || ''}
          layout={scene.bgLayout || 'full'}
        />
      );

    case 'whiteboard_scene':
      return (
        <WhiteboardScene
          title={scene.title || scene.text || 'The Plan'}
          stickies={scene.stickies || []}
          layout={scene.bgLayout || 'full'}
        />
      );

    case 'kinetic_typography':
      return (
        <KineticTypographyScene
          words={scene.words || (scene.text ? scene.text.split(' ') : [])}
          highlightWords={scene.highlightWords || []}
          style={scene.style as any || 'dark'}
          accentColor={scene.accentColor || scene.primaryColor || '#6C63FF'}
          layout={scene.bgLayout || 'full'}
          fontSize={scene.fontSize as any || 72}
        />
      );

    // v5.0 scenes
    case 'comment_explosion':
      return (
        <CommentExplosionScene
          comments={scene.comments as any || []}
          title={scene.title || scene.text || 'Apa Kata Mereka?'}
          bgColor={scene.bgColor || '#0A0A14'}
          accentColor={scene.accentColor || scene.primaryColor || '#6C63FF'}
          layout={scene.bgLayout || 'full'}
        />
      );
    case 'vhs_timeline':
      return (
        <VHSTimelineScene
          events={scene.events as any || []}
          title={scene.title || scene.text || 'PERJALANAN KAMI'}
          accentColor={scene.accentColor || scene.primaryColor || '#00FF41'}
          layout={scene.bgLayout || 'full'}
        />
      );
    case 'macos_dock':
      return (
        <MacOSDockScene
          apps={scene.apps as any || []}
          title={scene.title || scene.text || 'Tools yang Saya Gunakan'}
          subtitle={scene.subtitle || scene.subtext || 'Stack lengkap untuk kreator modern'}
          bgStyle={scene.bgStyle as any || 'dark'}
          accentColor={scene.accentColor || scene.primaryColor || '#007AFF'}
          layout={scene.bgLayout || 'full'}
        />
      );
    case 'youtube_subscribe':
      return (
        <YouTubeSubscribeScene
          channelName={scene.channelName || scene.title || scene.text || 'Channel Kamu'}
          targetSubscribers={scene.targetSubscribers || 100000}
          startSubscribers={scene.startSubscribers || 0}
          milestone={scene.milestone || '100K SUBSCRIBERS!'}
          accentColor={scene.accentColor || scene.primaryColor || '#FF0000'}
          bgColor={scene.bgColor || '#0F0F0F'}
          layout={scene.bgLayout || 'full'}
        />
      );

    default:
      return <TextScene text={scene.text || ''} subtext={scene.subtext} style={s} />;
  }
};

export const MultiSceneVideo: React.FC<MultiSceneVideoProps> = ({ scenes, style = 'cinematic' }) => {
  const fps = 30;
  return (
    <Series>
      {scenes.map((scene, i) => {
        const durationInFrames = Math.round((scene.duration || 3) * fps);
        return (
          <Series.Sequence key={i} durationInFrames={durationInFrames}>
            <SceneRenderer scene={scene} style={style} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};

// ─────────────────────────────────────────────
// Standalone Compositions
// ─────────────────────────────────────────────
export const GoogleSearchVideo: React.FC<{ searchQuery: string; results?: string[]; style?: 'light' | 'dark' }> = (props) => {
  return <GoogleSearchScene {...props} />;
};

export const LandingPageVideo: React.FC<any> = (props) => <GSAPLandingScene {...props} />;
export const DataChartVideo: React.FC<any> = (props) => <DataChartScene {...props} />;
export const ArchDiagramVideo: React.FC<any> = (props) => <ArchDiagramScene {...props} />;
export const Product3DVideo: React.FC<any> = (props) => <Product3DScene {...props} />;
export const MobileAppVideo: React.FC<any> = (props) => <MobileAppScene {...props} />;
export const CinematicIntroVideo: React.FC<any> = (props) => <CinematicIntroScene {...props} />;
export const SocialMediaVideo: React.FC<any> = (props) => <SocialMediaScene {...props} />;

// ─────────────────────────────────────────────
// Register All Compositions
// ─────────────────────────────────────────────
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original multi-scene */}
      <Composition
        id="MultiSceneVideo"
        component={MultiSceneVideo}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          scenes: [
            { type: 'title_scene', text: 'Video Studio AI', subtext: 'Powered by Remotion', duration: 3 },
            { type: 'text_scene', text: 'Buat video profesional', subtext: 'Hanya dengan satu prompt', duration: 3 },
            { type: 'outro_scene', text: 'Mulai Sekarang!', cta: 'Follow & Like', duration: 3 },
          ],
          style: 'cinematic',
        }}
        calculateMetadata={({ props }) => {
          const fps = 30;
          const total = (props.scenes || []).reduce((sum: number, s: SceneData) => sum + Math.round((s.duration || 3) * fps), 0);
          return { durationInFrames: total || 90 };
        }}
      />

      {/* Google Search */}
      <Composition
        id="GoogleSearchVideo"
        component={GoogleSearchVideo}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ searchQuery: 'Cara belajar coding', results: ['Tutorial Coding', 'Belajar Python'], style: 'light' as const }}
        calculateMetadata={({ props }) => {
          const fps = 30;
          return { durationInFrames: Math.round((2 + (props.results?.length || 0) * 0.5 + 2) * fps) };
        }}
      />

      {/* Landing Page */}
      <Composition
        id="LandingPageVideo"
        component={LandingPageVideo}
        durationInFrames={270}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          productName: 'Aria',
          tagline: 'The Future of Work Simplified',
          features: [
            { icon: '⚡', title: 'Lightning Fast', desc: 'Process tasks 10x faster' },
            { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security' },
            { icon: '🎯', title: 'Smart', desc: 'AI-powered precision' },
            { icon: '📊', title: 'Analytics', desc: 'Real-time insights' },
          ],
          primaryColor: '#6C63FF',
          accentColor: '#FF6584',
          bgColor: '#0A0A0F',
        }}
      />

      {/* Data Chart */}
      <Composition
        id="DataChartVideo"
        component={DataChartVideo}
        durationInFrames={210}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: 'Populasi Asia Tenggara',
          subtitle: 'Data 2024 (juta jiwa)',
          data: [
            { label: 'Indonesia', value: 275 },
            { label: 'Vietnam', value: 97 },
            { label: 'Philippines', value: 115 },
            { label: 'Thailand', value: 72 },
            { label: 'Malaysia', value: 33 },
          ],
          unit: 'juta',
          accentColor: '#6C63FF',
          bgColor: '#0D1117',
        }}
      />

      {/* Architecture Diagram */}
      <Composition
        id="ArchDiagramVideo"
        component={ArchDiagramVideo}
        durationInFrames={270}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ title: 'System Architecture', bgColor: '#0D1117' }}
      />

      {/* Product 3D */}
      <Composition
        id="Product3DVideo"
        component={Product3DVideo}
        durationInFrames={270}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          productName: 'Meridian Pro',
          tagline: 'Engineered for Excellence',
          primaryColor: '#6C63FF',
          bgColor: '#080B14',
          mode: 'exploded',
        }}
      />

      {/* Mobile App */}
      <Composition
        id="MobileAppVideo"
        component={MobileAppVideo}
        durationInFrames={210}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          appName: 'PayQuick',
          scenario: 'checkout',
          primaryColor: '#6C63FF',
          bgColor: '#0A0A0F',
        }}
      />

      {/* Cinematic Intro */}
      <Composition
        id="CinematicIntroVideo"
        component={CinematicIntroVideo}
        durationInFrames={210}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: 'The Future is Now',
          subtitle: 'A story about innovation',
          category: 'DOCUMENTARY',
          style: 'dark',
          accentColor: '#6C63FF',
        }}
      />

      {/* Social Media */}
      <Composition
        id="SocialMediaVideo"
        component={SocialMediaVideo}
        durationInFrames={210}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          headline: 'Tips Sukses di 2024',
          subtext: '5 hal yang mengubah hidup saya',
          stats: [
            { label: 'Views', value: '1.2M', icon: '👁️' },
            { label: 'Likes', value: '98K', icon: '❤️' },
            { label: 'Shares', value: '12K', icon: '🔄' },
          ],
          bgGradient: ['#667EEA', '#764BA2'] as [string, string],
          username: '@creator',
        }}
      />

      {/* v5.0 Compositions */}
      <Composition
        id="CommentExplosionVideo"
        component={CommentExplosionScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          comments: [],
          title: 'Apa Kata Mereka?',
          bgColor: '#0A0A14',
          accentColor: '#6C63FF',
          layout: 'full' as const,
        }}
      />

      <Composition
        id="VHSTimelineVideo"
        component={VHSTimelineScene}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          events: [],
          title: 'PERJALANAN KAMI',
          accentColor: '#00FF41',
          layout: 'full' as const,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(150, (props.events?.length || 5) * 40 + 60),
        })}
      />

      <Composition
        id="MacOSDockVideo"
        component={MacOSDockScene}
        durationInFrames={270}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          apps: [],
          title: 'Tools yang Saya Gunakan',
          subtitle: 'Stack lengkap untuk kreator modern',
          bgStyle: 'dark' as const,
          accentColor: '#007AFF',
          layout: 'full' as const,
        }}
      />

      <Composition
        id="YouTubeSubscribeVideo"
        component={YouTubeSubscribeScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          channelName: 'Channel Kamu',
          targetSubscribers: 100000,
          startSubscribers: 0,
          milestone: '100K SUBSCRIBERS!',
          accentColor: '#FF0000',
          bgColor: '#0F0F0F',
          layout: 'full' as const,
        }}
      />
      {/* Explainer Video - v6.0 */}
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideoScene as any}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          topic: 'Mars',
          scenes: [
            { type: 'intro' as const, title: 'MARS', subtitle: 'The Red Planet', icon: '🔴' },
          ],
          bgColor: '#0A0A14',
          accentColor: '#FF4500',
        }}
        calculateMetadata={({ props }: any) => ({
          durationInFrames: Math.max(90, (props.scenes?.length || 1) * 90),
        })}
      />
      {/* Character Animation - v7.0 */}
      <Composition
        id="CharacterAnimation"
        component={CharacterAnimation as any}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [
            { pose: 'standing' as const, character: 'entrepreneur' as const, text: 'Hello World', duration: 4 },
          ],
          bgColor: '#0A0A14',
          accentColor: '#6C63FF',
          background: 'gradient' as const,
        }}
        calculateMetadata={({ props }: any) => ({
          durationInFrames: Math.max(120, (props.scenes || []).reduce((acc: number, s: any) => acc + (s.duration || 4) * 30, 0)),
        })}
      />
      <Composition
        id="AICharacterVideo"
        component={AICharacterVideo as any}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [
            { type: 'intro', title: 'ELON MUSK', subtitle: 'Entrepreneur & Visionary', duration: 60 },
            { type: 'character', title: 'Elon Musk', subtitle: 'CEO Tesla & SpaceX', duration: 90 },
            { type: 'stat', title: 'Net Worth', value: '$250', unit: 'BILLION', description: 'Orang terkaya di dunia', duration: 90 },
            { type: 'outro', title: 'Follow for more!', subtitle: '@videostudio', duration: 60 },
          ],
          bgColor: '#0a0a1a',
          accentColor: '#f97316',
          textColor: '#ffffff',
          characterImageUrl: '',
        }}
        calculateMetadata={({ props }: any) => ({
          durationInFrames: Math.max(120, (props.scenes || []).reduce((acc: number, s: any) => acc + (s.duration || 90), 0)),
        })}
      />
      {/* BaranganehVideo - Cinematic Storytelling @baranganeh */}
      <Composition
        id="BaranganehVideo"
        component={BaranganehVideo as any}
        durationInFrames={540}
        fps={24}
        width={1080}
        height={1350}
        defaultProps={{
          scenes: [
            { type: 'hook', text: 'Benda ini adalah alasan kenapa tahun 1890 tidak pernah benar-benar berakhir.', duration: 72, textSpeed: 'slow', glitchWords: ['1890'] },
            { type: 'object_reveal', text: 'Jam Tangan Aneroid — London, 1887', duration: 72 },
            { type: 'catalog', text: 'Diameter 4.2 cm. Baja karbon. Tidak ada mekanisme penggerak yang bisa diidentifikasi.', subtext: 'Kondisi: Sempurna. Pemilik sebelumnya: Tidak diketahui.', duration: 96 },
            { type: 'anomaly', text: 'Jam ini berhenti tepat pada detik yang sama setiap hari — pukul 03:47. Tidak ada penjelasan mekanis yang bisa ditemukan.', duration: 120, glitchWords: ['03:47'] },
            { type: 'implication', text: 'Apa artinya jika waktu bukan sesuatu yang kita ukur, melainkan sesuatu yang mengukur kita?', duration: 96 },
            { type: 'seal', text: 'Lot ini ditutup untuk sementara. Katalog berikutnya akan tersedia ketika Anda sudah siap.', duration: 84 },
          ],
          backgroundType: 'library',
          accentColor: '#C9A84C',
          lotNumber: 'LOT #001',
          category: 'dark_obsession',
        }}
        calculateMetadata={({ props }: any) => ({
          durationInFrames: Math.max(144, (props.scenes || []).reduce((acc: number, s: any) => acc + (s.duration || 90), 0)),
        })}
      />
    </>
  );
};

registerRoot(RemotionRoot);
