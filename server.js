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

// ─────────────────────────────────────────────
// Render Queue — batasi maks 2 render bersamaan
// agar Chrome headless tidak EAGAIN / OOM
// ─────────────────────────────────────────────
let activeRenderCount = 0;
const MAX_CONCURRENT_RENDERS = 2;
const renderQueue = [];

function acquireRenderSlot() {
  return new Promise((resolve) => {
    if (activeRenderCount < MAX_CONCURRENT_RENDERS) {
      activeRenderCount++;
      resolve();
    } else {
      renderQueue.push(resolve);
    }
  });
}

function releaseRenderSlot() {
  if (renderQueue.length > 0) {
    const next = renderQueue.shift();
    activeRenderCount = Math.max(1, activeRenderCount); // slot tetap 1 untuk next
    next();
  } else {
    activeRenderCount = Math.max(0, activeRenderCount - 1);
  }
}

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

// Resolusi per format. 'portrait' utk TikTok/IG Reels, 'landscape' utk YouTube, 'square' utk feed IG.
const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

async function renderVideo(compositionId, inputProps, outputPath, format) {
  const { selectComposition, renderMedia } = await import('@remotion/renderer');
  const bundle = await getBundle();
  const composition = await selectComposition({ serveUrl: bundle, id: compositionId, inputProps });
  // Override dimensi composition jika format diberikan. Komponen sudah memakai useVideoConfig()
  // sehingga responsif terhadap dimensi apapun (full / split / greenscreen).
  const dims = FORMAT_DIMENSIONS[format];
  if (dims) {
    composition.width = dims.width;
    composition.height = dims.height;
  }
  // Pastikan dimensi selalu genap (libx264 wajib lebar & tinggi kelipatan 2)
  composition.width = Math.round(composition.width / 2) * 2;
  composition.height = Math.round(composition.height / 2) * 2;

  await renderMedia({
    composition,
    serveUrl: bundle,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: { disableWebSecurity: true, headless: true },
    concurrency: 1,
    verbose: false,
    // Fix FFmpeg encoder error: paksa yuv420p agar libx264 tidak reject frame
    pixelFormat: 'yuv420p',
    // CRF 23 = kualitas bagus, file tidak terlalu besar
    crf: 23,
  });
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  const proto = req ? (req.headers['x-forwarded-proto'] || req.protocol) : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.headers.host) : `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// Alias global agar REST endpoints lama tetap berfungsi (tanpa format).
function startRender(renderId, compositionId, inputProps, baseUrl, progressInterval, progressStep, format) {
  return startRenderJob(renderId, compositionId, inputProps, baseUrl, progressInterval, progressStep, format);
}

function startRenderJob(renderId, compositionId, inputProps, baseUrl, progressInterval = 3000, progressStep = 5, format = null) {
  renderJobs[renderId] = { status: 'processing', progress: 5, message: 'Menunggu slot render...' };

  (async () => {
    // Tunggu slot tersedia (maks 2 render bersamaan)
    await acquireRenderSlot();
    if (!renderJobs[renderId] || renderJobs[renderId].status === 'error') {
      releaseRenderSlot();
      return;
    }
    renderJobs[renderId].progress = 10;
    renderJobs[renderId].message = 'Menyiapkan render...';

    const timer = setInterval(() => {
      const job = renderJobs[renderId];
      if (job && job.status === 'processing' && job.progress < 85) {
        job.progress = Math.min(85, job.progress + progressStep);
        job.message = `Merender... (${job.progress}%)`;
      } else clearInterval(timer);
    }, progressInterval);

    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    try {
      await renderVideo(compositionId, inputProps, outputPath, format);
      clearInterval(timer);
      const stats = fs.statSync(outputPath);
      renderJobs[renderId] = {
        status: 'done', progress: 100,
        downloadUrl: `${baseUrl}/download/${renderId}`,
        fileSize: stats.size, message: 'Video berhasil dirender!',
      };
      console.log(`[Render] ${renderId} selesai (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      clearInterval(timer);
      console.error(`[Render] ${renderId} error:`, err.message);
      renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
    } finally {
      releaseRenderSlot();
    }
  })();
}

