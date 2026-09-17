-- ============================================================
-- MARKCARRO - RLS para a tela "Viagens do Dia" (Solicitante)
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase UMA VEZ.
--
-- O QUE ISSO FAZ:
-- A nova tela "Viagens do Dia" (app do Solicitante) mostra, em cards
-- empilhados, TODAS as viagens do dia da ORGANIZAÇÃO INTEIRA (não só do
-- próprio setor/unidade) - foi o escopo escolhido pelo usuário ("Toda a
-- organização") quando perguntado. Hoje, um solicitante só enxerga:
--   - as próprias solicitações ("Solicitacoes do usuario"), e
--   - as do próprio setor/unidade ("Solicitante ve solicitacoes do
--     proprio setor", em supabase_rls_dashboard_solicitante.sql).
-- Nenhuma das duas cobre "todo mundo, de qualquer setor/unidade" - esta
-- policy nova cobre exatamente esse caso, sem tirar nem repetir nenhuma
-- das policies já existentes.
--
-- ATENÇÃO - IMPLICAÇÃO DE PRIVACIDADE (leia antes de rodar; é uma
-- liberação BEM mais ampla que a do Dashboard "Meu Setor"):
-- Depois desta policy, QUALQUER solicitante passa a conseguir LER (via
-- consulta direta ao Supabase, não só pela tela que fizemos) TODAS as
-- colunas de TODAS as solicitações de transporte da organização inteira,
-- de qualquer unidade/setor/solicitante - incluindo origem, destino,
-- justificativa, status e quem são os condutores escalados. A tela
-- "Viagens do Dia" que construímos só exibe isso num card por viagem,
-- só do dia de hoje - mas a policy em si, no banco, permite ler
-- qualquer data, qualquer setor, sem limite (é assim que RLS funciona:
-- controla a LINHA que pode ser lida, não o que uma tela específica
-- decide mostrar). Se isso for mais acesso do que o desejado - por
-- exemplo, se quiser limitar a "só hoje" também no banco, ou voltar a
-- restringir por unidade/setor - me avise que eu ajusto a policy (dá
-- pra adicionar "AND solicitacoes.data_viagem = CURRENT_DATE" na
-- condição abaixo, por exemplo).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'solicitacoes'
      AND policyname = 'Solicitante ve viagens do dia (toda a organizacao)'
  ) THEN
    CREATE POLICY "Solicitante ve viagens do dia (toda a organizacao)" ON solicitacoes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.tipo = 'solicitante'
        )
      );
  END IF;
END $$;
