-- ============================================================
-- MARKCARRO - Corrige exposição de dados pessoais em "profiles"
-- Rode no SQL Editor do Supabase (gvtgtdhfciqegnjqcqlf.supabase.co).
-- Não apaga nenhuma linha - só troca a política de leitura.
--
-- PROBLEMA: a política "Perfis visiveis para autenticados" deixava
-- QUALQUER usuário logado (solicitante, condutor, admin) ler o perfil
-- INTEIRO de qualquer outra pessoa - nome, telefone, CNH e validade da
-- CNH inclusive, de admins e solicitantes que não têm nenhum motivo
-- pra aparecer pra estranhos.
--
-- CORREÇÃO: só ficam visíveis pra qualquer autenticado os perfis de
-- CONDUTOR (necessário: Nova Solicitação, Minhas Solicitações e Agenda
-- mostram o motorista pelo nome). Perfis de solicitante/admin só
-- continuam visíveis pro próprio dono (política já existente,
-- "Usuarios veem proprio perfil") ou pro admin (política nova abaixo).
--
-- OBS: perfis de condutor ainda expõem telefone/CNH pra qualquer
-- autenticado, não só admin - isso é uma limitação de RLS (ele
-- restringe LINHA, não COLUNA). Pra esconder só essas colunas
-- específicas seria preciso criar uma view "profiles_publico" sem
-- telefone/cnh/validade_cnh e trocar listarCondutores() em api.js pra
-- usar essa view - avise se quiser que eu faça essa etapa também.
--
-- Recria is_admin() por segurança, caso este script rode isolado sem
-- o supabase_fix_rls_recursao.sql ter rodado antes (CREATE OR REPLACE
-- é seguro rodar de novo mesmo se já existir).
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

DROP POLICY IF EXISTS "Perfis visiveis para autenticados" ON profiles;

CREATE POLICY "Condutores visiveis para autenticados" ON profiles
  FOR SELECT USING (tipo = 'condutor' AND auth.role() = 'authenticated');

CREATE POLICY "Admin ve todos os perfis" ON profiles
  FOR SELECT USING (is_admin());

-- Conferir depois de rodar: liste as políticas de SELECT em profiles e
-- confirme que aparecem só estas 4: "Usuarios veem proprio perfil",
-- "Condutores visiveis para autenticados", "Admin ve todos os perfis"
-- (e nenhuma "Perfis visiveis para autenticados" sobrando).
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
