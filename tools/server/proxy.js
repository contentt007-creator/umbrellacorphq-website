/**
 * Umbrella Corp HQ — Anthropic API Proxy
 * ─────────────────────────────────────────────────────────────
 * SECURITY: The API key lives here (server-side) ONLY.
 * The browser never sees it. This proxy receives requests from
 * the tool page, adds the Authorization header, and forwards to
 * Anthropic. CORS is restricted to your domain.
 *
 * LOCAL DEV:
 *   1. npm install (in this directory)
 *   2. Copy .env.example → .env and fill in your key
 *   3. node proxy.js
 *   4. Tool calls http://localhost:3001/api/narrative
 *
 * PRODUCTION options:
 *   A. Railway / Render / Fly.io — push this folder as a Node app
 *   B. Supabase Edge Functions — see /supabase/functions/ai-narrative/
 *   C. Vercel serverless — rename to api/narrative.js (see their docs)
 *
 * Set UCH_PROXY_URL in your /config.js (gitignored) to point to
 * whichever production URL you deploy this to.
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const https   = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:4567',
  'http://localhost:3000',
  'http://127.0.0.1:4567',
  'https://umbrellacorphq.com',
  'https://www.umbrellacorphq.com',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) only in dev
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed — ' + origin));
  },
  methods: ['POST', 'OPTIONS'],
}));

app.use(express.json({ limit: '32kb' }));

/* ── Health check ── */
app.get('/health', (_req, res) => res.json({ ok: true, service: 'UCH AI Proxy' }));

/* ── AI Narrative endpoint ── */
app.post('/api/narrative', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt.' });
  }

  const body = JSON.stringify({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages:   [{ role: 'user', content: prompt }],
  });

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length':    Buffer.byteLength(body),
    },
  };

  try {
    const anthropicRes = await new Promise((resolve, reject) => {
      const req = https.request(options, (r) => {
        let data = '';
        r.on('data', (c) => data += c);
        r.on('end', () => resolve({ status: r.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const parsed = JSON.parse(anthropicRes.body);

    if (anthropicRes.status !== 200) {
      return res.status(anthropicRes.status).json({
        error: parsed.error?.message || 'Anthropic API error',
      });
    }

    const text = parsed.content?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    console.error('[Proxy] Error:', err.message);
    res.status(502).json({ error: 'Proxy request failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[UCH Proxy] Running at http://localhost:${PORT}`);
  console.log(`[UCH Proxy] API key: ${process.env.ANTHROPIC_API_KEY ? 'LOADED ✓' : 'MISSING ✗'}`);
});
