-- ============================================================
-- MARKCARRO - Avisos administrativos
-- Rodar no SQL Editor do Supabase do MarkCarro. Seguro rodar mais de uma vez.
-- ============================================================

ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS titulo      TEXT;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS prioridade  TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS sobre_tela  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS enviado_por TEXT;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS aviso_id    UUID;

ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_prioridade_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_prioridade_check
  CHECK (prioridade IN ('normal', 'importante'));

CREATE INDEX IF NOT EXISTS idx_notificacoes_aviso_id ON notificacoes(aviso_id) WHERE aviso_id IS NOT NULL;

-- Admin lê todos os avisos enviados (histórico "Avisos enviados" e contagem de lidos).
DROP POLICY IF EXISTS "Admin le avisos enviados" ON notificacoes;
CREATE POLICY "Admin le avisos enviados" ON notificacoes
  FOR SELECT USING (tipo = 'aviso_admin' AND is_admin());

-- Conferir: SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notificacoes';
