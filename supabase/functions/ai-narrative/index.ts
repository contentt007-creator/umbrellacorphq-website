/**
 * UCH AI Narrative — Supabase Edge Function (alternative to Node proxy)
 *
 * DEPLOY:
 *   supabase functions deploy ai-narrative
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Then set in config.js:
 *   window.UCH_PROXY_URL = 'https://fdzfxvpyeeczjsjoeszg.supabase.co/functions/v1';
 *
 * The tool calls: POST /functions/v1/ai-narrative  (same /api/narrative path)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGINS = [
  'https://umbrellacorphq.com',
  'https://www.umbrellacorphq.com',
  'http://localhost:4567',
  'http://localhost:3000',
];

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { prompt } = await req.json();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await anthropicRes.json();

  if (!anthropicRes.ok) {
    return new Response(JSON.stringify({ error: data.error?.message || 'Anthropic error' }), {
      status: anthropicRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const text = data.content?.[0]?.text || '';
  return new Response(JSON.stringify({ text }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
