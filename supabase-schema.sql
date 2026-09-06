-- ============================================================
-- MARKCARRO - SCHEMA SUPABASE (versão segura)
-- Rode este código no SQL Editor do Supabase
-- ============================================================

-- 1. TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('solicitante','condutor','admin')),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  unidade TEXT,
  setor TEXT,
  placa TEXT,
  modelo TEXT,
  capacidade INTEGER,
  categoria TEXT,
  cnh TEXT,
  validade_cnh DATE,
  ativo BOOLEAN DEFAULT true,
  ver_agenda_geral BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE SOLICITACOES
CREATE TABLE IF NOT EXISTS solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_solicitante TEXT NOT NULL,
  data_solicitacao TIMESTAMPTZ DEFAULT now(),
  data_viagem DATE NOT NULL,
  hora_saida TIME NOT NULL,
  hora_retorno TIME,
  origem TEXT,
  destino TEXT,
  unidade TEXT,
  setor TEXT,
  justificativa TEXT,
  tipo_viagem TEXT DEFAULT 'Comum',
  qtd_pessoas INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pendente',
  condutor_ida TEXT,
  condutor_volta TEXT,
  data_cancel_confirm TIMESTAMPTZ,
  nome_ext TEXT,
  telefone_ext TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE LOCAIS
CREATE TABLE IF NOT EXISTS locais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

-- 4. TABELAS DE APOIO
CREATE TABLE IF NOT EXISTS tabelas_apoio (
  id SERIAL PRIMARY KEY,
  unidade TEXT NOT NULL,
  setor TEXT NOT NULL,
  email TEXT
);

-- 5. TABELA DE NOTIFICACOES
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_destinatario TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data_hora TIMESTAMPTZ DEFAULT now(),
  lida BOOLEAN DEFAULT false
);

-- 6. TABELA DE REGISTROS DE KM
CREATE TABLE IF NOT EXISTS registros_km (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_condutor TEXT NOT NULL,
  data DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC,
  ajustado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDICES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_solicitacoes_status') THEN
    CREATE INDEX idx_solicitacoes_status ON solicitacoes(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_solicitacoes_data') THEN
    CREATE INDEX idx_solicitacoes_data ON solicitacoes(data_viagem);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_solicitacoes_email') THEN
    CREATE INDEX idx_solicitacoes_email ON solicitacoes(email_solicitante);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_tipo') THEN
    CREATE INDEX idx_profiles_tipo ON profiles(tipo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email') THEN
    CREATE INDEX idx_profiles_email ON profiles(email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notificacoes_email') THEN
    CREATE INDEX idx_notificacoes_email ON notificacoes(email_destinatario);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notificacoes_lida') THEN
    CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_km_data') THEN
    CREATE INDEX idx_km_data ON registros_km(data);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_km_email') THEN
    CREATE INDEX idx_km_email ON registros_km(email_condutor);
  END IF;
END $$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabelas_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_km ENABLE ROW LEVEL SECURITY;

-- Policies (ignorar erro se já existir)
DO $$
BEGIN
  -- Profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios veem proprio perfil') THEN
    CREATE POLICY "Usuarios veem proprio perfil" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Perfis visiveis para autenticados') THEN
    CREATE POLICY "Perfis visiveis para autenticados" ON profiles
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Solicitacoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Solicitacoes do usuario') THEN
    CREATE POLICY "Solicitacoes do usuario" ON solicitacoes
      FOR SELECT USING (auth.email() = email_solicitante);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestores veem todas solicitacoes') THEN
    CREATE POLICY "Gestores veem todas solicitacoes" ON solicitacoes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Condutor ve suas solicitacoes') THEN
    CREATE POLICY "Condutor ve suas solicitacoes" ON solicitacoes
      FOR SELECT USING (
        auth.email() = condutor_ida OR auth.email() = condutor_volta
      );
  END IF;

  -- Locais
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Locais visiveis') THEN
    CREATE POLICY "Locais visiveis" ON locais
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Tabelas apoio
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Apoio visivel') THEN
    CREATE POLICY "Apoio visivel" ON tabelas_apoio
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Notificacoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Notificacoes do usuario') THEN
    CREATE POLICY "Notificacoes do usuario" ON notificacoes
      FOR SELECT USING (auth.email() = email_destinatario);
  END IF;

  -- KM
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'KM do condutor') THEN
    CREATE POLICY "KM do condutor" ON registros_km
      FOR SELECT USING (auth.email() = email_condutor);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestores veem KM') THEN
    CREATE POLICY "Gestores veem KM" ON registros_km
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
END $$;

-- ============================================================
-- FUNCAO + TRIGGER: Criar perfil automaticamente no signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, tipo, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante'),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
