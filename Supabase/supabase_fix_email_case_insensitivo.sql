-- ============================================================
-- MARKCARRO - Corrige comparação de e-mail sensível a maiúsculas/minúsculas
-- ============================================================
-- PEDIDO DO USUÁRIO: "RETRABALHO - aba próximas não carrega nada arruma
-- de novo" (Painel do Motorista).
--
-- HIPÓTESE MAIS PROVÁVEL (não dá pra confirmar sem acesso ao banco real):
-- o Supabase Auth sempre guarda o e-mail de login em MINÚSCULAS
-- internamente (auth.email() dentro de uma policy de RLS devolve sempre
-- minúsculo), mas o e-mail digitado pelo Admin ao cadastrar um
-- condutor/usuário (telas Gerenciar Condutores/Usuários) é salvo em
-- profiles.email exatamente como foi digitado - se o Admin digitou com
-- alguma letra maiúscula (ex.: "Joao.Motorista@empresa.com"), esse mesmo
-- valor acaba copiado pra solicitacoes.condutor_ida/condutor_volta quando
-- o gestor atribui a corrida a ele.
--
-- Resultado: as policies "Condutor ve suas solicitacoes" e "KM do
-- condutor" comparam auth.email() = condutor_ida/email_condutor - como é
-- uma comparação de TEXTO exata, "joao.motorista@empresa.com" (auth) NÃO
-- bate com "Joao.Motorista@empresa.com" (condutor_ida), e o Postgres
-- simplesmente devolve ZERO linhas pro condutor, SEM erro nenhum - a tela
-- (Próximas Agendas, Painel do Dia, Agenda Geral, Dashboard) fica vazia
-- como se não houvesse corrida nenhuma, mesmo tendo.
--
-- Esta migração faz duas coisas, e é segura de rodar mais de uma vez:
--   1) normaliza os e-mails JÁ salvos pra minúsculas (só nas colunas de
--      e-mail "auxiliares" - profiles/solicitacoes/notificacoes/
--      registros_km; NUNCA mexe em auth.users, que o próprio Supabase já
--      controla);
--   2) reescreve as policies de RLS afetadas comparando com LOWER() dos
--      dois lados, pra nunca mais depender da caixa de letra de quem
--      digitou.
--
-- O app (a partir da versão entregue junto com este arquivo) também passa
-- a salvar todo e-mail novo sempre em minúsculas (login, cadastro,
-- Gerenciar Condutores/Usuários) - esta migração só corrige o que já
-- estava salvo antes disso.
-- ============================================================

-- ----------------------------------------------------------
-- 1) Normaliza dados já existentes
-- ----------------------------------------------------------
UPDATE profiles SET email = LOWER(email) WHERE email IS NOT NULL AND email <> LOWER(email);

UPDATE solicitacoes SET email_solicitante = LOWER(email_solicitante)
  WHERE email_solicitante IS NOT NULL AND email_solicitante <> LOWER(email_solicitante);
UPDATE solicitacoes SET condutor_ida = LOWER(condutor_ida)
  WHERE condutor_ida IS NOT NULL AND condutor_ida <> LOWER(condutor_ida);
UPDATE solicitacoes SET condutor_volta = LOWER(condutor_volta)
  WHERE condutor_volta IS NOT NULL AND condutor_volta <> LOWER(condutor_volta);

UPDATE notificacoes SET email_destinatario = LOWER(email_destinatario)
  WHERE email_destinatario IS NOT NULL AND email_destinatario <> LOWER(email_destinatario);

UPDATE registros_km SET email_condutor = LOWER(email_condutor)
  WHERE email_condutor IS NOT NULL AND email_condutor <> LOWER(email_condutor);

-- ----------------------------------------------------------
-- 2) Recria as policies afetadas comparando em minúsculas dos dois lados
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Solicitacoes do usuario" ON solicitacoes;
CREATE POLICY "Solicitacoes do usuario" ON solicitacoes
  FOR SELECT USING (LOWER(auth.email()) = LOWER(email_solicitante));

DROP POLICY IF EXISTS "Condutor ve suas solicitacoes" ON solicitacoes;
CREATE POLICY "Condutor ve suas solicitacoes" ON solicitacoes
  FOR SELECT USING (
    LOWER(auth.email()) = LOWER(condutor_ida) OR LOWER(auth.email()) = LOWER(condutor_volta)
  );

DROP POLICY IF EXISTS "Usuario cria propria solicitacao" ON solicitacoes;
CREATE POLICY "Usuario cria propria solicitacao" ON solicitacoes
  FOR INSERT WITH CHECK (LOWER(auth.email()) = LOWER(email_solicitante));

DROP POLICY IF EXISTS "Solicitante atualiza propria solicitacao" ON solicitacoes;
CREATE POLICY "Solicitante atualiza propria solicitacao" ON solicitacoes
  FOR UPDATE USING (LOWER(auth.email()) = LOWER(email_solicitante))
  WITH CHECK (LOWER(auth.email()) = LOWER(email_solicitante));

DROP POLICY IF EXISTS "KM do condutor" ON registros_km;
CREATE POLICY "KM do condutor" ON registros_km
  FOR SELECT USING (LOWER(auth.email()) = LOWER(email_condutor));

DROP POLICY IF EXISTS "Condutor ou admin lanca KM" ON registros_km;
CREATE POLICY "Condutor ou admin lanca KM" ON registros_km
  FOR INSERT WITH CHECK (
    LOWER(auth.email()) = LOWER(email_condutor)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

DROP POLICY IF EXISTS "Condutor ou admin atualiza KM" ON registros_km;
CREATE POLICY "Condutor ou admin atualiza KM" ON registros_km
  FOR UPDATE USING (
    LOWER(auth.email()) = LOWER(email_condutor)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
  ) WITH CHECK (
    LOWER(auth.email()) = LOWER(email_condutor)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
  );

-- ----------------------------------------------------------
-- DIAGNÓSTICO (rodar manualmente se quiser confirmar a hipótese ANTES de
-- aplicar a correção acima - compara profiles.email com o e-mail que o
-- Supabase Auth realmente usa; qualquer linha aqui é um condutor/usuário
-- afetado por este bug):
-- ----------------------------------------------------------
-- SELECT p.email AS email_no_perfil, u.email AS email_no_auth
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.email <> u.email;
