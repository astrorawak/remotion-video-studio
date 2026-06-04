require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OUTPUT_DIR = path.join(__dirname, 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const renderJobs = {};
const PORT = process.env.PORT || 3000;

// Prevent crash on unhandled errors
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (reason) => console.error('Rejection:', reason));

// ─────────────────────────────────────────────
// Lazy-load Remotion (heavy, only when needed)
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
// Routes
// ─────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Remotion 4.0',
    version: '2.0.0',
    bundleReady: !!bundleLocation,
    activeJobs: Object.keys(renderJobs).filter(id => renderJobs[id].status === 'processing').length,
  });
});

// Templates
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
    animations: ['spring', 'slideIn', 'fadeIn', 'typewriter', 'highlight', 'bounce'],
    quality: { resolution: '1280x720', fps: 30, codec: 'h264' },
  });
});

// Status
app.get('/status/:renderId', (req, res) => {
  const job = renderJobs[req.params.renderId];
  if (!job) return res.status(404).json({ error: 'Render job tidak ditemukan' });
  res.json(job);
});

// Download
app.get('/download/:renderId', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, `${req.params.renderId}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="video-${req.params.renderId}.mp4"`);
  fs.createReadStream(filePath).pipe(res);
});

// ─────────────────────────────────────────────
// POST /render-text-video
// ─────────────────────────────────────────────
app.post('/render-text-video', async (req, res) => {
  const renderId = randomUUID();
  renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render...' };
  const baseUrl = process.env.BASE_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || `http://localhost:${PORT}`;
  res.json({ renderId, message: 'Render dimulai', statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });

  try {
    const { scenes = [], style = 'cinematic' } = req.body;
    if (!scenes || scenes.length === 0) throw new Error('scenes tidak boleh kosong');

    renderJobs[renderId].message = 'Menyiapkan Remotion bundle...';
    renderJobs[renderId].progress = 10;

    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    renderJobs[renderId].progress = 20;
    renderJobs[renderId].message = 'Merender video...';

    await renderVideo('MultiSceneVideo', { scenes, style }, outputPath);

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
});

// ─────────────────────────────────────────────
// POST /google-search-animation
// ─────────────────────────────────────────────
app.post('/google-search-animation', async (req, res) => {
  const renderId = randomUUID();
  renderJobs[renderId] = { status: 'processing', progress: 0, message: 'Memulai render Google Search...' };
  const baseUrl = process.env.BASE_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || `http://localhost:${PORT}`;
  res.json({ renderId, message: 'Render dimulai', statusUrl: `${baseUrl}/status/${renderId}`, downloadUrl: `${baseUrl}/download/${renderId}` });

  try {
    const { searchQuery, results = [], style = 'light' } = req.body;
    if (!searchQuery) throw new Error('searchQuery diperlukan');

    renderJobs[renderId].progress = 20;
    renderJobs[renderId].message = 'Merender animasi Google Search...';

    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    await renderVideo('GoogleSearchVideo', { searchQuery, results, style }, outputPath);

    const stats = fs.statSync(outputPath);
    renderJobs[renderId] = {
      status: 'done', progress: 100,
      downloadUrl: `${baseUrl}/download/${renderId}`,
      fileSize: stats.size,
      message: 'Animasi Google Search berhasil!',
    };
  } catch (err) {
    console.error(`[GoogleSearch] ${renderId} error:`, err.message);
    renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
  }
});

// ─────────────────────────────────────────────
// MCP Endpoint (JSON-RPC 2.0)
// ─────────────────────────────────────────────
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  const baseUrl = process.env.BASE_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || `http://localhost:${PORT}`;

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'video-studio-remotion', version: '2.0.0' },
        capabilities: { tools: {} },
      },
    });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        tools: [
          {
            name: 'render_text_video',
            description: 'Buat video animasi profesional dari teks menggunakan Remotion. Mendukung spring animation, typewriter, highlight, dan berbagai gaya visual.',
            inputSchema: {
              type: 'object',
              properties: {
                scenes: {
                  type: 'array',
                  description: 'Array scene. Setiap scene memiliki type, text, dan durasi.',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['title_scene', 'text_scene', 'lyric_scene', 'tips_scene', 'outro_scene', 'google_search'] },
                      text: { type: 'string' },
                      subtext: { type: 'string' },
                      tips: { type: 'array', items: { type: 'string' } },
                      lyrics: { type: 'array', items: { type: 'string' } },
                      cta: { type: 'string' },
                      duration: { type: 'number', description: 'Durasi scene dalam detik (default: 3)' },
                    },
                    required: ['type', 'text'],
                  },
                },
                style: { type: 'string', enum: ['cinematic', 'vlog', 'business', 'music_video', 'tutorial', 'trader'], description: 'Gaya visual keseluruhan video' },
              },
              required: ['scenes'],
            },
          },
          {
            name: 'google_search_animation',
            description: 'Buat animasi pencarian Google dengan efek typewriter yang realistis. Cocok untuk hook video viral.',
            inputSchema: {
              type: 'object',
              properties: {
                searchQuery: { type: 'string', description: 'Kata kunci pencarian yang akan diketik' },
                results: { type: 'array', items: { type: 'string' }, description: 'Judul hasil pencarian (maks 4)' },
                style: { type: 'string', enum: ['light', 'dark'], description: 'Tema tampilan Google (default: light)' },
              },
              required: ['searchQuery'],
            },
          },
          {
            name: 'get_templates',
            description: 'Dapatkan daftar semua template scene, gaya visual, dan animasi yang tersedia.',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'check_render_status',
            description: 'Cek status render video. Gunakan renderId dari hasil render sebelumnya.',
            inputSchema: {
              type: 'object',
              properties: { renderId: { type: 'string' } },
              required: ['renderId'],
            },
          },
        ],
      },
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      if (name === 'render_text_video') {
        const axios = require('axios');
        const resp = await axios.post(`${baseUrl}/render-text-video`, args, { timeout: 10000 });
        return res.json({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `✅ Render dimulai!\n\n**renderId**: \`${resp.data.renderId}\`\n**Status**: ${resp.data.statusUrl}\n**Download**: ${resp.data.downloadUrl}\n\nGunakan tool \`check_render_status\` dengan renderId di atas untuk memantau progres. Render biasanya selesai dalam 30-90 detik.` }] },
        });
      }

      if (name === 'google_search_animation') {
        const axios = require('axios');
        const resp = await axios.post(`${baseUrl}/google-search-animation`, args, { timeout: 10000 });
        return res.json({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `✅ Animasi Google Search dimulai!\n\n**renderId**: \`${resp.data.renderId}\`\n**Status**: ${resp.data.statusUrl}\n**Download**: ${resp.data.downloadUrl}\n\nGunakan \`check_render_status\` untuk memantau progres.` }] },
        });
      }

      if (name === 'get_templates') {
        const axios = require('axios');
        const resp = await axios.get(`${baseUrl}/templates`);
        const t = resp.data;
        const text = `**Template Scene yang Tersedia:**\n${t.sceneTypes.map((s) => `- \`${s.id}\`: ${s.desc}`).join('\n')}\n\n**Gaya Visual:**\n${t.stylePresets.map((s) => `- \`${s.id}\`: ${s.desc}`).join('\n')}\n\n**Kualitas Output:** ${t.quality.resolution} @ ${t.quality.fps}fps (${t.quality.codec})`;
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      }

      if (name === 'check_render_status') {
        const { renderId } = args;
        const job = renderJobs[renderId];
        if (!job) return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `❌ Render job \`${renderId}\` tidak ditemukan.` }] } });
        let text = `**Status Render** \`${renderId}\`\n\n`;
        if (job.status === 'processing') text += `⏳ **Sedang diproses...** (${job.progress}%)\n${job.message || ''}`;
        else if (job.status === 'done') text += `✅ **Selesai!**\n\n📥 **Download**: ${job.downloadUrl}\n📦 Ukuran: ${(job.fileSize / 1024).toFixed(1)} KB`;
        else text += `❌ **Error**: ${job.error}`;
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      }

      return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool '${name}' tidak ditemukan` } });
    } catch (err) {
      return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
    }
  }

  res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method '${method}' tidak dikenal` } });
});

// ─────────────────────────────────────────────
// Start server & pre-warm bundle
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎬 Video Studio Remotion v2.0 running on port ${PORT}`);
  // Pre-warm bundle in background after 5 seconds
  setTimeout(() => {
    console.log('[Remotion] Pre-warming bundle...');
    getBundle().catch((err) => console.error('[Bundle] Pre-warm failed:', err.message));
  }, 5000);
});
