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

// Prevent crash on unhandled errors
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
  if (bundling) {
    return new Promise((resolve) => bundleCallbacks.push(resolve));
  }
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
  const composition = await selectComposition({
    serveUrl: bundle,
    id: compositionId,
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl: bundle,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: {
      disableWebSecurity: true,
      headless: true,
    },
    concurrency: 1,
    verbose: false,
  });
}

// ─────────────────────────────────────────────
// Helper: get base URL
// ─────────────────────────────────────────────
function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  const proto = req ? (req.headers['x-forwarded-proto'] || req.protocol) : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.headers.host) : `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// ─────────────────────────────────────────────
// MCP Tools Definition
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
              text: { type: 'string', description: 'Teks utama scene' },
              subtext: { type: 'string', description: 'Teks sekunder/subtitle' },
              tips: { type: 'array', items: { type: 'string' }, description: 'List tips (untuk tips_scene)' },
              lyrics: { type: 'array', items: { type: 'string' }, description: 'List lirik (untuk lyric_scene)' },
              cta: { type: 'string', description: 'Call-to-action text (untuk outro_scene)' },
              duration: { type: 'number', description: 'Durasi scene dalam detik (default: 3)' },
            },
            required: ['type', 'text'],
          },
        },
        style: {
          type: 'string',
          enum: ['cinematic', 'vlog', 'business', 'music_video', 'tutorial', 'trader'],
          description: 'Gaya visual keseluruhan video. Default: cinematic',
        },
      },
      required: ['scenes'],
    },
  },
  {
    name: 'google_search_animation',
    description: 'Buat animasi pencarian Google dengan efek typewriter yang realistis. Sangat cocok untuk hook video viral di TikTok/Reels/YouTube Shorts.',
    inputSchema: {
      type: 'object',
      properties: {
        searchQuery: { type: 'string', description: 'Kata kunci pencarian yang akan diketik dengan efek typewriter' },
        results: { type: 'array', items: { type: 'string' }, description: 'Judul hasil pencarian yang muncul (maksimal 4 item)' },
        style: { type: 'string', enum: ['light', 'dark'], description: 'Tema tampilan Google. Default: light' },
      },
      required: ['searchQuery'],
    },
  },
  {
    name: 'check_render_status',
    description: 'Cek status render video. Gunakan renderId dari hasil render sebelumnya. Jika status "done", berikan link download kepada pengguna.',
    inputSchema: {
      type: 'object',
      properties: {
        renderId: { type: 'string', description: 'ID render yang didapat dari render_text_video atau google_search_animation' },
      },
      required: ['renderId'],
    },
  },
  {
    name: 'get_templates',
    description: 'Dapatkan daftar semua template scene, gaya visual, dan animasi yang tersedia di Video Studio.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─────────────────────────────────────────────
// MCP Tool Executor
// ─────────────────────────────────────────────
async function executeTool(name, args, baseUrl) {
  if (name === 'render_text_video') {
    const { scenes = [], style = 'cinematic' } = args;
    if (!scenes || scenes.length === 0) throw new Error('scenes tidak boleh kosong');

    const renderId = randomUUID();
    renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render Remotion...' };

    // Render async dengan progress update
    (async () => {
      try {
        renderJobs[renderId].progress = 10;
        renderJobs[renderId].message = 'Menyiapkan komposisi Remotion...';
        // Update progress setiap 3 detik agar tidak stuck
        const progressTimer = setInterval(() => {
          const job = renderJobs[renderId];
          if (job && job.status === 'processing' && job.progress < 85) {
            job.progress = Math.min(85, job.progress + 5);
            job.message = `Merender frame video... (${job.progress}%)`;
          } else {
            clearInterval(progressTimer);
          }
        }, 3000);
        const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
        await renderVideo('MultiSceneVideo', { scenes, style }, outputPath);
        clearInterval(progressTimer);
        const stats = fs.statSync(outputPath);
        renderJobs[renderId] = {
          status: 'done', progress: 100,
          downloadUrl: `${baseUrl}/download/${renderId}`,
          fileSize: stats.size,
          message: 'Video berhasil dirender!',
        };
        console.log(`[Render] ${renderId} selesai (${(stats.size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`[Render] ${renderId} error:`, err.message);
        renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
      }
    })();

    return `✅ **Render dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi waktu: 30-90 detik\n\nGunakan tool \`check_render_status\` dengan Render ID di atas untuk memantau progres dan mendapatkan link download.`;
  }

  if (name === 'google_search_animation') {
    const { searchQuery, results = [], style = 'light' } = args;
    if (!searchQuery) throw new Error('searchQuery diperlukan');

    const renderId = randomUUID();
    renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render Google Search...' };

    (async () => {
      try {
        renderJobs[renderId].progress = 10;
        renderJobs[renderId].message = 'Menyiapkan animasi Google Search...';
        const progressTimer = setInterval(() => {
          const job = renderJobs[renderId];
          if (job && job.status === 'processing' && job.progress < 85) {
            job.progress = Math.min(85, job.progress + 8);
            job.message = `Merender animasi... (${job.progress}%)`;
          } else {
            clearInterval(progressTimer);
          }
        }, 2000);
        const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
        await renderVideo('GoogleSearchVideo', { searchQuery, results, style }, outputPath);
        clearInterval(progressTimer);
        const stats = fs.statSync(outputPath);
        renderJobs[renderId] = {
          status: 'done', progress: 100,
          downloadUrl: `${baseUrl}/download/${renderId}`,
          fileSize: stats.size,
          message: 'Animasi Google Search berhasil!',
        };
      } catch (err) {
        renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
      }
    })();

    return `✅ **Animasi Google Search dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi waktu: 20-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'check_render_status') {
    const { renderId } = args;
    const job = renderJobs[renderId];
    if (!job) return `❌ Render job \`${renderId}\` tidak ditemukan. Pastikan renderId benar.`;
    if (job.status === 'processing') return `⏳ **Sedang diproses... ${job.progress}%**\n\n${job.message || 'Mohon tunggu...'}\n\nCek lagi dalam 10-15 detik dengan tool ini.`;
    if (job.status === 'done') return `✅ **Video selesai!**\n\n📥 **Link Download**: ${job.downloadUrl}\n📦 Ukuran file: ${(job.fileSize / 1024).toFixed(1)} KB\n\nKlik link di atas untuk mendownload video MP4 Anda.`;
    return `❌ **Error**: ${job.error}`;
  }

  if (name === 'get_templates') {
    return `**🎬 Template Scene yang Tersedia:**
- \`title_scene\`: Judul besar dengan spring animation
- \`text_scene\`: Teks utama + subtext dengan slide-in
- \`lyric_scene\`: Teks lirik highlight satu per satu
- \`tips_scene\`: Numbered list tips muncul berurutan
- \`outro_scene\`: Penutup dengan CTA button animasi

**🎨 Gaya Visual:**
- \`cinematic\`: Gelap, elegan, gradient hitam-biru
- \`vlog\`: Cerah, casual, putih bersih
- \`business\`: Profesional, biru tua
- \`music_video\`: Bold, hitam-emas dramatis
- \`tutorial\`: Clean, abu-abu terang
- \`trader\`: Dark mode, hijau neon, monospace

**📐 Kualitas Output:** 1280x720 @ 30fps (H.264 MP4)`;
  }

  throw new Error(`Tool '${name}' tidak ditemukan`);
}

