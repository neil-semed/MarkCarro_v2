-- ============================================================
-- MARKCARRO - Nova tabela: Cooperativas (vínculo do Condutor/Motorista)
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só cria uma tabela nova e uma coluna nova em "profiles".
--
-- O que isso adiciona:
-- 1. Tabela "cooperativas" (nome, e-mail, telefone, ativo) - cadastro
--    próprio, gerenciado na nova tela "Gerenciar Cooperativas" (Editar /
--    Bloquear, igual à tela de Unidades).
-- 2. Coluna "cooperativa_id" em "profiles", referenciando cooperativas(id)
--    - usada pelo dropdown "Cooperativa" no cadastro de Condutor. Fica
--    opcional (pode ficar em branco) pra não quebrar condutores já
--    cadastrados hoje sem cooperativa definida.
-- ============================================================

CREATE TABLE IF NOT EXISTS cooperativas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cooperativas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cooperativas' AND policyname = 'Cooperativas visiveis para autenticados') THEN
    CREATE POLICY "Cooperativas visiveis para autenticados" ON cooperativas
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cooperativas' AND policyname = 'Admin cria cooperativa') THEN
    CREATE POLICY "Admin cria cooperativa" ON cooperativas
      FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cooperativas' AND policyname = 'Admin atualiza cooperativa') THEN
    CREATE POLICY "Admin atualiza cooperativa" ON cooperativas
      FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cooperativas' AND policyname = 'Admin exclui cooperativa') THEN
    CREATE POLICY "Admin exclui cooperativa" ON cooperativas
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- Vínculo do Condutor com a Cooperativa - opcional (ON DELETE SET NULL: se
-- a cooperativa for excluída, o condutor não fica "quebrado", só sem
-- cooperativa definida).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cooperativa_id INTEGER REFERENCES cooperativas(id) ON DELETE SET NULL;
