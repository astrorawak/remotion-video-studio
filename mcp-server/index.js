#!/usr/bin/env node
require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function waitForRender(renderId, maxWait = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await axios.get(`${BACKEND_URL}/status/${renderId}`);
    const job = res.data;
    if (job.status === 'done') return job;
    if (job.status === 'error') throw new Error(job.error || 'Render gagal');
  }
  throw new Error('Render timeout (5 menit)');
}

const server = new Server(
  { name: 'video-studio-remotion', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'render_text_video',
      description: 'Buat video animasi profesional dari teks menggunakan Remotion. Mendukung spring animation, typewriter, highlight, dan berbagai gaya visual.',
      inputSchema: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            description: 'Array scene video',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['title_scene', 'text_scene', 'lyric_scene', 'tips_scene', 'outro_scene', 'google_search'] },
                text: { type: 'string' },
                subtext: { type: 'string' },
                tips: { type: 'array', items: { type: 'string' } },
                lyrics: { type: 'array', items: { type: 'string' } },
                cta: { type: 'string' },
                duration: { type: 'number' },
              },
              required: ['type', 'text'],
            },
          },
          style: { type: 'string', enum: ['cinematic', 'vlog', 'business', 'music_video', 'tutorial', 'trader'] },
        },
        required: ['scenes'],
      },
    },
    {
      name: 'google_search_animation',
      description: 'Buat animasi pencarian Google dengan efek typewriter realistis.',
      inputSchema: {
        type: 'object',
        properties: {
          searchQuery: { type: 'string' },
          results: { type: 'array', items: { type: 'string' } },
          style: { type: 'string', enum: ['light', 'dark'] },
        },
        required: ['searchQuery'],
      },
    },
    {
      name: 'get_templates',
      description: 'Dapatkan daftar semua template dan gaya visual yang tersedia.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'render_text_video') {
    const resp = await axios.post(`${BACKEND_URL}/render-text-video`, args);
    const { renderId, downloadUrl } = resp.data;
    const job = await waitForRender(renderId);
    return { content: [{ type: 'text', text: `✅ Video berhasil dirender!\n\n📥 **Download**: ${job.downloadUrl}\n📦 Ukuran: ${(job.fileSize / 1024).toFixed(1)} KB\n\n*Powered by Remotion 4.0*` }] };
  }

  if (name === 'google_search_animation') {
    const resp = await axios.post(`${BACKEND_URL}/google-search-animation`, args);
    const { renderId } = resp.data;
    const job = await waitForRender(renderId);
    return { content: [{ type: 'text', text: `✅ Animasi Google Search selesai!\n\n📥 **Download**: ${job.downloadUrl}\n📦 Ukuran: ${(job.fileSize / 1024).toFixed(1)} KB` }] };
  }

  if (name === 'get_templates') {
    const resp = await axios.get(`${BACKEND_URL}/templates`);
    const t = resp.data;
    const text = `**Scene Types:**\n${t.sceneTypes.map((s) => `- \`${s.id}\`: ${s.desc}`).join('\n')}\n\n**Style Presets:**\n${t.stylePresets.map((s) => `- \`${s.id}\`: ${s.desc}`).join('\n')}\n\n**Output:** ${t.quality.resolution} @ ${t.quality.fps}fps`;
    return { content: [{ type: 'text', text }] };
  }

  throw new Error(`Tool '${name}' tidak ditemukan`);
});

const transport = new StdioServerTransport();
server.connect(transport);
console.error('[MCP] Video Studio Remotion v2.0 ready');
