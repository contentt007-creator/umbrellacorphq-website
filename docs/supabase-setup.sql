-- ═══════════════════════════════════════════════════════════════
-- Umbrella Corp HQ — Supabase Schema
-- Run this in your Supabase project SQL editor:
-- https://app.supabase.com → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- 1. Content table
-- Stores all editable site content (hero text, stats, testimonials, etc.)
CREATE TABLE IF NOT EXISTS public.site_content (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 3. Public visitors can READ content (needed for the public website)
CREATE POLICY "public_read"
  ON public.site_content
  FOR SELECT
  USING (true);

-- 4. Only authenticated admin users can INSERT / UPDATE / DELETE
CREATE POLICY "auth_write"
  ON public.site_content
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Grant usage to anon + authenticated roles
GRANT SELECT ON public.site_content TO anon;
GRANT ALL    ON public.site_content TO authenticated;

-- ───────────────────────────────────────────────────────────────
-- After running this SQL, create your admin user:
-- Go to: Authentication → Users → Invite User
-- Enter your email address and set a password.
-- That email + password is what you'll use to log into the admin panel.
-- ───────────────────────────────────────────────────────────────