// ─────────────────────────────────────────────
// MCP Tools Definition (v7.0 - 24 tools)
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
              type: { type: 'string', enum: ['title_scene', 'text_scene', 'lyric_scene', 'tips_scene', 'outro_scene', 'hud_scene', 'algorithmic_scene', 'brutalist_scene', 'sketchbook_scene', 'whiteboard_scene', 'kinetic_typography', 'landing_page', 'data_chart', 'arch_diagram', 'product_3d', 'mobile_app', 'cinematic_intro', 'social_media', 'google_search'] },
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
  // ─── v4.0 NEW TOOLS ───
  {
    name: 'render_hud_scene',
    description: 'Buat video animasi HUD/Mission Control bergaya sci-fi dengan latar gelap, neon merah/biru, gauge, countdown timer, dan grid lines. Cocok untuk konten tech, gaming, atau dramatic reveal.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul utama (capslock untuk efek terbaik)' },
        subtitle: { type: 'string', description: 'Subjudul status sistem' },
        stats: {
          type: 'array',
          description: 'Data statistik yang ditampilkan (maks 4)',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
        accentColor: { type: 'string', description: 'Warna neon aksen hex (default: #FF3B30)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'], description: 'full=normal, split=ada ruang webcam di kanan, greenscreen=background hijau untuk chroma key' },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_algorithmic_scene',
    description: 'Buat video animasi bergaya TikTok/Spotify Wrapped dengan kartu UI melayang, gradasi cerah, dan counter statistik. Cocok untuk konten viral, year-in-review, atau showcase pencapaian.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul besar (contoh: YOUR YEAR, TOP PICKS)' },
        subtitle: { type: 'string', description: 'Subjudul (contoh: Wrapped 2024)' },
        stats: {
          type: 'array',
          description: 'Statistik yang ditampilkan (maks 4)',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              icon: { type: 'string', description: 'Emoji icon' },
            },
          },
        },
        username: { type: 'string', description: 'Username/handle' },
        gradient: { type: 'array', items: { type: 'string' }, description: 'Tiga warna gradient [warna1, warna2, warna3]' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_brutalist_scene',
    description: 'Buat video animasi bergaya Brutalist/Architectural dengan tekstur beton, tipografi monolitik hitam-putih, dan garis tegas. Cocok untuk konten bold, statement, atau artistic.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul utama (capslock, maks 4 kata)' },
        subtitle: { type: 'string', description: 'Subjudul' },
        body: { type: 'string', description: 'Teks isi/deskripsi' },
        number: { type: 'string', description: 'Nomor dekoratif besar (contoh: 01, 02)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_sketchbook_scene',
    description: 'Buat video animasi bergaya buku catatan/sketchbook dengan tekstur kertas, font tulisan tangan, panah sketsa, dan stabilo. Cocok untuk konten edukasi, brainstorming, atau personal.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul di atas halaman' },
        points: { type: 'array', items: { type: 'string' }, description: 'Poin-poin yang ditulis (maks 5)' },
        author: { type: 'string', description: 'Catatan penulis di bawah' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_whiteboard_scene',
    description: 'Buat video animasi bergaya whiteboard kantor dengan sticky notes warna-warni, grid, dan panah penghubung. Cocok untuk konten planning, brainstorming, atau tutorial.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul di whiteboard' },
        stickies: {
          type: 'array',
          description: 'Sticky notes (maks 6)',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              color: { type: 'string', description: 'Warna hex sticky note' },
              x: { type: 'number', description: 'Posisi X (pixel dari kiri)' },
              y: { type: 'number', description: 'Posisi Y (pixel dari atas)' },
              rotate: { type: 'number', description: 'Rotasi derajat (-5 sampai 5)' },
            },
            required: ['text'],
          },
        },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'render_kinetic_typography',
    description: 'Buat video animasi kinetic typography di mana setiap kata muncul satu per satu dengan timing dramatis. Cocok untuk quote, narasi, atau teks yang ingin disampaikan dengan impak.',
    inputSchema: {
      type: 'object',
      properties: {
        words: { type: 'array', items: { type: 'string' }, description: 'Array kata-kata yang akan muncul satu per satu' },
        highlightWords: { type: 'array', items: { type: 'string' }, description: 'Kata-kata yang diberi warna aksen/highlight' },
        style: { type: 'string', enum: ['dark', 'light', 'neon', 'gradient'], description: 'Gaya visual background' },
        accentColor: { type: 'string', description: 'Warna aksen untuk highlight words (hex)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
        fontSize: { type: 'number', description: 'Ukuran font (default: 72)' },
      },
      required: ['words'],
    },
  },
  {
    name: 'render_comment_explosion',
    description: 'Buat animasi komentar yang bermunculan (comment explosion) dari berbagai posisi layar. Cocok untuk showcase testimoni, review produk, atau reaksi penonton.',
    inputSchema: {
      type: 'object',
      properties: {
        comments: { type: 'array', items: { type: 'object', properties: { username: { type: 'string' }, text: { type: 'string' }, color: { type: 'string' } }, required: ['username', 'text'] }, description: 'Array komentar (username + text). Kosongkan untuk contoh default.' },
        title: { type: 'string', description: 'Judul di bagian atas (default: Apa Kata Mereka?)' },
        bgColor: { type: 'string', description: 'Warna background (hex, default: #0A0A14)' },
        accentColor: { type: 'string', description: 'Warna aksen (hex, default: #6C63FF)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
    },
  },
  {
    name: 'render_vhs_timeline',
    description: 'Buat animasi timeline bergaya VHS/retro dengan efek glitch, scanlines, dan timecode. Cocok untuk perjalanan bisnis, milestone, atau sejarah brand.',
    inputSchema: {
      type: 'object',
      properties: {
        events: { type: 'array', items: { type: 'object', properties: { year: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } }, required: ['year', 'title'] }, description: 'Array event timeline (year + title + description)' },
        title: { type: 'string', description: 'Judul timeline (default: PERJALANAN KAMI)' },
        accentColor: { type: 'string', description: 'Warna aksen neon (hex, default: #00FF41 hijau)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
    },
  },
  {
    name: 'render_macos_dock',
    description: 'Buat animasi macOS-style dock dengan icon aplikasi yang muncul satu per satu dan efek hover magnification. Cocok untuk showcase tools, stack teknologi, atau rekomendasi aplikasi.',
    inputSchema: {
      type: 'object',
      properties: {
        apps: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, emoji: { type: 'string' }, color: { type: 'string' }, badge: { type: 'number' } }, required: ['name', 'emoji', 'color'] }, description: 'Array aplikasi (name, emoji, color hex, badge opsional)' },
        title: { type: 'string', description: 'Judul di atas dock' },
        subtitle: { type: 'string', description: 'Subjudul di bawah title' },
        bgStyle: { type: 'string', enum: ['dark', 'light', 'gradient'], description: 'Gaya background' },
        accentColor: { type: 'string', description: 'Warna aksen (hex)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
    },
  },
  {
    name: 'render_youtube_subscribe',
    description: 'Buat animasi YouTube subscribe dengan counter subscriber yang menghitung naik dan efek confetti saat mencapai milestone. Cocok untuk milestone celebration atau CTA subscribe.',
    inputSchema: {
      type: 'object',
      properties: {
        channelName: { type: 'string', description: 'Nama channel YouTube' },
        targetSubscribers: { type: 'number', description: 'Target subscriber yang ditampilkan (default: 100000)' },
        startSubscribers: { type: 'number', description: 'Angka awal counter (default: 0)' },
        milestone: { type: 'string', description: 'Teks milestone yang muncul (default: 100K SUBSCRIBERS!)' },
        accentColor: { type: 'string', description: 'Warna aksen/tombol subscribe (default: #FF0000)' },
        bgColor: { type: 'string', description: 'Warna background (default: #0F0F0F)' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'] },
      },
    },
  },
  {
    name: 'analyze_video_and_generate',
    description: 'Analisis video presentasi/penjelasan dari URL dan otomatis generate animasi pendukung yang relevan. Upload video Anda ke cloud storage (Google Drive, Dropbox, dll) dan berikan URL-nya. Sistem akan: (1) transkripsi isi bicara, (2) analisis poin-poin utama, (3) generate animasi pendukung otomatis.',
    inputSchema: {
      type: 'object',
      properties: {
        videoUrl: { type: 'string', description: 'URL langsung ke file video (MP4, WebM). Harus bisa diakses publik.' },
        language: { type: 'string', description: 'Bahasa video: id (Indonesia), en (English). Default: id' },
        layout: { type: 'string', enum: ['full', 'split', 'greenscreen'], description: 'Layout animasi yang dihasilkan. Default: full' },
        style: { type: 'string', enum: ['cinematic', 'vlog', 'business', 'tutorial'], description: 'Gaya visual animasi. Default: cinematic' },
      },
      required: ['videoUrl'],
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
    description: 'Dapatkan daftar semua template, gaya visual, dan animasi yang tersedia di Video Studio v5.0.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'render_explainer_video',
    description: 'Buat video infografis animasi kompleks seperti explainer video profesional. Mendukung 10 jenis scene: intro (judul pembuka), stat (angka count-up), comparison (perbandingan bar), progress (progress bar), countdown (hitung mundur dengan ring), list (daftar item staggered), orbit (animasi orbit planet), timeline (garis waktu), fact (fakta menarik), outro (penutup). Cocok untuk konten edukasi, sains, bisnis, dan infografis viral.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topik utama video (contoh: Mars, Bitcoin, Indonesia)' },
        scenes: {
          type: 'array',
          description: 'Array scene video. Setiap scene memiliki type yang berbeda dengan properti uniknya.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['intro', 'stat', 'comparison', 'progress', 'countdown', 'list', 'orbit', 'timeline', 'fact', 'outro'],
                description: 'Jenis scene: intro=pembuka, stat=angka besar, comparison=perbandingan, progress=progress bar, countdown=hitung dengan ring, list=daftar staggered, orbit=animasi orbit, timeline=garis waktu, fact=fakta, outro=penutup'
              },
              title: { type: 'string', description: 'Judul (untuk intro/list/outro)' },
              subtitle: { type: 'string', description: 'Subjudul (untuk intro/outro)' },
              icon: { type: 'string', description: 'Emoji icon' },
              label: { type: 'string', description: 'Label/nama (untuk stat/progress/countdown)' },
              value: { type: 'number', description: 'Nilai numerik (untuk stat/comparison)' },
              unit: { type: 'string', description: 'Satuan (contoh: km, %, juta)' },
              description: { type: 'string', description: 'Deskripsi tambahan' },
              percentage: { type: 'number', description: 'Persentase 0-100 (untuk progress)' },
              from: { type: 'number', description: 'Nilai awal hitung (untuk countdown)' },
              to: { type: 'number', description: 'Nilai akhir hitung (untuk countdown)' },
              leftLabel: { type: 'string', description: 'Label kiri (untuk comparison)' },
              leftValue: { type: 'number', description: 'Nilai kiri (untuk comparison)' },
              rightLabel: { type: 'string', description: 'Label kanan (untuk comparison)' },
              rightValue: { type: 'number', description: 'Nilai kanan (untuk comparison)' },
              items: { type: 'array', items: { type: 'string' }, description: 'Daftar item teks (untuk list)' },
              centerLabel: { type: 'string', description: 'Label pusat orbit (untuk orbit)' },
              orbitLabel: { type: 'string', description: 'Label benda yang mengorbit (untuk orbit)' },
              fact: { type: 'string', description: 'Fakta/keterangan (untuk orbit)' },
              headline: { type: 'string', description: 'Judul besar (untuk fact)' },
              body: { type: 'string', description: 'Isi teks (untuk fact)' },
              events: {
                type: 'array',
                description: 'Event timeline (untuk timeline)',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'string' },
                    label: { type: 'string' }
                  }
                }
              },
              cta: { type: 'string', description: 'Call to action button text (untuk outro)' },
              accentColor: { type: 'string', description: 'Warna aksen scene ini (override global)' },
            },
            required: ['type'],
          },
        },
        bgColor: { type: 'string', description: 'Warna background hex global (default: #0A0A14)' },
        accentColor: { type: 'string', description: 'Warna aksen hex global (default: #6C63FF)' },
      },
      required: ['topic', 'scenes'],
    },
  },
  {
    name: 'render_character_animation',
    description: 'Buat video animasi dengan karakter/avatar generik (businessman, entrepreneur, scientist, teacher, developer, athlete, doctor, artist). Karakter bisa berpose standing, pointing, celebrating, thinking, presenting, walking. Cocok untuk storytelling, video profil, explainer dengan karakter, atau video motivasi.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array scene karakter. Setiap scene memiliki karakter, pose, dan konten.',
          items: {
            type: 'object',
            properties: {
              character: { type: 'string', enum: ['businessman', 'entrepreneur', 'scientist', 'teacher', 'developer', 'athlete', 'doctor', 'artist'], description: 'Jenis karakter/profesi' },
              pose: { type: 'string', enum: ['standing', 'pointing', 'celebrating', 'thinking', 'presenting', 'walking'], description: 'Pose karakter' },
              skinTone: { type: 'string', enum: ['light', 'medium', 'dark'], description: 'Warna kulit karakter (default: medium)' },
              text: { type: 'string', description: 'Teks utama di atas karakter' },
              subtext: { type: 'string', description: 'Teks kecil di bawah text utama' },
              bubbleText: { type: 'string', description: 'Teks di speech bubble (balon kata)' },
              stat: { type: 'object', description: 'Statistik/angka yang ditampilkan', properties: { label: { type: 'string' }, value: { type: 'string' } } },
              duration: { type: 'number', description: 'Durasi scene dalam detik (default: 4)' },
            },
            required: ['character', 'pose'],
          },
        },
        characterName: { type: 'string', description: 'Nama karakter (contoh: "Elon Musk", "Steve Jobs")' },
        characterTitle: { type: 'string', description: 'Jabatan/profesi karakter (contoh: "CEO Tesla & SpaceX")' },
        bgColor: { type: 'string', description: 'Warna background hex (default: #0A0A14)' },
        accentColor: { type: 'string', description: 'Warna aksen hex (default: #6C63FF)' },
        background: { type: 'string', enum: ['office', 'space', 'city', 'gradient', 'minimal'], description: 'Jenis background (default: gradient)' },
      },
      required: ['scenes'],
    },
  },
  {
    name: 'render_ai_character_video',
    description: 'Buat video animasi dengan karakter/ilustrasi yang di-generate oleh AI (Replicate Flux). Ideal untuk video tentang tokoh terkenal, entrepreneur, selebriti, dll. AI akan generate ilustrasi karakter berdasarkan deskripsi, lalu animasikan dalam video profesional.',
    inputSchema: {
      type: 'object',
      properties: {
        characterDescription: {
          type: 'string',
          description: 'Deskripsi karakter yang akan di-generate AI. Contoh: "tech billionaire entrepreneur, short hair, wearing casual black tshirt, confident smile, professional portrait". Semakin detail semakin bagus.',
        },
        characterName: {
          type: 'string',
          description: 'Nama karakter yang akan ditampilkan di video. Contoh: "Elon Musk"',
        },
        characterTitle: {
          type: 'string',
          description: 'Jabatan/title karakter. Contoh: "CEO Tesla & SpaceX"',
        },
        scenes: {
          type: 'array',
          description: 'Array scene video. Setiap scene memiliki type dan konten.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['intro', 'character', 'stat', 'comparison', 'list', 'outro'],
                description: 'Jenis scene: intro=pembuka, character=tampilkan karakter, stat=angka besar, comparison=perbandingan, list=daftar item, outro=penutup',
              },
              title: { type: 'string', description: 'Judul scene' },
              subtitle: { type: 'string', description: 'Subjudul atau deskripsi' },
              value: { type: 'string', description: 'Nilai utama (untuk stat scene). Contoh: "$250"' },
              unit: { type: 'string', description: 'Satuan (untuk stat scene). Contoh: "BILLION"' },
              description: { type: 'string', description: 'Deskripsi tambahan' },
              items: { type: 'array', items: { type: 'string' }, description: 'Daftar item (untuk list scene)' },
              label1: { type: 'string', description: 'Label bar pertama (untuk comparison scene)' },
              label2: { type: 'string', description: 'Label bar kedua (untuk comparison scene)' },
              value1: { type: 'number', description: 'Nilai bar pertama (untuk comparison scene)' },
              value2: { type: 'number', description: 'Nilai bar kedua (untuk comparison scene)' },
              duration: { type: 'number', description: 'Durasi scene dalam frame (30 frame = 1 detik). Default: 90 (3 detik)' },
            },
          },
        },
        bgColor: {
          type: 'string',
          description: 'Warna background hex. Default: #0a0a1a (hitam gelap)',
        },
        accentColor: {
          type: 'string',
          description: 'Warna aksen hex. Default: #f97316 (oranye)',
        },
        imageStyle: {
          type: 'string',
          enum: ['illustration', 'realistic', 'cartoon', 'anime', 'oil_painting', 'digital_art'],
          description: 'Gaya ilustrasi AI. Default: illustration',
        },
      },
      required: ['characterDescription', 'characterName', 'scenes'],
    },
  },
  {
    name: 'render_baranganeh_video',
    description: 'Buat video sinematik storytelling untuk @baranganeh. Pipeline: (1) Flux Dev generate gambar kurator Victorian dark academia, (2) Flux Dev generate gambar objek/artefak, (3) WAN 2.5 i2v animasikan gambar jadi video bergerak, (4) Remotion compose final video dengan teks animasi sinematik. Cocok untuk konten misteri, dark academia, dan storytelling intelektual di X/Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        lotNumber: {
          type: 'string',
          description: 'Nomor lot katalog. Contoh: "LOT #247"',
        },
        category: {
          type: 'string',
          enum: ['dark_obsession', 'satirical_anomaly', 'logic_glitch'],
          description: 'Kategori konten: dark_obsession=horor psikologis, satirical_anomaly=sindiran sosial, logic_glitch=sci-fi konseptual',
        },
        curatorDescription: {
          type: 'string',
          description: 'Deskripsi kurator untuk di-generate AI. Contoh: "Victorian scholar, dark academia aesthetic, aged 45, wearing dark wool coat, white shirt, thin glasses, mysterious calm expression, chiaroscuro lighting, dark library background, oil painting style"',
        },
        objectDescription: {
          type: 'string',
          description: 'Deskripsi objek/artefak untuk di-generate AI. Contoh: "antique pocket watch, Victorian era, brass and steel, ornate engravings, dramatic lighting, dark background, museum photography style, ultra detailed"',
        },
        objectName: {
          type: 'string',
          description: 'Nama objek yang ditampilkan sebagai label. Contoh: "Jam Tangan Aneroid — London, 1887"',
        },
        scenes: {
          type: 'array',
          description: 'Array scene video storytelling. Setiap scene memiliki type dan narasi.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['hook', 'object_reveal', 'object_focus', 'catalog', 'anomaly', 'implication', 'chapter', 'seal', 'fact', 'context', 'lesson', 'price', 'quote', 'info_box', 'highlight'],
                description: 'hook=pernyataan mustahil 3 detik, object_reveal=reveal objek dramatis dgn spotlight, object_focus=objek FULL-SCREEN dominan dgn slow zoom (WAJIB pakai minimal 1x agar objek terlihat besar & jelas, render video bergerak jika animateWithAI true), catalog=deskripsi dingin objek di samping gambar, anomaly=inti narasi+kurator+objek, implication=pertanyaan retoris, chapter=pembatas bab, seal=penutup brand, fact=fakta+label sumber dgn objek di samping (untuk konten kaya data), context=latar sejarah naratif panjang, lesson=ilmu kehidupan/refleksi filosofis, price=harga non-moneter konsep @baranganeh, quote=kutipan dramatis besar',
              },
              text: { type: 'string', description: 'Teks narasi utama scene. Untuk video panjang 1-2 menit, isi dengan kalimat bermakna & informatif.' },
              subtext: { type: 'string', description: 'Teks sekunder/metadata' },
              chapterTitle: { type: 'string', description: 'Judul bab (untuk scene type chapter)' },
              duration: { type: 'number', description: 'Durasi dalam frame (24fps). 24=1 detik, 72=3 detik, 120=5 detik, 180=7.5 detik. PENTING: teks muncul perlahan & auto-fit, jadi beri durasi cukup ~3 frame per karakter. Untuk fact/context/lesson teks panjang, gunakan 150-220. Default: 90' },
              textSpeed: { type: 'string', enum: ['slow', 'normal', 'fast'], description: 'Kecepatan typewriter. slow=dramatis(disarankan untuk hook/lesson/quote), normal=standar(fact/catalog), fast=cepat. Teks tetap auto-fit agar selalu terbaca penuh.' },
              glitchWords: { type: 'array', items: { type: 'string' }, description: 'Kata-kata yang akan di-glitch (efek bergetar/warna aksen). Gunakan untuk kata kunci paling penting.' },
              factLabel: { type: 'string', description: 'Untuk scene type=fact: label validitas. Contoh: "TERDOKUMENTASI", "DIPERDEBATKAN", "SPEKULATIF"' },
              source: { type: 'string', description: 'Untuk scene fact/quote: sumber fakta atau atribusi kutipan. Contoh: "Royal Observatory, 1820"' },
              priceLabel: { type: 'string', description: 'Untuk scene type=price: teks harga non-moneter. Contoh: "Lima tahun ingatan masa kecil Anda"' },
              riskStatus: { type: 'string', description: 'Untuk scene type=price: status risiko. Contoh: "TIDAK DAPAT DIUKUR", "TINGGI"' },
              label: { type: 'string', description: 'Eyebrow label kecil di atas scene (fact/context/lesson/price). Contoh: "FAKTA", "KONTEKS", "REFLEKSI"' },
              highlightWords: { type: 'array', items: { type: 'string' }, description: 'Untuk scene type=highlight: array kata-kata yang akan di-highlight/stabilo. Contoh: ["mustahil", "tidak ada"]' },
            },
            required: ['type', 'text'],
          },
        },
        accentColor: {
          type: 'string',
          description: 'Warna aksen hex. Default: #C9A84C (emas tua). Untuk dark_obsession: #C9A84C, satirical: #8B1A1A (merah tua), logic_glitch: #1A4A8B (biru tua)',
        },
        animateWithAI: {
          type: 'boolean',
          description: 'Jika true, gunakan WAN 2.5 i2v untuk menganimasikan gambar kurator dan objek jadi video bergerak (lebih lambat ~5-8 menit, lebih keren). Jika false, gunakan animasi Remotion saja (lebih cepat ~2-3 menit). Default: false',
        },
        partLabel: {
          type: 'string',
          description: 'Opsional. Untuk video multi-bagian yang akan digabung di CapCut. Contoh: "BAGIAN 1/3". Akan ditampilkan kecil di pojok video. Gunakan jika ingin membuat seri panjang 3+ menit yang dipecah jadi beberapa render terpisah.',
        },
      },
      required: ['scenes', 'objectDescription', 'curatorDescription'],
    },
  },
  {
    name: 'render_borneo_video',
    description: 'Buat video dokumenter sinematik untuk channel YouTube BORNEO PRIDE (seri "Silent Witness") tentang tanaman akuatik endemik & hutan Kalimantan. Format LANDSCAPE 16:9 (1920x1080) untuk YouTube long-form berbahasa Inggris. Pipeline: (1) Flux Dev generate gambar spesies/tanaman/landscape, (2) opsional WAN 2.5 i2v animasikan jadi video bergerak, (3) Remotion compose final video dengan teks animasi sinematik + data overlay. Tema visual: hutan hijau + sungai biru + aksen ungu (logo). Cocok untuk environmental storytelling: keindahan alam, data deforestasi, investigasi kebijakan, paradoks. Untuk video panjang gabung beberapa render via partLabel.',
    inputSchema: {
      type: 'object',
      properties: {
        episodeLabel: {
          type: 'string',
          description: 'Label episode di pojok. Contoh: "EPISODE 01 — THE RAFFLESIA PARADOX"',
        },
        speciesDescription: {
          type: 'string',
          description: 'Deskripsi spesies/tanaman/landscape untuk di-generate Flux Dev. Contoh: "Bucephalandra aquatic plant, deep green and purple leaves, growing on rocks in a fast-flowing crystal-clear Borneo river, underwater macro photography, dramatic natural light rays, ultra detailed, cinematic, 8k, national geographic style, no text"',
        },
        naturalistDescription: {
          type: 'string',
          description: 'Opsional. Deskripsi narator naturalis/botanis untuk di-generate (jarang tampil). Contoh: "field botanist, khaki field jacket, standing in misty Borneo rainforest, documentary style, natural light". Boleh dikosongkan untuk konten murni alam.',
        },
        scenes: {
          type: 'array',
          description: 'Array scene dokumenter. Setiap scene punya type dan teks bahasa Inggris.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['hook', 'species_reveal', 'species_focus', 'data_fact', 'context', 'investigation', 'paradox', 'comparison', 'lesson', 'quote', 'highlight', 'chapter', 'call_to_action', 'outro'],
                description: 'hook=pernyataan pembuka memikat (Act 1), species_reveal=reveal spesies dramatis dgn spotlight+label, species_focus=spesies FULL-SCREEN dominan slow-zoom (WAJIB minimal 1x agar visual mendominasi; render video bergerak jika animateWithAI true), data_fact=fakta+angka+sumber dgn media di samping (untuk Act 2 data deforestasi), context=narasi sejarah/ekosistem panjang, investigation=pertanyaan investigatif retoris (Act 3 mode detektif), paradox=kontradiksi kebijakan dramatis (Act 4, warna amber/merah peringatan), comparison=dua angka berdampingan (ekonomi vs lingkungan, before/after), lesson=refleksi naratif, quote=kutipan dramatis (pejabat/ilmuwan), highlight=teks dgn stabilo kata kunci, chapter=pembatas Act, call_to_action=pertanyaan penutup (Act 5, BUKAN ceramah), outro=penutup brand BORNEO PRIDE',
              },
              text: { type: 'string', description: 'Teks narasi utama (BAHASA INGGRIS). Untuk video panjang isi kalimat bermakna & informatif.' },
              subtext: { type: 'string', description: 'Teks sekunder (nama latin spesies, metadata)' },
              chapterTitle: { type: 'string', description: 'Judul Act/Bab (untuk type chapter)' },
              duration: { type: 'number', description: 'Durasi dalam frame (24fps). 24=1dtk, 120=5dtk, 168=7dtk, 240=10dtk. Teks muncul perlahan auto-fit, beri durasi cukup. Untuk data_fact/context/paradox teks panjang gunakan 168-240. Default: 120' },
              textSpeed: { type: 'string', enum: ['slow', 'normal', 'fast'], description: 'Kecepatan typewriter. slow=dramatis(hook/lesson/quote/cta), normal=standar(data_fact). Teks auto-fit selalu terbaca penuh.' },
              glitchWords: { type: 'array', items: { type: 'string' }, description: 'Kata kunci yang diberi warna aksen + glow. Gunakan untuk angka/kata terpenting.' },
              factLabel: { type: 'string', description: 'Untuk type=data_fact: label validitas. Contoh: "VERIFIED", "DOCUMENTED", "DISPUTED"' },
              source: { type: 'string', description: 'Untuk data_fact/paradox/quote/comparison: sumber/atribusi. Contoh: "Auriga Nusantara, 2024", "Global Forest Watch"' },
              label: { type: 'string', description: 'Eyebrow label kecil di atas scene. Contoh: "THE DATA", "THE PARADOX", "CONTEXT", "WHAT WILL YOU DO?"' },
              highlightWords: { type: 'array', items: { type: 'string' }, description: 'Untuk type=highlight: kata-kata yang distabilo. Contoh: ["legal", "97%"]' },
              leftLabel: { type: 'string', description: 'Untuk type=comparison: label kartu kiri (hijau). Contoh: "ECO-TOURISM"' },
              leftValue: { type: 'string', description: 'Untuk type=comparison: nilai kartu kiri. Contoh: "$2.1M / year"' },
              rightLabel: { type: 'string', description: 'Untuk type=comparison: label kartu kanan (merah). Contoh: "MINING REVENUE"' },
              rightValue: { type: 'string', description: 'Untuk type=comparison: nilai kartu kanan. Contoh: "$8.4M / year"' },
            },
            required: ['type'],
          },
        },
        accentColor: {
          type: 'string',
          description: 'Warna aksen utama hex. Default: #3FA66A (hijau hutan terang). Alternatif: #2E8FA6 (biru sungai) untuk episode bertema air.',
        },
        secondaryColor: {
          type: 'string',
          description: 'Warna sekunder hex (aksen logo). Default: #7B3FA0 (ungu logo user). Dipakai pada scene investigation & outro.',
        },
        animateWithAI: {
          type: 'boolean',
          description: 'Jika true, gunakan WAN 2.5 i2v untuk menganimasikan gambar spesies jadi video bergerak (lebih lambat ~5-8 menit, jauh lebih hidup). Jika false, gambar diam dgn Ken Burns (lebih cepat ~3-5 menit). Default: false',
        },
        partLabel: {
          type: 'string',
          description: 'Opsional. Untuk video multi-bagian yang digabung di CapCut. Contoh: "PART 1/4". Ditampilkan kecil di pojok. Gunakan untuk seri panjang yang dipecah jadi beberapa render.',
        },
        seriesName: {
          type: 'string',
          description: 'Nama seri di outro. Default: "BORNEO PRIDE"',
        },
      },
      required: ['scenes', 'speciesDescription'],
    },
  },
  {
    name: 'render_stock_ticker',
    description: 'Buat overlay TICKER HARGA berjalan ala Bloomberg/CNBC: kartu harga aset (saham, crypto, forex, komoditas) dengan persen perubahan hijau/merah + pita berjalan di bawah. Cocok sebagai overlay di atas video wajah Anda untuk konten trading/market update. Default portrait (TikTok/IG). Setelah render selesai berikan link download.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul besar, mis. "MARKET WATCH" atau "CRYPTO TODAY"' },
        subtitle: { type: 'string', description: 'Label kecil, mis. "LIVE" atau tanggal' },
        items: {
          type: 'array',
          description: 'Daftar aset (3-6 ideal). Tiap item: symbol, price (angka), changePct (angka, boleh negatif).',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Kode aset, mis. BTC, IHSG, USD/IDR' },
              price: { type: 'number', description: 'Harga terkini' },
              changePct: { type: 'number', description: 'Perubahan persen, mis. 3.42 atau -0.87' },
            },
            required: ['symbol', 'price', 'changePct'],
          },
        },
        accentColor: { type: 'string', description: 'Warna aksen hex. Default ungu #7B3FA0' },
      },
      required: [],
    },
  },
  {
    name: 'render_candlestick_chart',
    description: 'Buat overlay CHART CANDLESTICK trading yang ter-reveal progresif (seperti TradingView), lengkap dengan grid harga, label simbol, timeframe, harga, dan persen perubahan. Cocok untuk analisis teknikal, update harga aset. Default portrait. Setelah render selesai berikan link download.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Simbol pasangan, mis. BTC/USD, BBCA, EUR/USD' },
        timeframe: { type: 'string', description: 'Timeframe, mis. 1H, 4H, 1D, 1W' },
        priceLabel: { type: 'string', description: 'Label harga terakhir, mis. "$71,234" atau "Rp9.850"' },
        changePct: { type: 'number', description: 'Persen perubahan, boleh negatif' },
        candles: {
          type: 'array',
          description: 'Data candle opsional (kalau kosong, dibuat tren naik realistis). Tiap candle: o,h,l,c (open/high/low/close).',
          items: {
            type: 'object',
            properties: {
              o: { type: 'number' }, h: { type: 'number' }, l: { type: 'number' }, c: { type: 'number' },
            },
            required: ['o', 'h', 'l', 'c'],
          },
        },
        accentColor: { type: 'string', description: 'Warna aksen hex. Default ungu #7B3FA0' },
      },
      required: [],
    },
  },
  {
    name: 'render_breaking_news',
    description: 'Buat overlay BREAKING NEWS finansial ala TV (Bloomberg/CNBC): badge "BREAKING" berkedip, bar headline besar, sumber berita, dan ticker berjalan di bawah. Ruang atas dibiarkan kosong untuk wajah Anda. Cocok untuk konten berita ekonomi/market alert. Default portrait. Setelah render selesai berikan link download.',
    inputSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'Judul berita utama (huruf kapital lebih bagus), mis. "FED HOLDS RATES STEADY AT 4.25%"' },
        source: { type: 'string', description: 'Sumber berita, mis. BLOOMBERG, REUTERS, CNBC' },
        ticker: { type: 'string', description: 'Teks ticker berjalan di bawah (poin-poin dipisah \u00b7)' },
        category: { type: 'string', description: 'Label kategori badge, mis. BREAKING, MARKET ALERT, URGENT' },
        accentColor: { type: 'string', description: 'Warna aksen hex. Default merah #FF4D5E' },
      },
      required: ['headline'],
    },
  },
  {
    name: 'render_market_dashboard',
    description: 'Buat overlay DASHBOARD pasar dengan COUNTER ANGKA beranimasi (angka berhitung naik) untuk 4 metrik kunci (indeks, crypto, inflasi, forex, dll) lengkap dengan persen perubahan. Cocok untuk rangkuman harian/mingguan. Default portrait. Setelah render selesai berikan link download.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Judul besar, mis. "MARKET SNAPSHOT"' },
        subtitle: { type: 'string', description: 'Subjudul, mis. "Today \u00b7 Key Numbers"' },
        metrics: {
          type: 'array',
          description: 'Daftar metrik (maks 4 ditampilkan). Tiap metrik: label, value (angka), prefix opsional (mis. $/Rp), suffix opsional (mis. %), changePct opsional.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'number' },
              prefix: { type: 'string' },
              suffix: { type: 'string' },
              changePct: { type: 'number' },
            },
            required: ['label', 'value'],
          },
        },
        accentColor: { type: 'string', description: 'Warna aksen hex. Default ungu #7B3FA0' },
      },
      required: [],
    },
  },
  {
    name: 'render_workflow_explainer',
    description: 'Ubah sebuah WORKFLOW / INFOGRAFIS / proses step-by-step menjadi VIDEO ANIMASI penjelasan yang elegan & TIDAK MEMBOSANKAN. Setiap langkah muncul beranimasi (nomor besar, judul dengan kata di-highlight, deskripsi, poin-poin ber-ikon/thumbnail, chip tools, label monospace konteks) sehingga PAS dipadukan dengan narasi TTS di CapCut. PENTING - TEMA ADAPTIF: video TIDAK lagi seragam ungu-hitam. WAJIB SESUAIKAN tema dengan GAYA & WARNA gambar workflow yang dianalisis agar tiap konten terasa BEDA & segar. Pakai parameter `theme` (preset) ATAU `mode`+`accentColor`+`bgColor` (custom dari warna dominan gambar). Preset tersedia: dark-purple (brand default), light-terracotta (gaya off-white + oranye coral, sangat nyaman ditonton), dark-emerald, light-blue, dark-gold, dark-crimson, light-mono, dark-cyan. Tambahkan scene tipe "spotlight" sebagai MOMEN WAH (satu kalimat besar mengejutkan), dan scene tipe "statement" untuk gaya PODCAST/SUBTITLE punchy (kalimat ALL-CAPS muncul KATA PER KATA seperti karaoke, kata kunci menyala) — cocok meniru video talking-head viral TANPA wajah. Poin pada step juga bisa diberi highlight:true agar dibingkai KOTAK PENYOROT beraksen (ala kotak merah di video viral). Default portrait (1080x1920); pakai `format` untuk landscape/square. Setelah render selesai berikan link download.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Urutan scene workflow. Tipe: "intro" (title, subtitle, badge, icon, highlight), "step" (stepNumber, title, description, points[], tools[], icon, label, highlight; tiap point boleh objek {text, icon, imagePrompt, highlight:true untuk dibingkai kotak penyorot}), "connector" (text penghubung), "spotlight" (text kalimat besar = MOMEN WAH, highlight, label), "statement" (text kalimat ALL-CAPS gaya karaoke per-kata, highlight kata kunci, label, align center/bottom), "summary" (title, steps[]), "outro" (title, subtitle, cta, handle, highlight). STRUKTUR STORYTELLING yang disarankan (meniru kreator viral): intro(HOOK ke hasil/janji) -> statement/step(masalah/cara lama) -> step(solusi, bisa point highlight:true) -> statement(bukti punchy) -> spotlight(momen wah) -> outro(CTA). Tiap scene boleh punya duration (detik) & sceneImage via imagePrompt.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['intro', 'step', 'connector', 'spotlight', 'statement', 'summary', 'outro'], description: 'Jenis scene' },
              title: { type: 'string', description: 'Judul (intro/step/summary/outro)' },
              subtitle: { type: 'string', description: 'Subjudul (intro/outro)' },
              badge: { type: 'string', description: 'Label kecil di atas judul intro, mis. "WORKFLOW"' },
              icon: { type: 'string', description: 'Emoji ikon (intro/step), mis. "💡"' },
              stepNumber: { type: ['number', 'string'], description: 'Nomor langkah untuk scene step, mis. 1' },
              description: { type: 'string', description: 'Penjelasan langkah (scene step)' },
              points: { type: 'array', items: { type: ['string', 'object'], properties: { text: { type: 'string', description: 'Teks poin' }, icon: { type: 'string', description: 'Emoji ikon relevan untuk poin ini, mis. "📊"' }, imagePrompt: { type: 'string', description: 'OPSIONAL. Prompt gambar AI (Bahasa Inggris) untuk thumbnail mini di poin ini, sesuai isi poin. Server generate via Replicate. Jika diisi, mengalahkan icon.' } } }, description: 'Daftar poin yang muncul satu per satu (scene step). Tiap poin boleh berupa STRING biasa, ATAU OBJEK {text, icon, imagePrompt} agar punya VISUAL sendiri. Disarankan tiap poin diberi `icon` emoji relevan (gratis & rapi); pakai `imagePrompt` hanya bila ingin thumbnail AI nyata per-poin.' },
              tools: { type: 'array', items: { type: 'string' }, description: 'Daftar tools/aplikasi sebagai chip (scene step), mis. ["ChatGPT","Canva"]' },
              text: { type: 'string', description: 'Teks penghubung (scene connector)' },
              steps: { type: 'array', items: { type: 'string' }, description: 'Rekap langkah (scene summary)' },
              cta: { type: 'string', description: 'Tombol ajakan (scene outro)' },
              handle: { type: 'string', description: 'Handle akun (scene outro), mis. @karmanrizky' },
              label: { type: 'string', description: 'OPSIONAL (scene step/spotlight/statement). Pill MONOSPACE konteks di atas judul, mis. "< CARA LAMA >", "< INILAH TRIKNYA >". Meniru gaya kreator referensi agar terasa berkonteks.' },
              highlight: { type: 'string', description: 'OPSIONAL (intro/step/spotlight/statement/outro). Sebuah KATA/FRASA di dalam title/text yang akan diberi WARNA AKSEN untuk penekanan kinetik. Untuk scene statement boleh beberapa kata (pisah spasi). Harus persis cocok dengan potongan teks di title/text.' },
              align: { type: 'string', enum: ['center', 'bottom'], description: 'OPSIONAL (scene statement). Posisi teks: center (default) atau bottom (gaya subtitle di bawah, cocok bila digabung video wajah di CapCut).' },
              imagePrompt: { type: 'string', description: 'OPSIONAL. Prompt gambar AI (Bahasa Inggris) untuk dijadikan BACKGROUND cinematic scene ini. Server akan generate gambar via Replicate Flux lalu memasangnya full-screen dengan slow-zoom (Ken Burns) + overlay gelap agar teks tetap terbaca. Gunakan untuk scene yang ingin terlihat hidup/menakjubkan (mis. intro & step penting). SESUAIKAN dengan TOPIK scene (bukan selalu Bitcoin). Contoh per topik: trading="abstract glowing candlestick chart, purple neon, cinematic"; AI="glowing neural network nodes connected by light, futuristic, dark purple"; ekonomi="abstract currency symbol dissolving into light particles, dark moody"; mindset="lone silhouette on mountain peak at dawn, dramatic sky". Selalu Bahasa Inggris, nuansa deep purple/black, cinematic. Kosongkan jika scene cukup polos. Jangan masukkan teks/tulisan di prompt.' },
              duration: { type: 'number', description: 'Durasi scene dalam detik. Default: intro/outro 4, step 5, connector 2, summary 5.' },
            },
            required: ['type'],
          },
        },
        topic: { type: 'string', description: 'Topik/judul workflow (opsional, untuk referensi)' },
        brandName: { type: 'string', description: 'Nama brand di pojok atas. Default "Karmanrizky". Kosongkan ("") bila tak ingin brand tag.' },
        theme: { type: 'string', enum: ['dark-purple', 'light-terracotta', 'dark-emerald', 'light-blue', 'dark-gold', 'dark-crimson', 'light-mono', 'dark-cyan'], description: 'PRESET TEMA. PILIH yang paling cocok dengan gaya/warna gambar workflow agar konten tidak seragam. light-terracotta = gaya kreator referensi (off-white nyaman). Jika gambar dominan terang pilih preset light-*, jika gelap pilih dark-*.' },
        mode: { type: 'string', enum: ['dark', 'light'], description: 'OPSIONAL. Paksa mode terang/gelap (override preset). Pakai bila menentukan warna custom dari gambar: light=latar terang teks gelap, dark=latar gelap teks terang.' },
        accentColor: { type: 'string', description: 'Warna aksen utama hex. Bila dipakai TANPA theme, ambil dari WARNA DOMINAN gambar workflow agar serasi. Default ungu #7B3FA0' },
        secondaryColor: { type: 'string', description: 'Warna aksen sekunder hex. Default #A855F7' },
        bgColor: { type: 'string', description: 'Warna latar hex (override). Untuk mode light pakai warna terang mis. #F5EFE9; untuk dark mis. #0B0710.' },
        referenceImageUrl: { type: 'string', description: 'URL gambar workflow asli (opsional) untuk dipakai sebagai latar samar' },
      },
      required: ['scenes'],
    },
  },
];

