-- PEDIDO DO USUÁRIO ("responsável pelo setor... vê, edita e cancela as
-- solicitações de todo o setor"): libera EDITAR/CANCELAR (ambos são um
-- UPDATE em "solicitacoes" - cancelar só muda o status pra "Desprezado")
-- para quem estiver marcado como responsável daquela Unidade+Setor em
-- tabelas_apoio.email (ver Gerenciar Usuários > checkbox "Responsável
-- pelo Setor"). A LEITURA de todo o setor já era permitida antes disso
-- pela policy "Solicitante ve solicitacoes do proprio setor" (ver
-- supabase_rls_dashboard_solicitante.sql) - só faltava esta, de escrita.
--
-- Rode este arquivo uma vez no SQL Editor do Supabase.

CREATE POLICY "Responsavel de setor atualiza solicitacoes do setor" ON solicitacoes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tabelas_apoio ta
      WHERE ta.unidade = solicitacoes.unidade
        AND ta.setor = solicitacoes.setor
        AND ta.email = auth.email()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM tabelas_apoio ta
      WHERE ta.unidade = solicitacoes.unidade
        AND ta.setor = solicitacoes.setor
        AND ta.email = auth.email()
    )
  );
