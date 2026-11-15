-- ============================================================
-- MARKCARRO - Nome dos solicitantes nas viagens (app do motorista)
-- Problema: quem se cadastra direto no app do solicitante fica com perfil
-- 'solicitante', que o RLS de profiles só deixa o próprio dono/admin ler -
-- o motorista via o e-mail no lugar do nome.
-- Esta função (só leitura) devolve APENAS e-mail, nome e telefone (para o motorista
-- contatar o passageiro) de quem aparece como
-- solicitante em alguma solicitação, e só para admin e motorista logados.
-- Não expõe CNH nem outros dados. Não apaga nada; seguro rodar de novo.
-- ============================================================
CREATE OR REPLACE FUNCTION public.nomes_solicitantes_viagens()
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object('email', p.email, 'nome', p.nome, 'telefone', p.telefone)
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM profiles me
    WHERE me.id = auth.uid() AND lower(me.tipo) IN ('admin', 'condutor')
  )
  AND p.nome IS NOT NULL AND trim(p.nome) <> ''
  AND lower(trim(p.email)) IN (
    SELECT lower(trim(email_solicitante)) FROM solicitacoes WHERE email_solicitante IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.nomes_solicitantes_viagens() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nomes_solicitantes_viagens() TO authenticated;