// ─────────────────────────────────────────────
// Suntikkan parameter `format` ke semua tool render (kecuali utilitas).
// portrait = TikTok/IG Reels (1080x1920), landscape = YouTube (1920x1080), square = feed IG (1080x1080).
// ─────────────────────────────────────────────
const NON_RENDER_TOOLS = new Set(['check_render_status', 'get_templates']);
for (const _tool of MCP_TOOLS) {
  if (NON_RENDER_TOOLS.has(_tool.name)) continue;
  if (!_tool.inputSchema || !_tool.inputSchema.properties) continue;
  if (!_tool.inputSchema.properties.format) {
    _tool.inputSchema.properties.format = {
      type: 'string',
      enum: ['portrait', 'landscape', 'square'],
      description: 'Rasio output video. "portrait" (1080x1920) untuk TikTok/Instagram Reels/Shorts, "landscape" (1920x1080) untuk YouTube, "square" (1080x1080) untuk feed Instagram. Default mengikuti rasio asli template.',
    };
  }
}

// ─────────────────────────────────────────────
// Helper: generate satu gambar cinematic via Replicate Flux Schnell.
// Dipakai untuk memperkaya scene Workflow Explainer (background per-scene).
// Mengembalikan URL gambar, atau null jika gagal (render tetap lanjut tanpa gambar).
// ─────────────────────────────────────────────
const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function generateReplicateImage(prompt, aspectRatio = '9:16') {
  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_TOKEN || !prompt) return null;
  // Style cinematic premium konsisten dengan brand Karmanrizky (ungu-hitam, elegan).
  const styled = `${prompt}, cinematic, dramatic lighting, premium dark aesthetic with subtle purple tones, highly detailed, professional photography, depth of field, 8k, no text, no watermark`;
  // Coba beberapa kali. Saat akun Replicate bersaldo < $5, rate limit "burst 1/menit" →
  // request bisa ditolak (HTTP 429). Kita hormati dengan menunggu lalu mencoba lagi,
  // sehingga SEMUA gambar (background + thumbnail poin) tetap dihasilkan.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell',
          input: { prompt: styled, num_outputs: 1, aspect_ratio: aspectRatio, output_format: 'webp', output_quality: 90, go_fast: true },
        }),
      });
      // Throttled → tunggu (hormati header Retry-After bila ada) lalu ulangi.
      if (res.status === 429) {
        const ra = parseInt(res.headers.get('retry-after') || '', 10);
        const waitMs = (Number.isFinite(ra) ? ra : 12) * 1000 + 1000;
        console.error(`[ReplicateImg] throttled, retry in ${waitMs}ms (attempt ${attempt + 1})`);
        await _sleep(waitMs);
        continue;
      }
      const pred = await res.json();
      if (!pred.id) {
        const msg = JSON.stringify(pred).slice(0, 200);
        // Beberapa balasan throttle datang sebagai body, bukan status 429.
        if (/throttl|rate limit/i.test(msg)) {
          console.error(`[ReplicateImg] throttled(body), retry (attempt ${attempt + 1})`);
          await _sleep(13000);
          continue;
        }
        console.error('[ReplicateImg] no id:', msg);
        return null;
      }
      for (let i = 0; i < 45; i++) {
        await _sleep(2000);
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
        });
        const data = await pollRes.json();
        if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output;
        if (data.status === 'failed' || data.status === 'canceled') { console.error('[ReplicateImg] failed:', data.error); return null; }
      }
      console.error('[ReplicateImg] timeout');
      return null;
    } catch (err) {
      console.error('[ReplicateImg] error:', err.message);
      await _sleep(3000);
    }
  }
  console.error('[ReplicateImg] gave up after retries');
  return null;
}

