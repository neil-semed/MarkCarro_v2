-- ============================================================
-- MARKCARRO - Nome/telefone/placa dos motoristas ESCALADOS em viagens
-- Problema: motorista logado (app) só consegue ler perfis marcados como
-- 'condutor' (RLS de profiles); um login criado direto pelo app que não
-- esteja assim aparecia como e-mail na Agenda Geral.
-- Esta função (só leitura) devolve nome, telefone, placa, capacidade e
-- categoria APENAS de quem aparece como condutor_ida/condutor_volta em
-- alguma solicitação - nunca CNH nem dados de quem não está escalado.
-- Não apaga nada; seguro rodar mais de uma vez.
-- ============================================================
CREATE OR REPLACE FUNCTION public.nomes_condutores_escalados()
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'email', p.email,
    'nome', p.nome,
    'telefone', p.telefone,
    'placa', p.placa,
    'capacidade', p.capacidade,
    'categoria', p.categoria
  )
  FROM profiles p
  WHERE lower(trim(p.email)) IN (
    SELECT lower(trim(condutor_ida)) FROM solicitacoes WHERE condutor_ida IS NOT NULL
    UNION
    SELECT lower(trim(condutor_volta)) FROM solicitacoes WHERE condutor_volta IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.nomes_condutores_escalados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nomes_condutores_escalados() TO authenticated;
