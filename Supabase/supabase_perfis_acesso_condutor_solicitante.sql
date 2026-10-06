-- ============================================================
-- MARKCARRO - Perfis de Acesso também para Solicitante e Condutor
-- Rodar no SQL Editor do Supabase do MarkCarro. Seguro rodar mais de uma vez.
-- ============================================================

ALTER TABLE perfis_acesso ADD COLUMN IF NOT EXISTS tipo_usuario TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE perfis_acesso DROP CONSTRAINT IF EXISTS perfis_acesso_tipo_usuario_check;
ALTER TABLE perfis_acesso ADD CONSTRAINT perfis_acesso_tipo_usuario_check
  CHECK (tipo_usuario IN ('admin', 'solicitante', 'condutor'));

-- Cada usuário (Solicitante/Condutor) precisa ler o PRÓPRIO perfil de acesso
-- para o app esconder as telas não liberadas.
CREATE OR REPLACE FUNCTION public.meu_perfil_acesso_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$ SELECT perfil_acesso_id FROM profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS "Usuario le o proprio perfil de acesso" ON perfis_acesso;
CREATE POLICY "Usuario le o proprio perfil de acesso" ON perfis_acesso
  FOR SELECT USING (id = public.meu_perfil_acesso_id());
