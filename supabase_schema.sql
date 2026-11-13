-- ============================================================================
-- SCHEMA RELACIONAL MINIMALISTA DO SUPABASE PARA O STREMIO WATCHLIST
-- ============================================================================

-- 1. TABELA DE USUÁRIOS CADASTRADOS (ID ÚNICO POR USUÁRIO)
CREATE TABLE IF NOT EXISTS public.watchlist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID Único (UUID) do usuário
  email TEXT UNIQUE NOT NULL,                   -- E-mail da conta Stremio (em minúsculas)
  stremio_auth_key TEXT,                         -- Chave de autenticação criptografada
  min_quality TEXT DEFAULT '1080p',              -- Qualidade mínima desejada ('1080p' ou '4k')
  auto_sync_watched BOOLEAN DEFAULT FALSE,       -- Sincronização automática de vistos (desativada por padrão)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_users_email ON public.watchlist_users (email);

-- 2. TABELA DE FILMES DA WATCHLIST (RELACIONADA PELO ID ÚNICO DO USUÁRIO)
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ID Único da linha (UUID)
  user_id UUID NOT NULL REFERENCES public.watchlist_users(id) ON DELETE CASCADE, -- Relação com a tabela de usuários
  imdb_id TEXT NOT NULL,                          -- ID único do IMDb (ex: tt1234567)
  type TEXT DEFAULT 'movie',                      -- 'movie' ou 'series'
  name TEXT NOT NULL,                             -- Nome do filme
  year TEXT DEFAULT '',                           -- Ano de lançamento
  poster TEXT DEFAULT '',                         -- URL do poster
  has_1080p_plus BOOLEAN DEFAULT FALSE,           -- Se possui boa qualidade disponível
  best_quality TEXT DEFAULT 'Pending',            -- Qualidade detectada ('1080p FHD', '4K UHD', etc.)
  stream_count INTEGER DEFAULT 0,                 -- Quantidade de fontes encontradas
  added_at TIMESTAMPTZ DEFAULT NOW(),             -- Data de adição
  last_checked TIMESTAMPTZ,                       -- Data da última verificação
  CONSTRAINT uq_watchlist_items_user_imdb UNIQUE (user_id, imdb_id) -- Garante um registro por filme por usuário
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ready ON public.watchlist_items (has_1080p_plus);

-- 3. PERMISSÕES E ROW LEVEL SECURITY (RLS)
GRANT ALL ON TABLE public.watchlist_users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.watchlist_items TO anon, authenticated, service_role;

ALTER TABLE public.watchlist_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_users_all"
  ON public.watchlist_users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "watchlist_items_all"
  ON public.watchlist_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
