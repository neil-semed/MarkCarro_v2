-- ============================================================
-- MARKCARRO - Correção: Gestor não consegue criar solicitação em
-- nome de outra pessoa (Solicitante Externo)
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado.
--
-- CAUSA: a política de RLS "Usuario cria propria solicitacao" só permite
-- INSERT em `solicitacoes` quando auth.email() = email_solicitante - ou
-- seja, só permite que alguém crie uma solicitação em NOME PRÓPRIO. Não
-- existia nenhuma política adicional liberando o Gestor/Admin a criar uma
-- solicitação com um email_solicitante diferente do seu próprio e-mail.
-- Resultado: toda vez que um gestor usa a tela "Nova Solicitação" com o
-- bloco "Solicitante Externo" (pessoa sem conta no sistema) e informa um
-- e-mail de contato diferente do e-mail do próprio gestor, o INSERT era
-- rejeitado pelo Postgres com "new row violates row-level security policy".
--
-- Como múltiplas políticas "permissivas" (o tipo padrão) para o mesmo
-- comando na mesma tabela são combinadas com OR, esta política nova
-- simplesmente amplia o que já existe: continua valendo a regra antiga
-- (qualquer usuário autenticado pode inserir em nome próprio) e passa a
-- valer também esta nova (admin/gestor pode inserir em nome de qualquer
-- e-mail).
-- ============================================================

DROP POLICY IF EXISTS "Admin cria solicitacao para qualquer email" ON solicitacoes;
CREATE POLICY "Admin cria solicitacao para qualquer email" ON solicitacoes
  FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- CONFERIR NO FINAL (deve aparecer mais esta política, além da
-- "Usuario cria propria solicitacao" que já existia):
--
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'solicitacoes' AND cmd = 'INSERT';
-- ============================================================
