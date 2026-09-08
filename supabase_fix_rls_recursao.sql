-- ============================================================
-- MARKCARRO - Correção: recursão infinita nas políticas de RLS
-- Rode este script no SQL Editor do Supabase. Ele NÃO apaga nenhum
-- dado (tabelas, usuários, perfis, solicitações etc. ficam intactos) -
-- só corrige a definição das políticas de acesso.
--
-- CAUSA DO ERRO "infinite recursion detected in policy for relation
-- profiles" (código 42P17): a política "Admin atualiza qualquer perfil"
-- está definida NA PRÓPRIA TABELA profiles, e o critério dela faz uma
-- consulta a essa MESMA TABELA profiles pra checar se quem está logado
-- é admin. O Postgres não consegue resolver isso (pra checar a política
-- ele precisaria consultar a tabela, mas consultar a tabela exige
-- checar a política de novo) e trava com erro em QUALQUER acesso a
-- profiles - inclusive uma simples leitura do próprio perfil no login.
--
-- CORREÇÃO: mover essa checagem de "é admin?" para uma função separada
-- (SECURITY DEFINER), que consulta profiles por fora do mecanismo de
-- RLS. É o jeito oficialmente recomendado pelo próprio Supabase pra
-- esse problema. Refeito em todas as políticas que faziam esse mesmo
-- tipo de checagem, não só na de profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND tipo = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- PROFILES (aqui estava a recursão)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin atualiza qualquer perfil" ON profiles;
CREATE POLICY "Admin atualiza qualquer perfil" ON profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- SOLICITACOES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Gestores veem todas solicitacoes" ON solicitacoes;
CREATE POLICY "Gestores veem todas solicitacoes" ON solicitacoes
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin atualiza qualquer solicitacao" ON solicitacoes;
CREATE POLICY "Admin atualiza qualquer solicitacao" ON solicitacoes
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin exclui solicitacao" ON solicitacoes;
CREATE POLICY "Admin exclui solicitacao" ON solicitacoes
  FOR DELETE USING (is_admin());

-- ------------------------------------------------------------
-- LOCAIS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin gerencia locais" ON locais;
CREATE POLICY "Admin gerencia locais" ON locais
  FOR INSERT WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- TABELAS DE APOIO
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin gerencia apoio" ON tabelas_apoio;
CREATE POLICY "Admin gerencia apoio" ON tabelas_apoio
  FOR INSERT WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- REGISTROS DE KM
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Gestores veem KM" ON registros_km;
CREATE POLICY "Gestores veem KM" ON registros_km
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Condutor ou admin lanca KM" ON registros_km;
CREATE POLICY "Condutor ou admin lanca KM" ON registros_km
  FOR INSERT WITH CHECK (auth.email() = email_condutor OR is_admin());

DROP POLICY IF EXISTS "Condutor ou admin atualiza KM" ON registros_km;
CREATE POLICY "Condutor ou admin atualiza KM" ON registros_km
  FOR UPDATE USING (auth.email() = email_condutor OR is_admin())
             WITH CHECK (auth.email() = email_condutor OR is_admin());

DROP POLICY IF EXISTS "Admin exclui KM" ON registros_km;
CREATE POLICY "Admin exclui KM" ON registros_km
  FOR DELETE USING (is_admin());

-- ============================================================
-- PRONTO. Pode testar o login de novo - a leitura de profiles não
-- deve mais dar erro 42P17.
-- ============================================================
