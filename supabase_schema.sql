-- ============================================================================
-- SCHEMA DO SUPABASE PARA O STREMIO WATCHLIST (MULTI-USUÁRIO)
-- Cole e execute este script no "SQL Editor" do seu painel do Supabase
-- ============================================================================

-- 1. Tabela de Filmes da Watchlist (Isolada por Conta do Stremio via user_id)
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  imdb_id TEXT NOT NULL,
  type TEXT DEFAULT 'movie',
  name TEXT NOT NULL,
  year TEXT DEFAULT '',
  poster TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  genres JSONB DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  imdb_rating TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  has_1080p_plus BOOLEAN DEFAULT FALSE,
  best_quality TEXT DEFAULT 'Pendente',
  stream_count INTEGER DEFAULT 0,
  count_1080p_plus INTEGER DEFAULT 0,
  last_checked TIMESTAMPTZ,
  check_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ready ON public.watchlist_items (has_1080p_plus);

-- 2. Tabela de Configurações e Credenciais (Uma linha por Conta do Stremio)
CREATE TABLE IF NOT EXISTS public.watchlist_settings (
  id TEXT PRIMARY KEY,
  auto_check_interval_minutes INTEGER DEFAULT 30,
  torrentio_url TEXT DEFAULT 'https://torrentio.strem.fun',
  enabled_catalogs JSONB DEFAULT '["watchlist_ready", "watchlist_all", "watchlist_pending"]'::jsonb,
  stremio_auth_key TEXT,
  stremio_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configuração de Políticas de Acesso (Row Level Security)
GRANT ALL ON TABLE public.watchlist_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.watchlist_settings TO anon, authenticated, service_role;

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total watchlist_items"
  ON public.watchlist_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Acesso total watchlist_settings"
  ON public.watchlist_settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
