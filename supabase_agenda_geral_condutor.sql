-- ============================================================
-- MARKCARRO - Correção: "Ver Agenda Geral" do Condutor não tinha efeito
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só adiciona uma política nova de leitura.
--
-- O toggle "Ver Agenda Geral" (tela Gerenciar Condutores) sempre salvou
-- certinho em profiles.ver_agenda_geral - o problema é que NENHUMA
-- política de RLS em "solicitacoes" liberava a leitura de TODAS as
-- corridas pra um condutor (só pra admin, ou pras corridas em que o
-- próprio condutor está escalado). Mesmo corrigindo a tela pra pedir
-- "todas as corridas" quando o toggle está ligado, o Postgres continuava
-- devolvendo só as corridas do próprio condutor - RLS filtra antes do
-- app receber a resposta. Esta política resolve isso.
-- ============================================================

DROP POLICY IF EXISTS "Condutor com agenda geral ve tudo" ON solicitacoes;
CREATE POLICY "Condutor com agenda geral ve tudo" ON solicitacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND tipo = 'condutor' AND ver_agenda_geral = true
    )
  );

-- Conferir no final:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'solicitacoes';
