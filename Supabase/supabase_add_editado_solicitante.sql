-- ============================================================
-- MARKCARRO - Migração: coluna "editado_pelo_solicitante"
-- ============================================================
-- Necessária para o novo recurso: "se o solicitante editar a própria
-- solicitação (dentro do prazo de 24h), mostrar 'Editado' em laranja perto
-- do status" (tela Minhas Solicitações).
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query) e clique em "Run". É seguro rodar mais
-- de uma vez (usa IF NOT EXISTS / DEFAULT).
-- ============================================================

ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS editado_pelo_solicitante boolean NOT NULL DEFAULT false;

-- Nenhuma policy de RLS nova é necessária: a coluna é gravada pelo próprio
-- solicitante através do mesmo UPDATE que já usa pra editar hora/origem/
-- destino/passageiros/justificativa (política existente de UPDATE em
-- "solicitacoes" para o dono da linha já cobre esta coluna também).
