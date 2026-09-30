-- ============================================================
-- MARKCARRO - Nova tabela: Destinatários do Relatório de Agenda
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só cria uma tabela nova.
--
-- Guarda a lista de e-mails que recebem o envio automático da Agenda de
-- Corridas (botão "Enviar por E-mail" na tela Agenda). Cadastro/edição
-- pela tela Gerenciar Usuários > "Destinatários do Relatório de Agenda".
-- Usa a mesma função is_admin() já criada no banco (ver
-- supabase_fix_rls_recursao.sql / supabase_fix_profiles_exposto.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS destinatarios_relatorio (
  id SERIAL PRIMARY KEY,
  nome TEXT,
  email TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE destinatarios_relatorio ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'destinatarios_relatorio' AND policyname = 'Admin ve destinatarios') THEN
    CREATE POLICY "Admin ve destinatarios" ON destinatarios_relatorio
      FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'destinatarios_relatorio' AND policyname = 'Admin cria destinatario') THEN
    CREATE POLICY "Admin cria destinatario" ON destinatarios_relatorio
      FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'destinatarios_relatorio' AND policyname = 'Admin atualiza destinatario') THEN
    CREATE POLICY "Admin atualiza destinatario" ON destinatarios_relatorio
      FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'destinatarios_relatorio' AND policyname = 'Admin exclui destinatario') THEN
    CREATE POLICY "Admin exclui destinatario" ON destinatarios_relatorio
      FOR DELETE USING (is_admin());
  END IF;
END $$;
