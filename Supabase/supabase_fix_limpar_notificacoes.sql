-- ============================================================
-- MARKCARRO - Migração: corrige "não limpa notificações"
-- ============================================================
-- CAUSA: a tabela "notificacoes" tem Row Level Security ligado, mas as
-- políticas criadas em supabase_schema.sql cobrem SELECT, INSERT e
-- UPDATE - nunca DELETE. Sem uma política de DELETE, o Postgres nega por
-- padrão: excluirTodasNotificacoes() (api.js) manda o DELETE, o Supabase
-- responde "sucesso" (nenhum erro), mas 0 linhas são realmente apagadas -
-- por isso o app mostrava "Notificações apagadas" e, ao recarregar a
-- lista, as mesmas notificações continuavam lá.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase e
-- clique em "Run". Seguro rodar mais de uma vez.
-- ============================================================

DROP POLICY IF EXISTS "Usuario apaga propria notificacao" ON notificacoes;
CREATE POLICY "Usuario apaga propria notificacao" ON notificacoes
  FOR DELETE USING (auth.email() = email_destinatario);

-- Conferir depois de rodar (deve aparecer esta política a mais, junto
-- com as 3 que já existiam - "Notificacoes do usuario", "Autenticados
-- criam notificacao", "Usuario marca propria notificacao como lida"):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notificacoes';
