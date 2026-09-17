-- ============================================================
-- MARKCARRO - RLS: Admin cria solicitação em nome de outra pessoa
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase UMA VEZ.
--
-- BUG ENCONTRADO (relatado pelo usuário: "não carrega dados de cadastro
-- de solicitações na aba gerenciar solicitações - acabei de registrar
-- uma solicitação e não carregou"):
--
-- A tela "Nova Solicitação" tem um modo "Solicitante Externo", usado
-- pelo Gestor/Admin pra registrar uma viagem em nome de outra pessoa
-- (alguém sem conta no sistema, ou presente na secretaria) - inclusive
-- com um campo "E-mail de contato" pra essa pessoa. O problema: a única
-- policy de INSERT que existe hoje na tabela "solicitacoes" é:
--
--   CREATE POLICY "Usuario cria propria solicitacao" ON solicitacoes
--     FOR INSERT WITH CHECK (auth.email() = email_solicitante);
--
-- Ou seja, o Postgres só aceita a inserção se o e-mail salvo na coluna
-- "email_solicitante" for EXATAMENTE o e-mail de quem está logado. Como
-- nunca existiu uma policy pro caso "Admin cria em nome de outra
-- pessoa" (com um e-mail diferente do dele), toda vez que o Admin
-- preenche o "E-mail de contato" com o e-mail de verdade da pessoa, o
-- INSERT é rejeitado pela RLS (erro 42501) - e o app, por um bug à
-- parte (corrigido junto em pages/nova-solicitacao.js), navegava pra
-- "Minhas Solicitações" e limpava o formulário mesmo assim, dando a
-- falsa impressão de que tinha funcionado. Resultado: a solicitação
-- nunca chegava a existir no banco, então não aparecia em lugar nenhum
-- (nem em "Minhas Solicitações", nem em "Gerenciar Solicitações").
--
-- Se o campo "E-mail de contato" ficasse em branco, o app usa o e-mail
-- do próprio Admin como fallback - aí o INSERT passava normalmente
-- (é por isso que o bug não acontecia sempre, só quando um e-mail de
-- contato de verdade era informado).
--
-- A CORREÇÃO: uma nova policy de INSERT, adicional à que já existe (RLS
-- combina policies do mesmo tipo com OR - isso não tira nem restringe a
-- que já existe pros usuários comuns), liberando quem é Admin a inserir
-- uma solicitação com QUALQUER email_solicitante.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'solicitacoes'
      AND policyname = 'Admin cria solicitacao para qualquer pessoa'
  ) THEN
    CREATE POLICY "Admin cria solicitacao para qualquer pessoa" ON solicitacoes
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin')
      );
  END IF;
END $$;
