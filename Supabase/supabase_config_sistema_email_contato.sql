-- ============================================================
-- MARKCARRO - Nova tabela: configurações do sistema (chave/valor)
-- Guarda, por enquanto, o e-mail de contato que aparece nos e-mails
-- automáticos de solicitações (escola/creche) e vira o "Responder para".
-- Editado em: Gerenciar Perfis de Acesso > "E-mail de contato nas mensagens
-- automáticas". Não apaga nada; seguro rodar mais de uma vez.
-- ============================================================
CREATE TABLE IF NOT EXISTS config_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config_sistema' AND policyname = 'Admin le config') THEN
    CREATE POLICY "Admin le config" ON config_sistema FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config_sistema' AND policyname = 'Admin cria config') THEN
    CREATE POLICY "Admin cria config" ON config_sistema FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config_sistema' AND policyname = 'Admin atualiza config') THEN
    CREATE POLICY "Admin atualiza config" ON config_sistema FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;
