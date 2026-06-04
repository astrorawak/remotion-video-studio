'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'] }));
app.use(express.json({ limit: '10mb' }));

const OUTPUT_DIR = path.join(__dirname, 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const renderJobs = {};
const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (reason) => console.error('Rejection:', reason));

// ─────────────────────────────────────────────
// Lazy-load Remotion
// ─────────────────────────────────────────────
let bundleLocation = null;
let bundling = false;
let bundleCallbacks = [];

async function getBundle() {
  if (bundleLocation) return bundleLocation;
  if (bundling) return new Promise((resolve) => bundleCallbacks.push(resolve));
  bundling = true;
  console.log('[Remotion] Bundling compositions...');
  try {
    const { bundle } = await import('@remotion/bundler');
    bundleLocation = await bundle({
      entryPoint: path.join(__dirname, 'src', 'index.tsx'),
      webpackOverride: (config) => config,
    });
    console.log('[Remotion] Bundle ready:', bundleLocation);
    bundleCallbacks.forEach((cb) => cb(bundleLocation));
    bundleCallbacks = [];
    return bundleLocation;
  } catch (err) {
    bundling = false;
    throw err;
  }
}

async function renderVideo(compositionId, inputProps, outputPath) {
  const { selectComposition, renderMedia } = await import('@remotion/renderer');
  const bundle = await getBundle();
  const composition = await selectComposition({ serveUrl: bundle, id: compositionId, inputProps });
  await renderMedia({
    composition, serveUrl: bundle, codec: 'h264', outputLocation: outputPath, inputProps,
    chromiumOptions: { disableWebSecurity: true, headless: true },
    concurrency: 1, verbose: false,
  });
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  const proto = req ? (req.headers['x-forwarded-proto'] || req.protocol) : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.headers.host) : `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function startRender(renderId, compositionId, inputProps, baseUrl, progressInterval = 3000, progressStep = 5) {
  renderJobs[renderId] = { status: 'processing', progress: 10, message: 'Menyiapkan render...' };
  const timer = setInterval(() => {
    const job = renderJobs[renderId];
    if (job && job.status === 'processing' && job.progress < 85) {
      job.progress = Math.min(85, job.progress + progressStep);
      job.message = `Merender... (${job.progress}%)`;
    } else clearInterval(timer);
  }, progressInterval);

  const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
  renderVideo(compositionId, inputProps, outputPath)
    .then(() => {
      clearInterval(timer);
      const stats = fs.statSync(outputPath);
      renderJobs[renderId] = {
        status: 'done', progress: 100,
        downloadUrl: `${baseUrl}/download/${renderId}`,
        fileSize: stats.size, message: 'Video berhasil dirender!',
      };
      console.log(`[Render] ${renderId} selesai (${(stats.size / 1024).toFixed(1)} KB)`);
    })
    .catch((err) => {
      clearInterval(timer);
      console.error(`[Render] ${renderId} error:`, err.message);
      renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
    });
}

// ─────────────────────────────────────────────
// MCP Tools Definition (v3.0 - 10 tools)
// ─────────────────────────────────────────────
const MCP_TOOLS = [
  {
    name: 'render_text_video',
    description: 'Buat video animasi profesional dari teks menggunakan Remotion. Mendukung spring animation, typewriter, highlight, dan berbagai gaya visual. Setelah render selesai, berikan link download kepada pengguna.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array scene video. Setiap scene memiliki type, text, dan durasi.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['title_scene', 'text_scene', 'lyric_scene', 'tips_scene', 'outro_scene'] },
              text: { type: 'string' },
              subtext: { type: 'string' },
              tips: { type: 'array', items: { type: 'string' } },
              lyrics: { type: 'array', items: { type: 'string' } },
              cta: { type: 'string' },
              duration: { type: 'number', description: 'Durasi dalam detik (default: 3)' },
            },
            required: ['type', 'text'],
          },
        },
        style: {
          type: 'string',
          enum: ['cinematic', 'vlog', 'business', 'music_video', 'tutorial', 'trader'],
          description: 'Gaya visual video. Default: cinematic',
        },
      },
      required: ['scenes'],
    },
  },
  {
    name: 'google_search_animation',
    description: 'Buat animasi pencarian Google dengan efek typewriter yang realistis. Cocok untuk hook video viral di TikTok/Reels/YouTube Shorts.',
    inputSchema: {
      type: 'object',
      properties: {
        searchQuery: { type: 'string', description: 'Kata kunci pencarian' },
        results: { type: 'array', items: { type: 'string' }, description: 'Judul hasil pencarian (maks 4)' },
        style: { type: 'string', enum: ['light', 'dark'], description: 'Tema Google. Default: light' },
      },
      required: ['searchQuery'],
    },
  },
  {
    name: 'render_landing_page',
    description: 'Buat video animasi landing page produk/SaaS yang profesional dengan feature cards, CTA button, dan animasi staggered yang halus. Cocok untuk video promosi produk.',
    inputSchema: {
      type: 'object',
      properties: {
        productName: { type: 'string', description: 'Nama produk/brand' },
        tagline: { type: 'string', description: 'Tagline produk (maks 6 kata)' },
        features: {
          type: 'array',
          description: 'Fitur-fitur produk (maks 4)',
          items: {
            type: 'object',
            properties: {
              icon: { type: 'string', description: 'Emoji icon' },
              title: { type: 'string', description: 'Judul fitur' },
              desc: { type: 'string', description: 'Deskripsi singkat' },
            },
          },
        },
        primaryColor: { type: 'string', description: 'Warna utama hex (default: #6C63FF)' },
        accentColor: { type: 'string', description: 'Warna aksen hex (default: #FF6584)' },
        bgColor: { type: 'string', description: 'Warna background hex (default: #0A0A0F)' },
      },
      required: ['productName'],
    },
  },
  {
    name: 'render_data_chart',
    description: 'Buat video animasi bar chart / data visualization yang keren. Batang bergerak dari kiri ke kanan dengan counter angka animasi. Cocok untuk konten data/statistik.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul chart' },
        subtitle: { type: 'string', description: 'Subjudul/keterangan' },
        data: {
          type: 'array',
          description: 'Data yang akan divisualisasikan',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Label/nama item' },
              value: { type: 'number', description: 'Nilai numerik' },
              color: { type: 'string', description: 'Warna bar hex (opsional)' },
            },
            required: ['label', 'value'],
          },
        },
        unit: { type: 'string', description: 'Satuan data (contoh: juta, %, USD)' },
        accentColor: { type: 'string', description: 'Warna aksen hex (default: #6C63FF)' },
      },
      required: ['title', 'data'],
    },
  },
  {
    name: 'render_arch_diagram',
    description: 'Buat video animasi diagram arsitektur sistem/jaringan. Node muncul satu per satu, lalu garis koneksi tergambar otomatis dengan efek data flow. Cocok untuk konten tech/IT.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul diagram' },
        nodes: {
          type: 'array',
          description: 'Node/komponen sistem (maks 8)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              icon: { type: 'string', description: 'Emoji icon' },
              x: { type: 'number', description: 'Posisi X (0-100)' },
              y: { type: 'number', description: 'Posisi Y (0-100)' },
              color: { type: 'string', description: 'Warna hex' },
            },
            required: ['id', 'label', 'icon', 'x', 'y'],
          },
        },
        connections: {
          type: 'array',
          description: 'Koneksi antar node',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['from', 'to'],
          },
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_product_3d',
    description: 'Buat video animasi showcase produk 3D dengan rotasi 360° dan exploded view yang memperlihatkan komponen dalam. Cocok untuk video produk/review.',
    inputSchema: {
      type: 'object',
      properties: {
        productName: { type: 'string', description: 'Nama produk' },
        tagline: { type: 'string', description: 'Tagline produk' },
        parts: {
          type: 'array',
          description: 'Komponen/bagian produk (maks 6)',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Nama komponen' },
              color: { type: 'string', description: 'Warna hex' },
              height: { type: 'number', description: 'Tinggi komponen (20-150)' },
            },
            required: ['label', 'color', 'height'],
          },
        },
        primaryColor: { type: 'string', description: 'Warna utama hex' },
      },
      required: ['productName'],
    },
  },
  {
    name: 'render_mobile_app',
    description: 'Buat video animasi mockup aplikasi mobile dengan berbagai skenario: checkout, pembayaran sukses, onboarding. Cocok untuk demo app atau video promosi.',
    inputSchema: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Nama aplikasi' },
        scenario: { type: 'string', enum: ['checkout', 'success', 'onboarding', 'notification'], description: 'Skenario animasi' },
        primaryColor: { type: 'string', description: 'Warna utama hex' },
        title: { type: 'string', description: 'Judul di layar app' },
        subtitle: { type: 'string', description: 'Subjudul di layar app' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'render_cinematic_intro',
    description: 'Buat video intro sinematik dengan efek letterbox, teks muncul per karakter, dan berbagai style: dark, neon, gradient. Cocok untuk intro YouTube/film/presentasi.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul utama (maks 5 kata untuk efek terbaik)' },
        subtitle: { type: 'string', description: 'Subjudul/deskripsi' },
        category: { type: 'string', description: 'Label kategori (contoh: DOCUMENTARY, TUTORIAL, VLOG)' },
        style: { type: 'string', enum: ['dark', 'light', 'neon', 'gradient'], description: 'Gaya visual' },
        accentColor: { type: 'string', description: 'Warna aksen hex' },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_social_media',
    description: 'Buat video animasi konten sosial media viral dengan headline besar, counter statistik animasi, dan efek gradient yang eye-catching. Cocok untuk Instagram/TikTok/YouTube Shorts.',
    inputSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'Headline utama yang menarik perhatian' },
        subtext: { type: 'string', description: 'Teks pendukung' },
        stats: {
          type: 'array',
          description: 'Statistik yang ditampilkan (maks 3)',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string', description: 'Nilai (contoh: 1.2M, 98K, 500)' },
              icon: { type: 'string', description: 'Emoji icon' },
            },
          },
        },
        bgGradient: {
          type: 'array',
          description: 'Dua warna gradient background [warna1, warna2]',
          items: { type: 'string' },
        },
        username: { type: 'string', description: 'Username/handle (contoh: @namaanda)' },
      },
      required: ['headline'],
    },
  },
  {
    name: 'check_render_status',
    description: 'Cek status render video. Gunakan renderId dari hasil render sebelumnya. Jika status "done", berikan link download kepada pengguna.',
    inputSchema: {
      type: 'object',
      properties: {
        renderId: { type: 'string', description: 'ID render dari tool render sebelumnya' },
      },
      required: ['renderId'],
    },
  },
  {
    name: 'get_templates',
    description: 'Dapatkan daftar semua template, gaya visual, dan animasi yang tersedia di Video Studio v3.0.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─────────────────────────────────────────────
// MCP Tool Executor
// ─────────────────────────────────────────────
async function executeTool(name, args, baseUrl) {
  // render_text_video
  if (name === 'render_text_video') {
    const { scenes = [], style = 'cinematic' } = args;
    if (!scenes.length) throw new Error('scenes tidak boleh kosong');
    const renderId = randomUUID();
    startRender(renderId, 'MultiSceneVideo', { scenes, style }, baseUrl, 3000, 5);
    return `✅ **Render dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-90 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // google_search_animation
  if (name === 'google_search_animation') {
    const { searchQuery, results = [], style = 'light' } = args;
    if (!searchQuery) throw new Error('searchQuery diperlukan');
    const renderId = randomUUID();
    startRender(renderId, 'GoogleSearchVideo', { searchQuery, results, style }, baseUrl, 2000, 8);
    return `✅ **Animasi Google Search dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 20-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_landing_page
  if (name === 'render_landing_page') {
    const { productName = 'Product', tagline = 'The Future is Here', features = [], primaryColor = '#6C63FF', accentColor = '#FF6584', bgColor = '#0A0A0F' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'LandingPageVideo', { productName, tagline, features, primaryColor, accentColor, bgColor }, baseUrl, 3000, 5);
    return `✅ **Landing Page Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-90 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_data_chart
  if (name === 'render_data_chart') {
    const { title = 'Data Chart', subtitle = '', data = [], unit = '', accentColor = '#6C63FF' } = args;
    if (!data.length) throw new Error('data tidak boleh kosong');
    const renderId = randomUUID();
    startRender(renderId, 'DataChartVideo', { title, subtitle, data, unit, accentColor, bgColor: '#0D1117' }, baseUrl, 2500, 6);
    return `✅ **Data Chart Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_arch_diagram
  if (name === 'render_arch_diagram') {
    const { title = 'System Architecture', nodes, connections } = args;
    const renderId = randomUUID();
    const props = { title };
    if (nodes) props.nodes = nodes;
    if (connections) props.connections = connections;
    startRender(renderId, 'ArchDiagramVideo', props, baseUrl, 3000, 5);
    return `✅ **Architecture Diagram dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-90 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_product_3d
  if (name === 'render_product_3d') {
    const { productName = 'Product', tagline = '', parts, primaryColor = '#6C63FF' } = args;
    const renderId = randomUUID();
    const props = { productName, tagline, primaryColor, bgColor: '#080B14', mode: 'exploded' };
    if (parts) props.parts = parts;
    startRender(renderId, 'Product3DVideo', props, baseUrl, 3000, 5);
    return `✅ **Product 3D Showcase dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-90 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_mobile_app
  if (name === 'render_mobile_app') {
    const { appName = 'App', scenario = 'checkout', primaryColor = '#6C63FF', title = '', subtitle = '' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'MobileAppVideo', { appName, scenario, primaryColor, bgColor: '#0A0A0F', title, subtitle }, baseUrl, 2500, 6);
    return `✅ **Mobile App Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 20-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_cinematic_intro
  if (name === 'render_cinematic_intro') {
    const { title = 'Epic Title', subtitle = '', category = 'FILM', style = 'dark', accentColor = '#6C63FF' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'CinematicIntroVideo', { title, subtitle, category, style, accentColor }, baseUrl, 3000, 5);
    return `✅ **Cinematic Intro dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 20-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_social_media
  if (name === 'render_social_media') {
    const { headline = 'Viral Content', subtext = '', stats = [], bgGradient = ['#667EEA', '#764BA2'], username = '@creator' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'SocialMediaVideo', { headline, subtext, stats, bgGradient, username }, baseUrl, 2500, 6);
    return `✅ **Social Media Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 20-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // check_render_status
  if (name === 'check_render_status') {
    const { renderId } = args;
    const job = renderJobs[renderId];
    if (!job) return `❌ Render job \`${renderId}\` tidak ditemukan.`;
    if (job.status === 'processing') return `⏳ **Sedang diproses... ${job.progress}%**\n\n${job.message}\n\nCek lagi dalam 10-15 detik.`;
    if (job.status === 'done') return `✅ **Video selesai!**\n\n📥 **Link Download**: ${job.downloadUrl}\n📦 Ukuran: ${(job.fileSize / 1024).toFixed(1)} KB\n\nKlik link untuk mendownload video MP4.`;
    return `❌ **Error**: ${job.error}`;
  }

  // get_templates
  if (name === 'get_templates') {
    return `# 🎬 Video Studio Remotion v3.0 — Template Lengkap

## 📹 Scene Types (untuk render_text_video)
- \`title_scene\` — Judul besar dengan spring animation
- \`text_scene\` — Teks utama + subtext dengan slide-in
- \`lyric_scene\` — Teks lirik highlight satu per satu
- \`tips_scene\` — Numbered list tips muncul berurutan
- \`outro_scene\` — Penutup dengan CTA button animasi

## 🚀 Animasi Spesialis (tools terpisah)
- **render_landing_page** — Landing page SaaS/produk dengan feature cards
- **render_data_chart** — Bar chart animasi dengan counter angka
- **render_arch_diagram** — Diagram arsitektur sistem dengan data flow
- **render_product_3d** — Showcase produk 3D dengan exploded view
- **render_mobile_app** — Mockup app mobile (checkout, success, onboarding)
- **render_cinematic_intro** — Intro sinematik dengan letterbox effect
- **render_social_media** — Konten viral Instagram/TikTok dengan stats counter
- **google_search_animation** — Animasi typewriter pencarian Google

## 🎨 Style Presets
- \`cinematic\` — Gelap, elegan, gradient hitam-biru
- \`vlog\` — Cerah, casual, putih bersih
- \`business\` — Profesional, biru tua
- \`music_video\` — Bold, hitam-emas dramatis
- \`tutorial\` — Clean, abu-abu terang
- \`trader\` — Dark mode, hijau neon, monospace

## 📐 Output Quality
- Resolusi: 1280×720 (HD)
- Frame rate: 30 fps
- Codec: H.264 MP4`;
  }

  throw new Error(`Tool '${name}' tidak ditemukan`);
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', engine: 'Remotion 4.0', version: '3.0.0',
    bundleReady: !!bundleLocation,
    activeJobs: Object.keys(renderJobs).filter(id => renderJobs[id].status === 'processing').length,
    mcpEndpoint: `${getBaseUrl(req)}/mcp`,
    tools: MCP_TOOLS.length,
  });
});

