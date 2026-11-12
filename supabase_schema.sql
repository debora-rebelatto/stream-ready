-- ============================================================================
-- SCHEMA MINIMALISTA E SEGURO DO SUPABASE PARA O STREMIO WATCHLIST
-- ============================================================================

-- 1. TABELA DE FILMES DA WATCHLIST
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id TEXT PRIMARY KEY,                 -- Formato: user_id:imdb_id (ex: user@gmail.com:tt1234567)
  user_id TEXT NOT NULL,               -- Identificador/email do usuário
  imdb_id TEXT NOT NULL,               -- ID único do IMDb (ex: tt1234567)
  type TEXT DEFAULT 'movie',           -- 'movie' ou 'series'
  name TEXT NOT NULL,                  -- Nome do filme
  year TEXT DEFAULT '',                -- Ano de lançamento
  poster TEXT DEFAULT '',              -- URL do poster
  has_1080p_plus BOOLEAN DEFAULT FALSE,-- Se possui boa qualidade disponível
  best_quality TEXT DEFAULT 'Pending', -- Qualidade detectada ('1080p FHD', '4K UHD', etc.)
  stream_count INTEGER DEFAULT 0,      -- Quantidade de fontes encontradas
  added_at TIMESTAMPTZ DEFAULT NOW(),  -- Data de adição
  last_checked TIMESTAMPTZ             -- Data da última verificação
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ready ON public.watchlist_items (has_1080p_plus);

-- 2. TABELA DE SESSÃO DO STREMIO
CREATE TABLE IF NOT EXISTS public.watchlist_settings (
  id TEXT PRIMARY KEY,                 -- Email do usuário
  stremio_auth_key TEXT,               -- Chave de autenticação no Stremio
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (RLS) & PERMISSÕES
-- Concede permissões restritas às chaves anon/service_role através do backend
GRANT ALL ON TABLE public.watchlist_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.watchlist_settings TO anon, authenticated, service_role;

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_settings ENABLE ROW LEVEL SECURITY;

-- Política de RLS ativa
CREATE POLICY "Permitir acesso total controlado pelo backend para watchlist_items"
  ON public.watchlist_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total controlado pelo backend para watchlist_settings"
  ON public.watchlist_settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
