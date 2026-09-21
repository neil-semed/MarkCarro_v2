-- MarkCarro - Corrige "app não carrega Unidade nem Setor" na tela pública
-- de auto-cadastro ("Criar conta").
--
-- CAUSA: a política de leitura de "tabelas_apoio" (é essa tabela que
-- alimenta os dropdowns de Unidade/Setor em Cadastro, Nova Solicitação e
-- Gerenciar Usuários - ver listarUnidades()/listarSetoresPorUnidade() em
-- api.js) exige `auth.role() = 'authenticated'`. A tela "Criar conta" é
-- justamente onde alguém AINDA NÃO TEM CONTA - o app roda com a sessão
-- anônima (role "anon") até o cadastro terminar, então essa política
-- sempre bloqueia a leitura ali, e o dropdown de Unidade fica só com a
-- opção fixa "Outra Unidade" (nunca com as Unidades de verdade). Depois
-- do login (ex.: painel do Admin em "Gerenciar Usuários"), a mesma
-- consulta já funciona, porque ali a sessão já é "authenticated" - por
-- isso o problema só aparece na tela de cadastro público.
--
-- CORREÇÃO: "tabelas_apoio" só guarda Unidade/Setor/e-mail de contato do
-- setor (nenhum dado pessoal) - não tem motivo pra exigir login só pra
-- LER essa lista. Libera SELECT geral (inclusive anônimo); INSERT/UPDATE/
-- DELETE continuam só para admin (políticas existentes, não mexidas
-- aqui).

DROP POLICY IF EXISTS "Apoio visivel" ON tabelas_apoio;
CREATE POLICY "Apoio visivel" ON tabelas_apoio
  FOR SELECT USING (true);
