/**
 * Umbrella Corp HQ — Supabase Configuration
 * ─────────────────────────────────────────────────────────────
 * HOW TO SET UP (one-time):
 *
 *  1. Go to https://supabase.com → New Project (free tier is fine)
 *  2. After it provisions, go to: Settings → API
 *  3. Copy "Project URL"     → paste below as SUPABASE_URL
 *  4. Copy "anon / public"   → paste below as SUPABASE_ANON_KEY
 *     (anon key is safe to expose — it's governed by Row Level Security)
 *  5. Go to SQL Editor → New Query → paste docs/supabase-setup.sql → Run
 *  6. Go to Authentication → Users → Add User
 *     Enter your email + a strong password. That's your admin login.
 *
 * UNTIL YOU FILL THESE IN:
 *  The admin panel falls back to the original localStorage system.
 *  Everything continues to work — the Supabase upgrade is opt-in.
 * ─────────────────────────────────────────────────────────────
 */

window.UCH_SUPABASE_URL      = 'https://fdzfxvpyeeczjsjoeszg.supabase.co';
window.UCH_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkemZ4dnB5ZWVjempzam9lc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjU4MzMsImV4cCI6MjA5MjEwMTgzM30.K9V6NlgJVYUCxvAtzUvv4oREbQ59685yp0bI39BYK8A';