// Map format video -> aspect ratio gambar Replicate.
function formatToAspect(fmt) {
  if (fmt === 'landscape') return '16:9';
  if (fmt === 'square') return '1:1';
  return '9:16'; // portrait default
}

// ─────────────────────────────────────────────
// MCP Tool Executor
// ─────────────────────────────────────────────
async function executeTool(name, args, baseUrl) {
  // Format global (portrait utk TikTok/IG, landscape utk YouTube, square utk feed).
  // Diekstrak sekali di sini lalu otomatis diteruskan oleh wrapper startRender.
  const _format = (args && (args.format === 'portrait' || args.format === 'landscape' || args.format === 'square')) ? args.format : null;
  // Wrapper startRender lokal: 6 argumen pertama sama, format diinject otomatis dari _format.
  const startRender = (renderId, compositionId, inputProps, baseUrlArg, progressInterval = 3000, progressStep = 5, fmt) => {
    return startRenderJob(renderId, compositionId, inputProps, baseUrlArg, progressInterval, progressStep, fmt !== undefined ? fmt : _format);
  };

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

  // v4.0 tools
  if (name === 'render_hud_scene') {
    const { title = 'MISSION CONTROL', subtitle = 'SYSTEM ONLINE', stats = [], accentColor = '#FF3B30', layout = 'full' } = args;
    const renderId = randomUUID();
    const scenes = [{ type: 'hud_scene', text: title, subtext: subtitle, stats, accentColor, bgLayout: layout, duration: 5 }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **HUD/Mission Control dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_algorithmic_scene') {
    const { title = 'YOUR YEAR', subtitle = 'Wrapped 2024', stats = [], username = '@creator', gradient = ['#FF006E', '#8338EC', '#3A86FF'], layout = 'full' } = args;
    const renderId = randomUUID();
    const scenes = [{ type: 'algorithmic_scene', text: title, subtext: subtitle, stats, username, bgGradient: gradient, bgLayout: layout, duration: 5 }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **Algorithmic/Wrapped Scene dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_brutalist_scene') {
    const { title = 'DESIGN IS DEAD', subtitle = 'Long live the machine', body = '', number = '01', layout = 'full' } = args;
    const renderId = randomUUID();
    const scenes = [{ type: 'brutalist_scene', text: title, subtext: subtitle, body, number, bgLayout: layout, duration: 5 }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **Brutalist Scene dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_sketchbook_scene') {
    const { title = 'My Big Idea', points = [], author = '', layout = 'full' } = args;
    const renderId = randomUUID();
    const scenes = [{ type: 'sketchbook_scene', text: title, points, author, bgLayout: layout, duration: 5 }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **Sketchbook Scene dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_whiteboard_scene') {
    const { title = 'The Plan', stickies = [], layout = 'full' } = args;
    const renderId = randomUUID();
    const scenes = [{ type: 'whiteboard_scene', text: title, stickies, bgLayout: layout, duration: 5 }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **Whiteboard Scene dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_kinetic_typography') {
    const { words = [], highlightWords = [], style = 'dark', accentColor = '#6C63FF', layout = 'full', fontSize = 72 } = args;
    if (!words.length) throw new Error('words tidak boleh kosong');
    const renderId = randomUUID();
    const scenes = [{ type: 'kinetic_typography', words, highlightWords, style, accentColor, bgLayout: layout, fontSize, duration: Math.max(5, Math.ceil(words.length * 0.4)) }];
    startRender(renderId, 'MultiSceneVideo', { scenes, style: 'cinematic' }, baseUrl, 3000, 5);
    return `✅ **Kinetic Typography dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // v5.0 tools
  if (name === 'render_comment_explosion') {
    const { comments = [], title = 'Apa Kata Mereka?', bgColor = '#0A0A14', accentColor = '#6C63FF', layout = 'full' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'CommentExplosionVideo', { comments, title, bgColor, accentColor, layout }, baseUrl, 2500, 6);
    return `✅ **Comment Explosion dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_vhs_timeline') {
    const { events = [], title = 'PERJALANAN KAMI', accentColor = '#00FF41', layout = 'full' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'VHSTimelineVideo', { events, title, accentColor, layout }, baseUrl, 3000, 5);
    return `✅ **VHS Timeline dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_macos_dock') {
    const { apps = [], title = 'Tools yang Saya Gunakan', subtitle = 'Stack lengkap untuk kreator modern', bgStyle = 'dark', accentColor = '#007AFF', layout = 'full' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'MacOSDockVideo', { apps, title, subtitle, bgStyle, accentColor, layout }, baseUrl, 2500, 6);
    return `✅ **macOS Dock Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_youtube_subscribe') {
    const { channelName = 'Channel Kamu', targetSubscribers = 100000, startSubscribers = 0, milestone = '100K SUBSCRIBERS!', accentColor = '#FF0000', bgColor = '#0F0F0F', layout = 'full' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'YouTubeSubscribeVideo', { channelName, targetSubscribers, startSubscribers, milestone, accentColor, bgColor, layout }, baseUrl, 2500, 6);
    return `✅ **YouTube Subscribe Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // analyze_video_and_generate
  if (name === 'analyze_video_and_generate') {
    const { videoUrl, language = 'id', layout = 'full', style = 'cinematic' } = args;
    if (!videoUrl) throw new Error('videoUrl diperlukan');

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY belum dikonfigurasi di Railway environment variables');

    const analysisId = randomUUID();
    renderJobs[analysisId] = { status: 'processing', progress: 5, message: 'Menyiapkan analisis video...' };

    // Helper: konversi Google Drive URL ke direct download
    function convertGoogleDriveUrl(url) {
      const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
      const match2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
      if (match2) return `https://drive.google.com/uc?export=download&id=${match2[1]}&confirm=t`;
      return url;
    }

    // Run analysis async (non-blocking)
    (async () => {
      try {
        const axios = require('axios');
        const FormData = require('form-data');
        const os = require('os');

        // Step 1: Download video
        renderJobs[analysisId].progress = 10;
        renderJobs[analysisId].message = 'Mengunduh video...';
        const directUrl = convertGoogleDriveUrl(videoUrl);
        console.log('[Analyze] Downloading from:', directUrl);

        const videoResp = await axios.get(directUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
          maxContentLength: 25 * 1024 * 1024,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        const videoBuffer = Buffer.from(videoResp.data);
        const contentType = videoResp.headers['content-type'] || 'video/mp4';
        let ext = '.mp4';
        if (contentType.includes('webm')) ext = '.webm';
        else if (contentType.includes('quicktime') || contentType.includes('mov')) ext = '.mov';
        else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = '.mp3';
        else if (contentType.includes('wav')) ext = '.wav';
        else if (contentType.includes('ogg')) ext = '.ogg';

        const tmpFile = path.join(os.tmpdir(), `analyze_${analysisId}${ext}`);
        fs.writeFileSync(tmpFile, videoBuffer);
        console.log('[Analyze] Saved to:', tmpFile, '| Size:', videoBuffer.length, 'bytes');

        // Step 2: Transkripsi dengan Groq Whisper
        renderJobs[analysisId].progress = 30;
        renderJobs[analysisId].message = 'Mentranskripsi audio dengan Groq Whisper...';

        const formData = new FormData();
        formData.append('file', fs.createReadStream(tmpFile), { filename: `audio${ext}`, contentType });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', language);
        formData.append('response_format', 'json');

        const whisperResp = await axios.post(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          formData,
          {
            headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${GROQ_API_KEY}` },
            timeout: 120000,
          }
        );

        const transcript = whisperResp.data.text || '';
        console.log('[Analyze] Transcript length:', transcript.length);
        try { fs.unlinkSync(tmpFile); } catch (e) {}

        if (!transcript || transcript.trim().length < 10) {
          throw new Error('Transkripsi terlalu pendek atau kosong. Pastikan video memiliki audio yang jelas.');
        }

        // Step 3: Analisis dengan Groq LLM
        renderJobs[analysisId].progress = 55;
        renderJobs[analysisId].message = 'Menganalisis konten dengan AI...';

        const systemPrompt = `Kamu adalah asisten pembuat animasi video presentasi profesional.
Berdasarkan transkripsi video, buat rencana animasi yang relevan dan menarik.
Jenis animasi yang tersedia: kinetic_typography, data_chart, bullet_points, title_card, countdown, progress_bar.
Buat 3-5 animasi yang paling relevan. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`;

        const userPrompt = `Transkripsi video (bahasa: ${language}):
"${transcript.substring(0, 3000)}"

Buat rencana animasi dalam format JSON array:
[
  {
    "type": "kinetic_typography",
    "text": "teks utama animasi",
    "subtext": "teks pendukung (opsional)",
    "reason": "alasan mengapa animasi ini relevan"
  }
]`;

        const llmResp = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          },
          {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 60000,
          }
        );

        const llmContent = llmResp.data.choices[0].message.content;

        // Parse JSON dari response LLM
        let animationPlan = [];
        try {
          const jsonMatch = llmContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) animationPlan = JSON.parse(jsonMatch[0]);
          else animationPlan = JSON.parse(llmContent);
        } catch (parseErr) {
          const words = transcript.split(' ').slice(0, 8).join(' ');
          animationPlan = [
            { type: 'kinetic_typography', text: words, reason: 'Kutipan pembuka dari video' },
            { type: 'bullet_points', text: 'Poin Utama', subtext: transcript.substring(0, 100), reason: 'Ringkasan konten' },
          ];
        }

        if (!Array.isArray(animationPlan) || animationPlan.length === 0) {
          throw new Error('AI tidak berhasil membuat rencana animasi');
        }

        // Step 4: Render semua animasi
        renderJobs[analysisId].progress = 70;
        renderJobs[analysisId].message = `Merender ${animationPlan.length} animasi...`;

        const renderResults = [];
        for (let i = 0; i < animationPlan.length; i++) {
          const scene = animationPlan[i];
          const renderId = randomUUID();
          const scenes = [{ type: scene.type || 'kinetic_typography', text: scene.text || 'Animasi', subtext: scene.subtext || '', bgLayout: layout }];
          startRender(renderId, 'MultiSceneVideo', { scenes, style }, baseUrl, 3000, 5);
          renderResults.push({
            index: i + 1,
            type: scene.type,
            text: scene.text,
            reason: scene.reason || '',
            renderId,
            statusUrl: `${baseUrl}/status/${renderId}`,
            downloadUrl: `${baseUrl}/download/${renderId}`,
          });
          renderJobs[analysisId].progress = 70 + Math.round((i + 1) / animationPlan.length * 28);
        }

        renderJobs[analysisId] = {
          status: 'done',
          progress: 100,
          message: 'Analisis selesai!',
          transcript: transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
          animationCount: renderResults.length,
          animations: renderResults,
        };
        console.log('[Analyze] Done! Generated', renderResults.length, 'animations');

      } catch (err) {
        console.error('[Analyze] Error:', err.message);
        renderJobs[analysisId] = { status: 'error', progress: 0, error: err.message };
      }
    })();

    return `🎬 **Analisis video dimulai!**\n\n📋 **Analysis ID**: \`${analysisId}\`\n⏱️ Estimasi: 2-4 menit (download + transkripsi Groq Whisper + analisis AI + render)\n\nGunakan \`check_render_status\` dengan ID ini untuk memantau progres dan mendapatkan link download semua animasi.`;
  }

  // render_explainer_video
  if (name === 'render_explainer_video') {
    const { topic = 'Explainer', scenes = [], bgColor = '#0A0A14', accentColor = '#6C63FF' } = args;
    if (!scenes.length) throw new Error('scenes tidak boleh kosong. Tambahkan minimal 1 scene.');
    const renderId = randomUUID();
    const durationInFrames = Math.max(90, scenes.length * 90);
    const estimatedMs = durationInFrames * (1000 / 30);
    startRender(renderId, 'ExplainerVideo', { topic, scenes, bgColor, accentColor }, baseUrl, Math.max(3000, estimatedMs / 10), 5);
    return `✅ **Explainer Video dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n🎬 **Topik**: ${topic}\n📊 **Jumlah Scene**: ${scenes.length} scene (${scenes.length * 3} detik video)\n⏱️ Estimasi render: ${Math.ceil(scenes.length * 20)}-${Math.ceil(scenes.length * 40)} detik\n\nGunakan \`check_render_status\` untuk memantau progres dan mendapatkan link download.`;
  }
  // render_character_animation
  if (name === 'render_character_animation') {
    const { scenes = [], characterName, characterTitle, bgColor = '#0A0A14', accentColor = '#6C63FF', background = 'gradient' } = args;
    if (!scenes.length) throw new Error('scenes tidak boleh kosong. Tambahkan minimal 1 scene dengan character dan pose.');
    const renderId = randomUUID();
    const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 4), 0);
    const durationInFrames = Math.max(120, totalDuration * 30);
    const estimatedSec = Math.ceil(scenes.length * 15);
    startRender(renderId, 'CharacterAnimation', { scenes, characterName, characterTitle, bgColor, accentColor, background }, baseUrl, Math.max(3000, durationInFrames * 30), 5);
    const charTypes = [...new Set(scenes.map(s => s.character))].join(', ');
    return `✅ **Character Animation dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n👤 **Karakter**: ${charTypes}\n🎬 **Jumlah Scene**: ${scenes.length} scene (${totalDuration} detik video)\n${characterName ? `🏷️ **Nama**: ${characterName}\n` : ''}${characterTitle ? `💼 **Jabatan**: ${characterTitle}\n` : ''}⏱️ Estimasi render: ${estimatedSec}-${estimatedSec * 2} detik\n\nGunakan \`check_render_status\` untuk memantau progres dan mendapatkan link download.`;
  }
  // render_ai_character_video
  if (name === 'render_ai_character_video') {
    const {
      characterDescription,
      characterName = 'Character',
      characterTitle = '',
      scenes = [],
      bgColor = '#0a0a1a',
      accentColor = '#f97316',
      imageStyle = 'illustration',
    } = args;

    if (!characterDescription) throw new Error('characterDescription diperlukan. Deskripsikan karakter yang ingin di-generate.');
    if (!scenes.length) throw new Error('scenes tidak boleh kosong. Tambahkan minimal 1 scene.');

    const renderId = randomUUID();
    renderJobs[renderId] = { status: 'processing', progress: 0, message: '🎨 Generating AI character illustration...' };

    // Proses async: generate gambar dulu, lalu render video
    (async () => {
      try {
        const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
        if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN tidak tersedia di server');

        // Build prompt berdasarkan style
        const styleMap = {
          illustration: 'digital illustration, clean vector art style, professional',
          realistic: 'photorealistic, professional photography, studio lighting',
          cartoon: 'cartoon style, vibrant colors, clean lines',
          anime: 'anime style, detailed, colorful',
          oil_painting: 'oil painting style, artistic, detailed brushwork',
          digital_art: 'digital art, concept art, detailed',
        };
        const stylePrompt = styleMap[imageStyle] || styleMap.illustration;
        const fullPrompt = `${characterDescription}, ${stylePrompt}, portrait, upper body, white or transparent background, high quality`;

        renderJobs[renderId].message = '🎨 Mengirim request ke Replicate AI...';
        renderJobs[renderId].progress = 10;

        // Call Replicate API
        const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REPLICATE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: 'black-forest-labs/flux-schnell',
            input: {
              prompt: fullPrompt,
              num_outputs: 1,
              aspect_ratio: '3:4',
              output_format: 'webp',
              output_quality: 85,
            },
          }),
        });

        const prediction = await replicateRes.json();
        if (!prediction.id) throw new Error(`Replicate error: ${JSON.stringify(prediction)}`);

        renderJobs[renderId].message = '⏳ AI sedang menggambar karakter...';
        renderJobs[renderId].progress = 20;

        // Poll Replicate untuk hasil
        let imageUrl = null;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
          });
          const pollData = await pollRes.json();

          if (pollData.status === 'succeeded') {
            imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
            break;
          } else if (pollData.status === 'failed') {
            throw new Error(`Replicate generation failed: ${pollData.error}`);
          }

          renderJobs[renderId].progress = Math.min(50, 20 + i * 0.5);
        }

        if (!imageUrl) throw new Error('Timeout: AI tidak berhasil generate gambar dalam 2 menit');

        renderJobs[renderId].message = '🎬 Gambar berhasil! Memulai render video...';
        renderJobs[renderId].progress = 55;

        // Hitung total durasi
        const totalFrames = Math.max(120, scenes.reduce((acc, s) => acc + (s.duration || 90), 0));
        const timeoutMs = Math.max(5000, totalFrames * 50);

        // Render video dengan gambar AI
        const videoRenderId = randomUUID();
        startRender(videoRenderId, 'AICharacterVideo', {
          scenes,
          bgColor,
          accentColor,
          textColor: '#ffffff',
          characterImageUrl: imageUrl,
          characterName,
          characterTitle,
        }, baseUrl, timeoutMs, 5);

        // Monitor render video
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const videoJob = renderJobs[videoRenderId];
          if (!videoJob) break;

          if (videoJob.status === 'done') {
            renderJobs[renderId] = {
              status: 'done',
              progress: 100,
              downloadUrl: videoJob.downloadUrl,
              fileSize: videoJob.fileSize,
              message: 'Video selesai!',
              characterImageUrl: imageUrl,
            };
            break;
          } else if (videoJob.status === 'error') {
            throw new Error(videoJob.error);
          }

          renderJobs[renderId].progress = Math.min(95, 55 + i * 0.3);
          renderJobs[renderId].message = `🎬 Rendering video... ${videoJob?.progress || 0}%`;
        }

      } catch (err) {
        renderJobs[renderId] = { status: 'error', error: err.message };
      }
    })();

    const sceneTypes = scenes.map(s => s.type).join(', ');
    return `✅ **AI Character Video dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n🎨 **Karakter**: ${characterName}\n💼 **Jabatan**: ${characterTitle}\n🖼️ **Style**: ${imageStyle}\n🎬 **Scenes**: ${scenes.length} scene (${sceneTypes})\n⏱️ Estimasi: 60-120 detik (generate AI + render video)\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  // render_baranganeh_video
  if (name === 'render_baranganeh_video') {
    const {
      lotNumber = 'LOT #001',
      category = 'dark_obsession',
      curatorDescription,
      objectDescription,
      objectName = 'Artefak Tidak Dikenal',
      scenes,
      accentColor = '#C9A84C',
      animateWithAI = false,
      partLabel,
    } = args;

    const renderId = randomUUID();
    renderJobs[renderId] = { status: 'processing', progress: 0, message: '🔍 Memulai pipeline @baranganeh...' };

    (async () => {
      try {
        const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
        if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN tidak tersedia di server');

        // ── Step 1: Generate gambar KURATOR via Flux Dev ──
        renderJobs[renderId].message = '🎨 [1/4] Menggambar kurator dengan Flux Dev...';
        renderJobs[renderId].progress = 5;

        const curatorPrompt = `${curatorDescription}, chiaroscuro lighting, single candle light source, 70% face in shadow, dark background, cinematic portrait, high detail, 4k, dramatic atmosphere, no text, no watermark`;

        const curatorPredRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              prompt: curatorPrompt,
              num_outputs: 1,
              aspect_ratio: '3:4',
              output_format: 'webp',
              output_quality: 90,
              num_inference_steps: 28,
              guidance_scale: 3.5,
            },
          }),
        });
        const curatorPred = await curatorPredRes.json();
        if (!curatorPred.id) throw new Error(`Flux Dev curator error: ${JSON.stringify(curatorPred)}`);

        // ── Step 2: Generate gambar OBJEK via Flux Dev (sequential, delay 15s untuk rate limit) ──
        renderJobs[renderId].message = '⏳ [1/4] Menunggu rate limit Replicate...';
        renderJobs[renderId].progress = 8;
        await new Promise(r => setTimeout(r, 15000)); // Tunggu 15 detik
        renderJobs[renderId].message = '🏺 [2/4] Menggambar objek/artefak dengan Flux Dev...';
        renderJobs[renderId].progress = 10;

        const objectPrompt = `${objectDescription}, dramatic studio lighting, dark background, museum photography, ultra detailed, cinematic, 4k, no text, no watermark, isolated object`;

        const objectPredRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              prompt: objectPrompt,
              num_outputs: 1,
              aspect_ratio: '3:4',
              output_format: 'webp',
              output_quality: 90,
              num_inference_steps: 28,
              guidance_scale: 3.5,
            },
          }),
        });
        const objectPred = await objectPredRes.json();
        if (!objectPred.id) throw new Error(`Flux Dev object error: ${JSON.stringify(objectPred)}`);

        // ── Poll gambar secara sequential ──
        const pollReplicate = async (predId, label, progressMsg) => {
          renderJobs[renderId].message = progressMsg;
          for (let i = 0; i < 90; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const res = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
              headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
            });
            const data = await res.json();
            if (data.status === 'succeeded') {
              return Array.isArray(data.output) ? data.output[0] : data.output;
            } else if (data.status === 'failed') {
              throw new Error(`${label} generation failed: ${data.error}`);
            }
          }
          throw new Error(`Timeout: ${label} tidak selesai dalam 4.5 menit`);
        };

        let curatorImageUrl = null;
        let objectImageUrl = null;

        // Poll kurator dulu
        curatorImageUrl = await pollReplicate(curatorPred.id, 'Kurator', '⏳ [1/4] AI sedang menggambar kurator...');
        renderJobs[renderId].progress = 25;
        renderJobs[renderId].curatorImageUrl = curatorImageUrl;

        // Poll objek setelah kurator selesai
        objectImageUrl = await pollReplicate(objectPred.id, 'Objek', '🏺 [2/4] AI sedang menggambar objek...');
        renderJobs[renderId].progress = 45;
        renderJobs[renderId].objectImageUrl = objectImageUrl;

        renderJobs[renderId].message = '✅ [2/4] Gambar kurator dan objek berhasil!';
        renderJobs[renderId].progress = 45;
        renderJobs[renderId].curatorImageUrl = curatorImageUrl;
        renderJobs[renderId].objectImageUrl = objectImageUrl;

        // ── Step 3 (Opsional): Animasi via WAN 2.5 i2v ──
        let objectVideoUrl = null;
        if (animateWithAI) {
          renderJobs[renderId].message = '🎥 [3/4] Menganimasikan objek dengan WAN 2.5 i2v...';
          renderJobs[renderId].progress = 50;

          const wanRes = await fetch('https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v-fast/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: {
                image: objectImageUrl,
                prompt: `slow dramatic camera movement, cinematic pan, the ${objectDescription} slowly rotates, dust particles floating, candlelight flickering, dark atmosphere, museum showcase, ultra cinematic`,
                duration: 5,
                resolution: '720p',
                negative_prompt: 'fast movement, blur, distortion, text, watermark',
                enable_prompt_expansion: true,
              },
            }),
          });
          const wanPred = await wanRes.json();
          if (wanPred.id) {
            objectVideoUrl = await pollReplicate(wanPred.id, 'WAN i2v');
            renderJobs[renderId].message = '✅ [3/4] Animasi objek berhasil!';
            renderJobs[renderId].progress = 70;
            renderJobs[renderId].objectVideoUrl = objectVideoUrl;
          }
        }

        // ── Step 4: Render final video dengan Remotion ──
        renderJobs[renderId].message = '🎬 [4/4] Merender video final dengan Remotion...';
        renderJobs[renderId].progress = animateWithAI ? 72 : 48;

        const totalFrames = Math.max(144, scenes.reduce((acc, s) => acc + (s.duration || 90), 0));
        const timeoutMs = Math.max(60000, totalFrames * 80);

        const videoRenderId = randomUUID();
        startRender(videoRenderId, 'BaranganehVideo', {
          scenes,
          curatorImageUrl,
          objectImageUrl,
          objectVideoUrl,
          backgroundType: 'library',
          accentColor,
          lotNumber,
          category,
          partLabel,
        }, baseUrl, timeoutMs, 5);

        // Monitor render video
        for (let i = 0; i < 150; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const videoJob = renderJobs[videoRenderId];
          if (!videoJob) break;
          if (videoJob.status === 'done') {
            renderJobs[renderId] = {
              status: 'done',
              progress: 100,
              downloadUrl: videoJob.downloadUrl,
              fileSize: videoJob.fileSize,
              message: '✅ Video @baranganeh selesai!',
              curatorImageUrl,
              objectImageUrl,
              objectVideoUrl,
            };
            break;
          } else if (videoJob.status === 'error') {
            throw new Error(videoJob.error);
          }
          const baseProgress = animateWithAI ? 72 : 48;
          renderJobs[renderId].progress = Math.min(95, baseProgress + i * 0.3);
          renderJobs[renderId].message = `🎬 [4/4] Rendering... ${videoJob?.progress || 0}%`;
        }
      } catch (err) {
        renderJobs[renderId] = { status: 'error', error: err.message };
      }
    })();

    const sceneTypes = scenes.map(s => s.type).join(' → ');
    const estimatedTime = animateWithAI ? '5-8 menit (dengan animasi AI)' : '2-4 menit';
    return `✅ **@baranganeh Video Pipeline Dimulai!**

📋 **Render ID**: \`${renderId}\`
🏷️ **Lot**: ${lotNumber} | **Kategori**: ${category}
🎨 **Pipeline**: Flux Dev (kurator) + Flux Dev (objek)${animateWithAI ? ' + WAN i2v (animasi)' : ''} + Remotion
🎬 **Scenes**: ${scenes.length} scene: ${sceneTypes}
⏱️ **Estimasi**: ${estimatedTime}

Gunakan \`check_render_status\` dengan render ID di atas untuk memantau progres.`;
  }

  if (name === 'render_borneo_video') {
    const {
      episodeLabel = 'EPISODE 01 — THE SILENT WITNESS',
      speciesDescription,
      naturalistDescription,
      scenes,
      accentColor = '#3FA66A',
      secondaryColor = '#7B3FA0',
      animateWithAI = false,
      partLabel,
      seriesName = 'BORNEO PRIDE',
    } = args;

    const renderId = randomUUID();
    renderJobs[renderId] = { status: 'processing', progress: 0, message: '🌿 Memulai pipeline BORNEO PRIDE...' };

    (async () => {
      try {
        const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
        if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN tidak tersedia di server');

        const pollReplicate = async (predId, label, progressMsg) => {
          if (progressMsg) renderJobs[renderId].message = progressMsg;
          for (let i = 0; i < 90; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const res = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
              headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
            });
            const data = await res.json();
            if (data.status === 'succeeded') {
              return Array.isArray(data.output) ? data.output[0] : data.output;
            } else if (data.status === 'failed') {
              throw new Error(`${label} generation failed: ${data.error}`);
            }
          }
          throw new Error(`Timeout: ${label} tidak selesai dalam 4.5 menit`);
        };

        // ── Step 1: Generate gambar SPESIES via Flux Dev (landscape 16:9) ──
        renderJobs[renderId].message = '🌿 [1/3] Menggambar spesies/landscape dengan Flux Dev...';
        renderJobs[renderId].progress = 6;

        const speciesPrompt = `${speciesDescription}, ultra detailed, cinematic, 8k, national geographic style, dramatic natural lighting, no text, no watermark`;

        const speciesPredRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              prompt: speciesPrompt,
              num_outputs: 1,
              aspect_ratio: '16:9',
              output_format: 'webp',
              output_quality: 90,
              num_inference_steps: 28,
              guidance_scale: 3.5,
            },
          }),
        });
        const speciesPred = await speciesPredRes.json();
        if (!speciesPred.id) throw new Error(`Flux Dev species error: ${JSON.stringify(speciesPred)}`);

        let speciesImageUrl = await pollReplicate(speciesPred.id, 'Spesies', '⏳ [1/3] AI sedang menggambar spesies...');
        renderJobs[renderId].progress = 30;
        renderJobs[renderId].speciesImageUrl = speciesImageUrl;

        // ── Step 1b (opsional): Generate gambar naturalis ──
        let naturalistImageUrl = null;
        if (naturalistDescription) {
          await new Promise(r => setTimeout(r, 12000));
          renderJobs[renderId].message = '🧭 [1/3] Menggambar naturalis...';
          const natPredRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: {
                prompt: `${naturalistDescription}, documentary photography, natural light, ultra detailed, cinematic, no text, no watermark`,
                num_outputs: 1,
                aspect_ratio: '3:4',
                output_format: 'webp',
                output_quality: 90,
                num_inference_steps: 28,
                guidance_scale: 3.5,
              },
            }),
          });
          const natPred = await natPredRes.json();
          if (natPred.id) {
            naturalistImageUrl = await pollReplicate(natPred.id, 'Naturalis', '⏳ [1/3] AI sedang menggambar naturalis...');
            renderJobs[renderId].naturalistImageUrl = naturalistImageUrl;
          }
        }
        renderJobs[renderId].progress = 42;

        // ── Step 2 (opsional): Animasi via WAN 2.5 i2v ──
        let speciesVideoUrl = null;
        if (animateWithAI) {
          renderJobs[renderId].message = '🎥 [2/3] Menganimasikan spesies dengan WAN 2.5 i2v...';
          renderJobs[renderId].progress = 48;

          const wanRes = await fetch('https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v-fast/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: {
                image: speciesImageUrl,
                prompt: `slow cinematic camera movement, gentle drifting, water flowing gently, light rays moving through the canopy, leaves swaying softly, documentary nature cinematography, peaceful atmosphere`,
                duration: 5,
                resolution: '720p',
                negative_prompt: 'fast movement, blur, distortion, text, watermark',
                enable_prompt_expansion: true,
              },
            }),
          });
          const wanPred = await wanRes.json();
          if (wanPred.id) {
            speciesVideoUrl = await pollReplicate(wanPred.id, 'WAN i2v', '🎥 [2/3] AI sedang menganimasikan...');
            renderJobs[renderId].progress = 68;
            renderJobs[renderId].speciesVideoUrl = speciesVideoUrl;
          }
        }

        // ── Step 3: Render final video dengan Remotion ──
        renderJobs[renderId].message = '🎬 [3/3] Merender video final dengan Remotion (1920x1080)...';
        renderJobs[renderId].progress = animateWithAI ? 70 : 46;

        const totalFrames = Math.max(240, scenes.reduce((acc, s) => acc + (s.duration || 120), 0));
        const timeoutMs = Math.max(90000, totalFrames * 100);

        const videoRenderId = randomUUID();
        startRender(videoRenderId, 'BorneoVideo', {
          scenes,
          speciesImageUrl,
          speciesVideoUrl,
          naturalistImageUrl,
          accentColor,
          secondaryColor,
          episodeLabel,
          partLabel,
          seriesName,
        }, baseUrl, timeoutMs, 5);

        for (let i = 0; i < 200; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const videoJob = renderJobs[videoRenderId];
          if (!videoJob) break;
          if (videoJob.status === 'done') {
            renderJobs[renderId] = {
              status: 'done',
              progress: 100,
              downloadUrl: videoJob.downloadUrl,
              fileSize: videoJob.fileSize,
              message: '✅ Video BORNEO PRIDE selesai!',
              speciesImageUrl,
              speciesVideoUrl,
              naturalistImageUrl,
            };
            break;
          } else if (videoJob.status === 'error') {
            throw new Error(videoJob.error);
          }
          const baseProgress = animateWithAI ? 70 : 46;
          renderJobs[renderId].progress = Math.min(96, baseProgress + i * 0.25);
          renderJobs[renderId].message = `🎬 [3/3] Rendering... ${videoJob?.progress || 0}%`;
        }
      } catch (err) {
        renderJobs[renderId] = { status: 'error', error: err.message };
      }
    })();

    const sceneTypes = scenes.map(s => s.type).join(' → ');
    const totalFrames = Math.max(240, scenes.reduce((acc, s) => acc + (s.duration || 120), 0));
    const estSec = (totalFrames / 24).toFixed(0);
    const estimatedTime = animateWithAI ? '6-10 menit (dengan animasi AI)' : '3-6 menit';
    return `🌿 **BORNEO PRIDE Video Pipeline Dimulai!**

📋 **Render ID**: \`${renderId}\`
🎬 **Episode**: ${episodeLabel}
📺 **Format**: 1920x1080 (16:9 landscape, YouTube)
🎨 **Pipeline**: Flux Dev (spesies)${naturalistDescription ? ' + Flux Dev (naturalis)' : ''}${animateWithAI ? ' + WAN i2v (animasi)' : ''} + Remotion
🎞️ **Scenes**: ${scenes.length} scene (~${estSec} detik): ${sceneTypes}
⏱️ **Estimasi**: ${estimatedTime}

Gunakan \`check_render_status\` dengan render ID di atas untuk memantau progres.`;
  }

  // ── Trading tools ──
  if (name === 'render_stock_ticker') {
    const { title = 'MARKET WATCH', subtitle = 'LIVE', items = [], accentColor = '#7B3FA0' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'StockTicker', { title, subtitle, items, accentColor }, baseUrl, 2500, 6);
    return `✅ **Stock Ticker dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_candlestick_chart') {
    const { symbol = 'BTC/USD', timeframe = '4H', priceLabel = '', changePct = 0, candles = [], accentColor = '#7B3FA0' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'CandlestickChart', { symbol, timeframe, priceLabel, changePct, candles, accentColor }, baseUrl, 2500, 6);
    return `✅ **Candlestick Chart dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_breaking_news') {
    const { headline = 'BREAKING NEWS', source = 'BLOOMBERG', ticker = '', category = 'BREAKING', accentColor = '#FF4D5E' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'BreakingNews', { headline, source, ticker, category, accentColor }, baseUrl, 2500, 6);
    return `✅ **Breaking News dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_market_dashboard') {
    const { title = 'MARKET SNAPSHOT', subtitle = 'Today · Key Numbers', metrics = [], accentColor = '#7B3FA0' } = args;
    const renderId = randomUUID();
    startRender(renderId, 'MarketDashboard', { title, subtitle, metrics, accentColor }, baseUrl, 2500, 6);
    return `✅ **Market Dashboard dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n⏱️ Estimasi: 30-60 detik\n\nGunakan \`check_render_status\` untuk memantau progres.`;
  }

  if (name === 'render_workflow_explainer') {
    const {
      scenes = [],
      brandName = 'Karmanrizky',
      theme,
      mode,
      accentColor,
      secondaryColor,
      bgColor,
      referenceImageUrl,
    } = args;
    // themeProps hanya memuat field yang benar-benar diisi (biar resolver tema bekerja benar).
    const themeProps = {};
    if (theme) themeProps.theme = theme;
    if (mode) themeProps.mode = mode;
    if (accentColor) themeProps.accentColor = accentColor;
    if (secondaryColor) themeProps.secondaryColor = secondaryColor;
    if (bgColor) themeProps.bgColor = bgColor;
    // Jika tak ada tema/warna sama sekali, pakai brand default agar tetap kompatibel.
    if (!theme && !mode && !accentColor && !bgColor) { themeProps.theme = 'dark-purple'; }
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return '❌ Parameter `scenes` wajib diisi (minimal 1 scene). Susun: intro → step (+connector) → summary → outro.';
    }
    const renderId = randomUUID();
    const totalSec = scenes.reduce((a, s) => a + (s.duration || (s.type === 'connector' ? 2 : s.type === 'step' || s.type === 'summary' ? 5 : 4)), 0);

    // Hitung berapa gambar AI yang diminta: background scene (imagePrompt scene) + thumbnail poin (imagePrompt di dalam points).
    const sceneImgCount = scenes.filter(s => typeof s.imagePrompt === 'string' && s.imagePrompt.trim().length > 0).length;
    const pointImgCount = scenes.reduce((acc, s) => acc + ((Array.isArray(s.points) ? s.points : []).filter(p => p && typeof p === 'object' && typeof p.imagePrompt === 'string' && p.imagePrompt.trim()).length), 0);
    const totalImgCount = sceneImgCount + pointImgCount;

    // Jika tidak ada permintaan gambar AI sama sekali → jalur cepat (perilaku lama, tanpa Replicate).
    if (totalImgCount === 0) {
      const props = { scenes, brandName, ...themeProps };
      if (referenceImageUrl) props.referenceImageUrl = referenceImageUrl;
      startRender(renderId, 'WorkflowExplainer', props, baseUrl, 3000, 5);
      return `✅ **Workflow Explainer dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n🎬 ${scenes.length} scene · ~${totalSec} detik\n⏱️ Estimasi render: 1-3 menit\n\nGunakan \`check_render_status\` untuk memantau progres. Video cocok dipadukan dengan narasi TTS di CapCut.`;
    }

    // Jalur AI: generate gambar cinematic (background scene + thumbnail poin) dulu, lalu render.
    renderJobs[renderId] = { status: 'processing', progress: 5, message: `🎨 Menyiapkan ${totalImgCount} visual AI...` };
    const aspect = formatToAspect(_format);
    (async () => {
      try {
        const enriched = [];
        let done = 0;
        const bump = () => { done++; renderJobs[renderId].progress = Math.min(45, 5 + done * (40 / totalImgCount)); renderJobs[renderId].message = `🎨 Menggambar visual AI ${done}/${totalImgCount}...`; };
        for (const s of scenes) {
          const scene = { ...s };
          // Background scene (square untuk poin-thumbnail nanti, tapi background ikut aspect penuh)
          if (typeof scene.imagePrompt === 'string' && scene.imagePrompt.trim()) {
            const url = await generateReplicateImage(scene.imagePrompt, aspect);
            if (url) scene.sceneImage = url;
            bump();
          }
          // Thumbnail per-poin (objek points dengan imagePrompt) → square 1:1
          if (Array.isArray(scene.points)) {
            const newPoints = [];
            for (const rawP of scene.points) {
              if (rawP && typeof rawP === 'object') {
                const point = { ...rawP };
                if (typeof point.imagePrompt === 'string' && point.imagePrompt.trim()) {
                  const purl = await generateReplicateImage(point.imagePrompt, '1:1');
                  if (purl) point.image = purl;
                  delete point.imagePrompt;
                  bump();
                }
                newPoints.push(point);
              } else {
                newPoints.push(rawP);
              }
            }
            scene.points = newPoints;
          }
          delete scene.imagePrompt;
          enriched.push(scene);
        }

        const props = { scenes: enriched, brandName, ...themeProps };
        if (referenceImageUrl) props.referenceImageUrl = referenceImageUrl;

        renderJobs[renderId].message = '🎬 Visual siap! Merender video...';
        renderJobs[renderId].progress = 50;

        const videoRenderId = randomUUID();
        startRender(videoRenderId, 'WorkflowExplainer', props, baseUrl, 3000, 5);

        for (let i = 0; i < 200; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const vj = renderJobs[videoRenderId];
          if (!vj) break;
          if (vj.status === 'done') {
            renderJobs[renderId] = { status: 'done', progress: 100, downloadUrl: vj.downloadUrl, fileSize: vj.fileSize, message: 'Video selesai!' };
            break;
          } else if (vj.status === 'error') { throw new Error(vj.error); }
          renderJobs[renderId].progress = Math.min(95, 50 + i * 0.5);
          renderJobs[renderId].message = `🎬 Merender video... ${vj?.progress || 0}%`;
        }
      } catch (err) {
        renderJobs[renderId] = { status: 'error', progress: 0, error: err.message };
      }
    })();

    return `✅ **Workflow Explainer (+ Visual AI) dimulai!**\n\n📋 **Render ID**: \`${renderId}\`\n🎬 ${scenes.length} scene · ~${totalSec} detik\n🎨 ${totalImgCount} visual AI di-generate via Replicate (${sceneImgCount} background + ${pointImgCount} thumbnail poin)\n⏱️ Estimasi: 2-5 menit (generate gambar + render)\n\nGunakan \`check_render_status\` untuk memantau progres. Video cocok dipadukan dengan narasi TTS di CapCut.`;
  }

  // check_render_status
  if (name === 'check_render_status') {
    const { renderId } = args;
    const job = renderJobs[renderId];
    if (!job) return `❌ Render job \`${renderId}\` tidak ditemukan.`;
    if (job.status === 'processing') return `⏳ **Sedang diproses... ${job.progress}%**\n\n${job.message}\n\nCek lagi dalam 10-15 detik.`;
    if (job.status === 'done' && job.animations) {
      // Analysis job result
      let result = `✅ **Analisis selesai! ${job.animationCount} animasi dibuat**\n\n`;
      result += `📝 **Transkrip (preview)**: ${job.transcript}\n\n`;
      result += `🎬 **Animasi yang dihasilkan:**\n\n`;
      for (const anim of job.animations) {
        result += `**${anim.index}. ${anim.type}** — "${anim.text}"\n`;
        result += `   💡 ${anim.reason}\n`;
        result += `   📥 Download: ${anim.downloadUrl}\n`;
        result += `   ⏳ Status: gunakan check_render_status dengan ID \`${anim.renderId}\`\n\n`;
      }
      return result;
    }
    if (job.status === 'done') return `✅ **Video selesai!**\n\n📥 **Link Download**: ${job.downloadUrl}\n📦 Ukuran: ${(job.fileSize / 1024).toFixed(1)} KB\n\nKlik link untuk mendownload video MP4.`;
    return `❌ **Error**: ${job.error}`;
  }

  // get_templates
  if (name === 'get_templates') {
    return `# 🎬 Video Studio Remotion v5.1 — Template Lengkap

## 📹 Scene Types (untuk render_text_video — semua dalam 1 video)
- \`title_scene\` — Judul besar dengan spring animation
- \`text_scene\` — Teks utama + subtext dengan slide-in
- \`lyric_scene\` — Teks lirik highlight satu per satu
- \`tips_scene\` — Numbered list tips muncul berurutan
- \`outro_scene\` — Penutup dengan CTA button animasi
- \`hud_scene\` — HUD sci-fi dengan neon, grid, countdown (**v4.0**)
- \`algorithmic_scene\` — TikTok/Spotify Wrapped style (**v4.0**)
- \`brutalist_scene\` — Tipografi monolitik hitam-putih (**v4.0**)
- \`sketchbook_scene\` — Gaya buku catatan tangan (**v4.0**)
- \`whiteboard_scene\` — Whiteboard dengan sticky notes (**v4.0**)
- \`kinetic_typography\` — Kata muncul satu per satu dramatis (**v4.0**)

## 🚀 Animasi Spesialis (tools terpisah)
- **render_landing_page** — Landing page SaaS/produk dengan feature cards
- **render_data_chart** — Bar chart animasi dengan counter angka
- **render_arch_diagram** — Diagram arsitektur sistem dengan data flow
- **render_product_3d** — Showcase produk 3D dengan exploded view
- **render_mobile_app** — Mockup app mobile (checkout, success, onboarding)
- **render_cinematic_intro** — Intro sinematik dengan letterbox effect
- **render_social_media** — Konten viral Instagram/TikTok dengan stats counter
- **google_search_animation** — Animasi typewriter pencarian Google
- **render_hud_scene** — HUD/Mission Control sci-fi (**v4.0**)
- **render_algorithmic_scene** — TikTok/Wrapped style (**v4.0**)
- **render_brutalist_scene** — Brutalist typography (**v4.0**)
- **render_sketchbook_scene** — Sketchbook/handwritten (**v4.0**)
- **render_whiteboard_scene** — Whiteboard sticky notes (**v4.0**)
- **render_kinetic_typography** — Kinetic word-by-word (**v4.0**)
- **render_comment_explosion** — Komentar bermunculan viral (**v5.0**)
- **render_vhs_timeline** — Timeline retro VHS/glitch (**v5.0**)
- **render_macos_dock** — macOS dock dengan hover effect (**v5.0**)
- **render_youtube_subscribe** — Counter subscriber + confetti (**v5.0**)
- **analyze_video_and_generate** — Upload URL video presentasi → transkripsi otomatis → generate animasi pendukung (**v5.1**)

## 🎨 Style Presets
- \`cinematic\` — Gelap, elegan, gradient hitam-biru
- \`vlog\` — Cerah, casual, putih bersih
- \`business\` — Profesional, biru tua
- \`music_video\` — Bold, hitam-emas dramatis
- \`tutorial\` — Clean, abu-abu terang
- \`trader\` — Dark mode, hijau neon, monospace

## 🎭 Layout Modes (untuk semua v4.0 scenes)
- \`full\` — Video penuh normal
- \`split\` — Grafis di kiri 62%, ruang webcam hijau di kanan 38%
- \`greenscreen\` — Background hijau murni (#00FF00) untuk chroma key

## 📐 Output Quality
- Resolusi: 1280×720 (HD)
- Frame rate: 30 fps
- Codec: H.264 MP4

## 💡 Tips Penggunaan
- Gunakan \`bgLayout: 'split'\` untuk video dengan webcam/face cam di kanan
- Gunakan \`bgLayout: 'greenscreen'\` untuk background yang bisa dihapus di DaVinci/Premiere
- Kombinasikan scene types dalam 1 video untuk hasil terbaik`;
  }

  throw new Error(`Tool '${name}' tidak ditemukan`);
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', engine: 'Remotion 4.0', version: '7.0.0',
    bundleReady: !!bundleLocation,
    activeJobs: Object.keys(renderJobs).filter(id => renderJobs[id].status === 'processing').length,
    activeRenders: activeRenderCount,
    queuedRenders: renderQueue.length,
    maxConcurrentRenders: MAX_CONCURRENT_RENDERS,
    mcpEndpoint: `${getBaseUrl(req)}/mcp`,
    tools: MCP_TOOLS.length,
  });
});

app.get('/templates', (req, res) => {
  res.json({
    version: '4.0.0',
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

// REST endpoint for analyze-video
app.post('/analyze-video', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { videoUrl, language = 'id', layout = 'full', style = 'cinematic' } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl diperlukan' });
  try {
    const result = await executeTool('analyze_video_and_generate', { videoUrl, language, layout, style }, baseUrl);
    res.json({ success: true, message: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
            serverInfo: { name: 'video-studio-remotion', version: '7.0.0' },
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
