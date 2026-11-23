-- ============================================================================
-- SCHEMA RELACIONAL MINIMALISTA DO SUPABASE PARA O STREMIO WATCHLIST
-- ============================================================================

-- 1. TABELA DE USUÁRIOS CADASTRADOS (ID ÚNICO POR USUÁRIO)
CREATE TABLE IF NOT EXISTS public.watchlist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID Único (UUID) do usuário
  email TEXT UNIQUE NOT NULL,                   -- E-mail da conta Stremio (em minúsculas)
  stremio_auth_key TEXT,                         -- Chave de autenticação criptografada
  min_quality TEXT DEFAULT '1080p',              -- Qualidade mínima desejada ('1080p' ou '4k')
  min_audio TEXT DEFAULT 'any',                  -- Preferência mínima de áudio ('any', 'surround', 'atmos')
  auto_sync_watched BOOLEAN DEFAULT FALSE,       -- Sincronização automática de vistos (desativada por padrão)
  track_watchlist_watched BOOLEAN DEFAULT TRUE,  -- Rastrear filmes da lista assistidos após adição
  sync_previously_watched BOOLEAN DEFAULT FALSE, -- Sincronizar filmes assistidos anteriormente no Stremio
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE, -- Whether first-login setup wizard was completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_users_email ON public.watchlist_users (email);

-- 2. TABELA DE FILMES DA WATCHLIST (RELACIONADA PELO ID ÚNICO DO USUÁRIO)
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ID Único da linha (UUID)
  user_id UUID NOT NULL REFERENCES public.watchlist_users(id) ON DELETE CASCADE, -- Relação com a tabela de usuários
  imdb_id TEXT NOT NULL,                          -- ID único do IMDb (ex: tt1234567)
  name TEXT NOT NULL,                             -- Nome do filme
  year TEXT DEFAULT '',                           -- Ano de lançamento
  poster TEXT DEFAULT '',                         -- URL do poster
  has_1080p_plus BOOLEAN DEFAULT FALSE,           -- Se possui boa qualidade disponível
  best_quality TEXT DEFAULT 'Pending',            -- Qualidade detectada ('1080p FHD', '4K UHD', etc.)
  has_atmos BOOLEAN DEFAULT FALSE,                -- Se possui áudio Dolby Atmos confirmado
  audio_format TEXT DEFAULT '',                   -- Melhor formato de áudio detectado ('Dolby Atmos', 'TrueHD 7.1', 'DDP 5.1', etc.)
  stream_count INTEGER DEFAULT 0,                 -- Quantidade de fontes encontradas
  added_at TIMESTAMPTZ DEFAULT NOW(),             -- Data de adição
  last_checked TIMESTAMPTZ,                       -- Data da última verificação
  CONSTRAINT uq_watchlist_items_user_imdb UNIQUE (user_id, imdb_id) -- Garante um registro por filme por usuário
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ready ON public.watchlist_items (has_1080p_plus);

-- 3. TABELA DE LISTAS PERSONALIZADAS DO USUÁRIO
CREATE TABLE IF NOT EXISTS public.watchlist_custom_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.watchlist_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_custom_lists_user_id ON public.watchlist_custom_lists (user_id, created_at ASC);

-- 4. TABELA DE EVENTOS DE ANALYTICS (FIRST-PARTY / ANTI-ADBLOCK)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.watchlist_users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events (user_id);

-- 5. TABELA DE VOTOS DA ENQUETE DE FEATURES (ROADMAP POLL)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.watchlist_users(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  custom_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_poll_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes (selected_option);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes (user_id);

-- 6. PERMISSÕES E ROW LEVEL SECURITY (RLS)
GRANT ALL ON TABLE public.watchlist_users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.watchlist_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.watchlist_custom_lists TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.analytics_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.poll_votes TO anon, authenticated, service_role;

ALTER TABLE public.watchlist_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "poll_votes_all"
  ON public.poll_votes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "watchlist_custom_lists_all"
  ON public.watchlist_custom_lists
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "analytics_events_all"
  ON public.analytics_events
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
