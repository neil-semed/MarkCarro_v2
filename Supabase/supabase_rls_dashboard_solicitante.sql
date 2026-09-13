-- ============================================================
-- MARKCARRO - RLS para o Dashboard do Solicitante ("Meu Setor")
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase UMA VEZ.
--
-- O QUE ISSO FAZ:
-- Hoje, a policy "Solicitacoes do usuario" só deixa um solicitante
-- enxergar as PRÓPRIAS solicitações (auth.email() = email_solicitante).
-- O novo Dashboard do Solicitante pedido pelo usuário mostra, além dos
-- dados próprios, um resumo do SETOR/UNIDADE inteiro (colegas do mesmo
-- setor) - e isso exige que o solicitante consiga ler linhas da tabela
-- "solicitacoes" que não são dele. Esta policy nova cobre exatamente
-- esse caso, sem tirar nem repetir nenhuma das policies já existentes.
--
-- ATENÇÃO - IMPLICAÇÃO DE PRIVACIDADE (leia antes de rodar):
-- Depois desta policy, qualquer solicitante passa a conseguir LER (via
-- consulta direta ao Supabase, não só pela tela que fizemos) todas as
-- colunas de qualquer solicitação de transporte feita por um colega da
-- mesma unidade+setor - incluindo origem, destino, justificativa e
-- status, não só um resumo agregado. A tela do Dashboard que construímos
-- só EXIBE isso de forma agregada (cartões de total/aprovadas/pendentes
-- e um gráfico), nunca lista as solicitações do setor uma a uma - mas a
-- policy em si, no banco, permite mais do que a tela mostra (é assim que
-- RLS funciona: controla a LINHA, não o que a tela decide exibir). Se
-- isso for mais acesso do que o desejado, me avise que ajusto a policy
-- (por exemplo, restringindo a colunas específicas via uma view, ou
-- tirando esse recurso do Dashboard).
--
-- Requer que profiles.unidade e profiles.setor estejam preenchidos pra
-- cada solicitante (já é o caso - são os mesmos campos usados no
-- cadastro e copiados pra cada solicitação em pages/nova-solicitacao.js).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'solicitacoes'
      AND policyname = 'Solicitante ve solicitacoes do proprio setor'
  ) THEN
    CREATE POLICY "Solicitante ve solicitacoes do proprio setor" ON solicitacoes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.tipo = 'solicitante'
            AND p.unidade IS NOT NULL
            AND p.setor IS NOT NULL
            AND p.unidade = solicitacoes.unidade
            AND p.setor = solicitacoes.setor
        )
      );
  END IF;
END $$;