app.get('/templates', (req, res) => {
  res.json({
    version: '3.0.0',
    sceneTypes: [
      { id: 'title_scene', name: 'Title Scene' },
      { id: 'text_scene', name: 'Text Scene' },
      { id: 'lyric_scene', name: 'Lyric Scene' },
      { id: 'tips_scene', name: 'Tips Scene' },
      { id: 'outro_scene', name: 'Outro Scene' },
      { id: 'google_search', name: 'Google Search' },
      { id: 'landing_page', name: 'Landing Page' },
      { id: 'data_chart', name: 'Data Chart' },
      { id: 'arch_diagram', name: 'Architecture Diagram' },
      { id: 'product_3d', name: 'Product 3D Showcase' },
      { id: 'mobile_app', name: 'Mobile App Mockup' },
      { id: 'cinematic_intro', name: 'Cinematic Intro' },
      { id: 'social_media', name: 'Social Media Viral' },
    ],
    quality: { resolution: '1280x720', fps: 30, codec: 'h264' },
  });
});

app.get('/status/:renderId', (req, res) => {
  const job = renderJobs[req.params.renderId];
  if (!job) return res.status(404).json({ error: 'Render job tidak ditemukan' });
  res.json(job);
});

app.get('/download/:renderId', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, `${req.params.renderId}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="video-${req.params.renderId}.mp4"`);
  fs.createReadStream(filePath).pipe(res);
});

