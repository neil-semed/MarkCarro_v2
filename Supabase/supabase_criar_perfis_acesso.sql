-- ============================================================
-- MARKCARRO - Nova tabela: Perfis de Acesso
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só cria uma tabela nova.
--
-- O que isso adiciona:
-- Tabela "perfis_acesso" (nome, unidade, setor, telas_permitidas,
-- bloqueado) - gerenciada na nova tela "Gerenciar Perfis de Acesso"
-- (Admin): criar, editar, vincular a Unidade/Setor, escolher quais telas
-- o perfil pode acessar, bloquear/desbloquear.
--
-- IMPORTANTE: esta primeira versão só guarda a definição do perfil (o
-- cadastro em si). Ela ainda NÃO está ligada ao controle de acesso das
-- telas existentes (que hoje depende só de profiles.tipo = admin/
-- condutor/solicitante) - aplicar essas restrições nas telas é um passo
-- separado, pra não arriscar quebrar o que já funciona.
-- ============================================================

CREATE TABLE IF NOT EXISTS perfis_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade TEXT,
  setor TEXT,
  telas_permitidas JSONB DEFAULT '[]'::jsonb,
  bloqueado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE perfis_acesso ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfis_acesso' AND policyname = 'Perfis de acesso visiveis para admin') THEN
    CREATE POLICY "Perfis de acesso visiveis para admin" ON perfis_acesso
      FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfis_acesso' AND policyname = 'Admin cria perfil de acesso') THEN
    CREATE POLICY "Admin cria perfil de acesso" ON perfis_acesso
      FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfis_acesso' AND policyname = 'Admin atualiza perfil de acesso') THEN
    CREATE POLICY "Admin atualiza perfil de acesso" ON perfis_acesso
      FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfis_acesso' AND policyname = 'Admin exclui perfil de acesso') THEN
    CREATE POLICY "Admin exclui perfil de acesso" ON perfis_acesso
      FOR DELETE USING (is_admin());
  END IF;
END $$;
