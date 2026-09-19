-- ============================================================
-- MARKCARRO - Criação de usuário pelo Admin: abordagem nova (RPC atômica)
-- Rode este script inteiro no SQL Editor do Supabase.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_perfil(
  p_user_id uuid,
  p_dados jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem completar cadastro de usuário.';
  END IF;

  INSERT INTO public.profiles (
    id, tipo, nome, email, telefone, unidade, setor, placa, modelo,
    capacidade, categoria, cooperativa_id, cnh, validade_cnh, ativo,
    ver_agenda_geral
  ) VALUES (
    p_user_id,
    p_dados->>'tipo',
    COALESCE(p_dados->>'nome', ''),
    lower(trim(p_dados->>'email')),
    p_dados->>'telefone',
    p_dados->>'unidade',
    p_dados->>'setor',
    p_dados->>'placa',
    p_dados->>'modelo',
    NULLIF(p_dados->>'capacidade', '')::integer,
    p_dados->>'categoria',
    NULLIF(p_dados->>'cooperativa_id', '')::integer,
    p_dados->>'cnh',
    NULLIF(p_dados->>'validade_cnh', '')::date,
    true,
    COALESCE((p_dados->>'ver_agenda_geral')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone),
    unidade = COALESCE(EXCLUDED.unidade, public.profiles.unidade),
    setor = COALESCE(EXCLUDED.setor, public.profiles.setor),
    placa = COALESCE(EXCLUDED.placa, public.profiles.placa),
    modelo = COALESCE(EXCLUDED.modelo, public.profiles.modelo),
    capacidade = COALESCE(EXCLUDED.capacidade, public.profiles.capacidade),
    categoria = COALESCE(EXCLUDED.categoria, public.profiles.categoria),
    cooperativa_id = COALESCE(EXCLUDED.cooperativa_id, public.profiles.cooperativa_id),
    cnh = COALESCE(EXCLUDED.cnh, public.profiles.cnh),
    validade_cnh = COALESCE(EXCLUDED.validade_cnh, public.profiles.validade_cnh),
    ativo = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_perfil(uuid, jsonb) TO authenticated;
