-- ============================================================
-- MARKCARRO - Correção: recursão infinita nas políticas de RLS
-- Rode este script no SQL Editor do Supabase. Ele NÃO apaga nenhum
-- dado (tabelas, usuários, perfis, solicitações etc. ficam intactos) -
-- só corrige a definição das políticas de acesso.
--
-- CAUSA DO ERRO "infinite recursion detected in policy for relation
-- profiles" (código 42P17): existiam DUAS fontes de recursão na tabela
-- profiles.
--
-- 1) A política "Admin atualiza qualquer perfil" que eu mesmo criei
--    consultava a própria tabela profiles dentro do seu critério.
--    Já corrigido na rodada anterior deste script, usando a função
--    is_admin() (SECURITY DEFINER) abaixo em vez de uma subconsulta
--    direta - assim a checagem de "é admin?" roda por fora do
--    mecanismo de RLS, sem se referenciar.
--
-- 2) Uma política adicional chamada "profiles_dono_ou_admin" (não foi
--    criada por nenhum dos meus scripts - deve ter vindo de um teste
--    anterior ou de um template do próprio painel do Supabase) também
--    fazia esse mesmo tipo de autoconsulta, e pior: ela vale pra TODOS
--    os comandos (FOR ALL - inclusive um simples SELECT), por isso a
--    correção anterior não resolveu sozinha. Esta política é removida
--    abaixo por ser totalmente redundante com as outras (mesmo
--    resultado: dono vê/edita o próprio perfil, admin vê/edita
--    qualquer perfil).
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
-- PROFILES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_dono_ou_admin" ON profiles;

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
-- CONFERIR NO FINAL (deve mostrar só as 5 políticas que eu criei,
-- sem nenhuma "profiles_dono_ou_admin" nem qualquer outra estranha):
--
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--
-- Depois é só testar o login de novo.
-- ============================================================