// REST endpoints
app.post('/render-text-video', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  const { scenes = [], style = 'cinematic' } = req.body;
  startRender(renderId, 'MultiSceneVideo', { scenes, style }, baseUrl, 3000, 5);
});

app.post('/google-search-animation', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  const { searchQuery, results = [], style = 'light' } = req.body;
  startRender(renderId, 'GoogleSearchVideo', { searchQuery, results, style }, baseUrl, 2000, 8);
});

app.post('/render-landing-page', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'LandingPageVideo', req.body, baseUrl, 3000, 5);
});

app.post('/render-data-chart', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'DataChartVideo', req.body, baseUrl, 2500, 6);
});

app.post('/render-arch-diagram', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'ArchDiagramVideo', req.body, baseUrl, 3000, 5);
});

app.post('/render-product-3d', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'Product3DVideo', req.body, baseUrl, 3000, 5);
});

app.post('/render-mobile-app', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'MobileAppVideo', req.body, baseUrl, 2500, 6);
});

app.post('/render-cinematic-intro', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'CinematicIntroVideo', req.body, baseUrl, 3000, 5);
});

app.post('/render-social-media', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  startRender(renderId, 'SocialMediaVideo', req.body, baseUrl, 2500, 6);
});

// ─────────────────────────────────────────────
// Remote MCP — Streamable HTTP
// ─────────────────────────────────────────────
const mcpSessions = {};

