-- ============================================================
-- MARKCARRO - SCHEMA SUPABASE (versão completa e corrigida)
-- Rode este script inteiro no SQL Editor do Supabase (projeto vazio,
-- sem nenhuma tabela criada ainda).
--
-- Em relação ao schema anterior, a diferença importante é: antes só
-- existiam políticas de RLS para LEITURA (SELECT). Sem políticas de
-- INSERT/UPDATE/DELETE, o Postgres bloqueia por padrão qualquer
-- gravação quando RLS está ativado - ou seja, mesmo com o app 100%
-- correto, toda ação de escrever (nova solicitação, confirmar viagem,
-- registrar KM, editar perfil etc.) falhava silenciosamente ou com erro
-- "new row violates row-level security policy". Este script adiciona as
-- políticas de escrita que faltavam, cobrindo exatamente as operações
-- que o app realmente faz.
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

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

CREATE TABLE IF NOT EXISTS locais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tabelas_apoio (
  id SERIAL PRIMARY KEY,
  unidade TEXT NOT NULL,
  setor TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_destinatario TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data_hora TIMESTAMPTZ DEFAULT now(),
  lida BOOLEAN DEFAULT false
);

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
-- 2. ÍNDICES
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
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabelas_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_km ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- ----------------------------------------------------------
  -- PROFILES
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Usuarios veem proprio perfil') THEN
    CREATE POLICY "Usuarios veem proprio perfil" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Perfis visiveis para autenticados') THEN
    CREATE POLICY "Perfis visiveis para autenticados" ON profiles
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  -- Sem política de INSERT: a linha de profiles é criada só pelo gatilho
  -- handle_new_user (SECURITY DEFINER, definido mais abaixo), nunca
  -- diretamente pelo app.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Usuario atualiza proprio perfil') THEN
    CREATE POLICY "Usuario atualiza proprio perfil" ON profiles
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin atualiza qualquer perfil') THEN
    CREATE POLICY "Admin atualiza qualquer perfil" ON profiles
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tipo = 'admin')
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tipo = 'admin')
      );
  END IF;

  -- ----------------------------------------------------------
  -- SOLICITACOES
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Solicitacoes do usuario') THEN
    CREATE POLICY "Solicitacoes do usuario" ON solicitacoes
      FOR SELECT USING (auth.email() = email_solicitante);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Gestores veem todas solicitacoes') THEN
    CREATE POLICY "Gestores veem todas solicitacoes" ON solicitacoes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Condutor ve suas solicitacoes') THEN
    CREATE POLICY "Condutor ve suas solicitacoes" ON solicitacoes
      FOR SELECT USING (
        auth.email() = condutor_ida OR auth.email() = condutor_volta
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Usuario cria propria solicitacao') THEN
    CREATE POLICY "Usuario cria propria solicitacao" ON solicitacoes
      FOR INSERT WITH CHECK (auth.email() = email_solicitante);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Solicitante atualiza propria solicitacao') THEN
    CREATE POLICY "Solicitante atualiza propria solicitacao" ON solicitacoes
      FOR UPDATE USING (auth.email() = email_solicitante) WITH CHECK (auth.email() = email_solicitante);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Admin atualiza qualquer solicitacao') THEN
    CREATE POLICY "Admin atualiza qualquer solicitacao" ON solicitacoes
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitacoes' AND policyname = 'Admin exclui solicitacao') THEN
    CREATE POLICY "Admin exclui solicitacao" ON solicitacoes
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;

  -- ----------------------------------------------------------
  -- LOCAIS
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locais' AND policyname = 'Locais visiveis') THEN
    CREATE POLICY "Locais visiveis" ON locais
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locais' AND policyname = 'Admin gerencia locais') THEN
    CREATE POLICY "Admin gerencia locais" ON locais
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;

  -- ----------------------------------------------------------
  -- TABELAS DE APOIO
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tabelas_apoio' AND policyname = 'Apoio visivel') THEN
    CREATE POLICY "Apoio visivel" ON tabelas_apoio
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tabelas_apoio' AND policyname = 'Admin gerencia apoio') THEN
    CREATE POLICY "Admin gerencia apoio" ON tabelas_apoio
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;

  -- ----------------------------------------------------------
  -- NOTIFICACOES
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'Notificacoes do usuario') THEN
    CREATE POLICY "Notificacoes do usuario" ON notificacoes
      FOR SELECT USING (auth.email() = email_destinatario);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'Autenticados criam notificacao') THEN
    -- Permissivo de propósito: uma notificação é sempre criada para OUTRA
    -- pessoa (ex.: gestor confirma viagem -> notifica o solicitante), não
    -- para quem está autenticado no momento, então não dá pra restringir
    -- por email_destinatario = auth.email() igual nas outras tabelas.
    CREATE POLICY "Autenticados criam notificacao" ON notificacoes
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'Usuario marca propria notificacao como lida') THEN
    CREATE POLICY "Usuario marca propria notificacao como lida" ON notificacoes
      FOR UPDATE USING (auth.email() = email_destinatario) WITH CHECK (auth.email() = email_destinatario);
  END IF;

  -- ----------------------------------------------------------
  -- REGISTROS DE KM
  -- ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registros_km' AND policyname = 'KM do condutor') THEN
    CREATE POLICY "KM do condutor" ON registros_km
      FOR SELECT USING (auth.email() = email_condutor);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registros_km' AND policyname = 'Gestores veem KM') THEN
    CREATE POLICY "Gestores veem KM" ON registros_km
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registros_km' AND policyname = 'Condutor ou admin lanca KM') THEN
    CREATE POLICY "Condutor ou admin lanca KM" ON registros_km
      FOR INSERT WITH CHECK (
        auth.email() = email_condutor
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registros_km' AND policyname = 'Condutor ou admin atualiza KM') THEN
    CREATE POLICY "Condutor ou admin atualiza KM" ON registros_km
      FOR UPDATE USING (
        auth.email() = email_condutor
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      ) WITH CHECK (
        auth.email() = email_condutor
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registros_km' AND policyname = 'Admin exclui KM') THEN
    CREATE POLICY "Admin exclui KM" ON registros_km
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
END $$;

-- ============================================================
-- 4. FUNÇÃO + GATILHO: criar perfil automaticamente no signup
-- ============================================================
-- Cria a linha em profiles assim que um usuário é criado em auth.users
-- (login.js/cadastro.js e as telas de Gerenciar dependem disso). Só copia
-- tipo/nome/email porque é só isso que dá pra confiar vindo direto do
-- metadado de cadastro; o resto do perfil (telefone, placa, unidade etc.)
-- é preenchido por um UPDATE feito pelo próprio app logo depois do
-- cadastro (ver cadastro.js e as telas de Gerenciar Condutores/Usuários).
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

-- ============================================================
-- PRONTO. Depois de rodar este script:
--
-- 1. Cadastre o primeiro usuário pelo próprio app (tela de Cadastro,
--    como "Solicitante" ou "Condutor" - tanto faz, vamos promovê-lo a
--    admin a seguir).
--
-- 2. Rode o comando abaixo (ajustando o e-mail) para transformar esse
--    usuário no Gestor/Administrador do sistema:
--
--    UPDATE profiles SET tipo = 'admin', ativo = true
--    WHERE email = 'coloque-aqui-o-email-cadastrado@exemplo.com';
--
-- 3. Faça login novamente com esse e-mail - agora ele entra como Gestor.
-- ============================================================