// ─────────────────────────────────────────────
// Routes: Health, Templates, Status, Download
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Remotion 4.0',
    version: '2.0.0',
    bundleReady: !!bundleLocation,
    activeJobs: Object.keys(renderJobs).filter(id => renderJobs[id].status === 'processing').length,
    mcpEndpoint: `${getBaseUrl(req)}/mcp`,
  });
});

app.get('/templates', (req, res) => {
  res.json({
    sceneTypes: [
      { id: 'title_scene', name: 'Title Scene', desc: 'Judul besar animasi spring di tengah layar' },
      { id: 'text_scene', name: 'Text Scene', desc: 'Teks utama + subtext dengan slide-in animation' },
      { id: 'lyric_scene', name: 'Lyric Scene', desc: 'Teks lirik yang highlight satu per satu' },
      { id: 'tips_scene', name: 'Tips Scene', desc: 'Numbered list tips muncul satu per satu' },
      { id: 'outro_scene', name: 'Outro Scene', desc: 'Penutup dengan CTA button animasi' },
      { id: 'google_search', name: 'Google Search', desc: 'Animasi typewriter pencarian Google' },
    ],
    stylePresets: [
      { id: 'cinematic', name: 'Cinematic', desc: 'Gelap, elegan, gradient hitam-biru' },
      { id: 'vlog', name: 'Vlog', desc: 'Cerah, casual, putih bersih' },
      { id: 'business', name: 'Business', desc: 'Profesional, biru tua' },
      { id: 'music_video', name: 'Music Video', desc: 'Bold, hitam-emas dramatis' },
      { id: 'tutorial', name: 'Tutorial', desc: 'Clean, abu-abu terang' },
      { id: 'trader', name: 'Trader', desc: 'Dark mode, hijau neon, monospace' },
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

// REST endpoints (backward compat)
app.post('/render-text-video', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render...' };
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  const { scenes = [], style = 'cinematic' } = req.body;
  try {
    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    await renderVideo('MultiSceneVideo', { scenes, style }, outputPath);
    const stats = fs.statSync(outputPath);
    renderJobs[renderId] = { status: 'done', progress: 100, downloadUrl: `${baseUrl}/download/${renderId}`, fileSize: stats.size, message: 'Video berhasil dirender!' };
  } catch (err) {
    renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
  }
});

app.post('/google-search-animation', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const renderId = randomUUID();
  renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render Google Search...' };
  res.json({ renderId, statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });
  const { searchQuery, results = [], style = 'light' } = req.body;
  try {
    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    await renderVideo('GoogleSearchVideo', { searchQuery, results, style }, outputPath);
    const stats = fs.statSync(outputPath);
    renderJobs[renderId] = { status: 'done', progress: 100, downloadUrl: `${baseUrl}/download/${renderId}`, fileSize: stats.size, message: 'Animasi Google Search berhasil!' };
  } catch (err) {
    renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
  }
});

// ─────────────────────────────────────────────
// Remote MCP — Streamable HTTP (claude.ai compatible)
// Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
// ─────────────────────────────────────────────
const mcpSessions = {};

// MCP endpoint: POST untuk semua request, GET untuk SSE stream
app.get('/mcp', (req, res) => {
  // SSE stream untuk notifikasi server-to-client
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sessionId = randomUUID();
  mcpSessions[sessionId] = res;
  res.setHeader('Mcp-Session-Id', sessionId);

  // Send endpoint event
  res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: `/mcp?sessionId=${sessionId}` })}\n\n`);

  req.on('close', () => {
    delete mcpSessions[sessionId];
  });
});

app.post('/mcp', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const body = req.body;

  // Handle batch requests
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
            serverInfo: { name: 'video-studio-remotion', version: '2.0.0' },
            capabilities: { tools: {} },
          },
        });
        continue;
      }

      if (method === 'notifications/initialized') {
        // No response needed for notifications
        continue;
      }

      if (method === 'ping') {
        responses.push({ jsonrpc: '2.0', id, result: {} });
        continue;
      }

      if (method === 'tools/list') {
        responses.push({
          jsonrpc: '2.0', id,
          result: { tools: MCP_TOOLS },
        });
        continue;
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const text = await executeTool(name, args || {}, baseUrl);
        responses.push({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text }] },
        });
        continue;
      }

      responses.push({
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method '${method}' tidak dikenal` },
      });
    } catch (err) {
      responses.push({
        jsonrpc: '2.0', id,
        error: { code: -32603, message: err.message },
      });
    }
  }

  // Return single object or array based on input
  if (responses.length === 0) {
    return res.status(202).end();
  }
  res.json(Array.isArray(body) ? responses : responses[0]);
});

// DELETE session
app.delete('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && mcpSessions[sessionId]) {
    mcpSessions[sessionId].end();
    delete mcpSessions[sessionId];
  }
  res.status(200).end();
});

// ─────────────────────────────────────────────
// Start server & pre-warm bundle
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎬 Video Studio Remotion v2.0 running on port ${PORT}`);
  console.log(`🔗 Remote MCP endpoint: /mcp`);
  setTimeout(() => {
    console.log('[Remotion] Pre-warming bundle...');
    getBundle().catch((err) => console.error('[Bundle] Pre-warm failed:', err.message));
  }, 5000);
});