app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sessionId = randomUUID();
  mcpSessions[sessionId] = res;
  res.setHeader('Mcp-Session-Id', sessionId);
  res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: `/mcp?sessionId=${sessionId}` })}\n\n`);
  req.on('close', () => { delete mcpSessions[sessionId]; });
});

app.post('/mcp', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const body = req.body;
  const requests = Array.isArray(body) ? body : [body];
  const responses = [];

  for (const request of requests) {
    const { method, params, id } = request;
    try {
      if (method === 'initialize') {
        responses.push({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'video-studio-remotion', version: '3.0.0' },
            capabilities: { tools: {} },
          },
        });
        continue;
      }
      if (method === 'notifications/initialized') continue;
      if (method === 'ping') { responses.push({ jsonrpc: '2.0', id, result: {} }); continue; }
      if (method === 'tools/list') {
        responses.push({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
        continue;
      }
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const text = await executeTool(name, args || {}, baseUrl);
        responses.push({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
        continue;
      }
      responses.push({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method '${method}' tidak dikenal` } });
    } catch (err) {
      responses.push({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
    }
  }

  if (responses.length === 0) return res.status(202).end();
  res.json(Array.isArray(body) ? responses : responses[0]);
});

app.delete('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && mcpSessions[sessionId]) {
    mcpSessions[sessionId].end();
    delete mcpSessions[sessionId];
  }
  res.status(200).end();
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎬 Video Studio Remotion v3.0 running on port ${PORT}`);
  console.log(`🔗 Remote MCP endpoint: /mcp`);
  console.log(`🛠️  Tools available: ${MCP_TOOLS.length}`);
  setTimeout(() => {
    console.log('[Remotion] Pre-warming bundle...');
    getBundle().catch((err) => console.error('[Bundle] Pre-warm failed:', err.message));
  }, 5000);
});
