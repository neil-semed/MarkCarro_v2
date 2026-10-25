-- ============================================================
-- MARKCARRO - Histórico de status das solicitações (e-mails ADM Escolar / Ass-Psico)
-- Guarda data/hora e operador de cada status (Registrada, Confirmada, Ocupada,
-- Cancelada). Gravado só pela Edge Function enviar-email-solicitacao.
-- Não apaga nada; seguro rodar mais de uma vez.
-- ============================================================
CREATE TABLE IF NOT EXISTS solicitacoes_historico_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id TEXT NOT NULL,
  status TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  operador TEXT
);
CREATE INDEX IF NOT EXISTS idx_hist_status_solicitacao ON solicitacoes_historico_status (solicitacao_id, data_hora);
ALTER TABLE solicitacoes_historico_status ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso apenas pela Edge Function (service role).
