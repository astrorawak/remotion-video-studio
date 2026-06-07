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
  // check_render_status {
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
