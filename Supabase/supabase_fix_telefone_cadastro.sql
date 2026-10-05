-- MarkCarro - "Cadastro não grava telefone/Unidade/Setor"
-- Execute UMA vez no SQL Editor (pode repetir, é seguro).
--
-- 1) O gatilho handle_new_user() passa a gravar telefone, Unidade, Setor e dados
--    de condutor direto dos metadados do signUp - não depende mais da chamada
--    posterior do app (RPC), que falha quando não há sessão.
-- 2) Recria completar_cadastro_proprio() (rede de segurança) com permissão para anon.
-- 3) Recupera contas criadas desde 01/10/2026: cria o perfil que faltar e
--    preenche telefone/Unidade/Setor em branco a partir dos metadados.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  tipo_solicitado TEXT := COALESCE(m->>'tipo', 'solicitante');
  cap INTEGER;
  val DATE;
BEGIN
  IF tipo_solicitado NOT IN ('solicitante', 'condutor') THEN
    tipo_solicitado := 'solicitante';
  END IF;
  BEGIN cap := NULLIF(m->>'capacidade', '')::integer; EXCEPTION WHEN OTHERS THEN cap := NULL; END;
  BEGIN val := NULLIF(m->>'validade_cnh', '')::date;  EXCEPTION WHEN OTHERS THEN val := NULL; END;

  BEGIN
    INSERT INTO public.profiles (id, tipo, nome, email, ativo, telefone, unidade, setor, placa, modelo, capacidade, categoria, cnh, validade_cnh)
    VALUES (
      NEW.id, tipo_solicitado, COALESCE(m->>'nome', ''), NEW.email, true,
      NULLIF(m->>'telefone', ''), NULLIF(m->>'unidade', ''), NULLIF(m->>'setor', ''),
      NULLIF(m->>'placa', ''), NULLIF(m->>'modelo', ''), cap,
      NULLIF(m->>'categoria', ''), NULLIF(m->>'cnh', ''), val
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar profiles para % (%): %', NEW.email, NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.completar_cadastro_proprio(p_user_id uuid, p_dados jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND created_at > now() - interval '15 minutes'
  ) THEN
    RAISE EXCEPTION 'Cadastro não encontrado ou expirado. Tente se cadastrar novamente.';
  END IF;

  UPDATE public.profiles SET
    telefone = COALESCE(NULLIF(p_dados->>'telefone', ''), telefone),
    unidade = COALESCE(NULLIF(p_dados->>'unidade', ''), unidade),
    setor = COALESCE(NULLIF(p_dados->>'setor', ''), setor),
    placa = COALESCE(NULLIF(p_dados->>'placa', ''), placa),
    modelo = COALESCE(NULLIF(p_dados->>'modelo', ''), modelo),
    capacidade = COALESCE(NULLIF(p_dados->>'capacidade', '')::integer, capacidade),
    categoria = COALESCE(NULLIF(p_dados->>'categoria', ''), categoria),
    cnh = COALESCE(NULLIF(p_dados->>'cnh', ''), cnh),
    validade_cnh = COALESCE(NULLIF(p_dados->>'validade_cnh', '')::date, validade_cnh)
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.completar_cadastro_proprio(uuid, jsonb) TO anon, authenticated;

-- Recuperação: perfis que faltam (contas criadas desde 01/10/2026)
INSERT INTO public.profiles (id, tipo, nome, email, ativo, telefone, unidade, setor)
SELECT u.id,
       CASE WHEN u.raw_user_meta_data->>'tipo' = 'condutor' THEN 'condutor' ELSE 'solicitante' END,
       COALESCE(u.raw_user_meta_data->>'nome', ''), u.email, true,
       NULLIF(u.raw_user_meta_data->>'telefone', ''), NULLIF(u.raw_user_meta_data->>'unidade', ''), NULLIF(u.raw_user_meta_data->>'setor', '')
FROM auth.users u
WHERE u.created_at >= '2026-10-01'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Recuperação: preenche só o que está em branco
UPDATE public.profiles p SET
  telefone = COALESCE(NULLIF(p.telefone, ''), NULLIF(u.raw_user_meta_data->>'telefone', '')),
  unidade  = COALESCE(NULLIF(p.unidade, ''),  NULLIF(u.raw_user_meta_data->>'unidade', '')),
  setor    = COALESCE(NULLIF(p.setor, ''),    NULLIF(u.raw_user_meta_data->>'setor', ''))
FROM auth.users u
WHERE u.id = p.id
  AND u.created_at >= '2026-10-01'
  AND (COALESCE(p.telefone, '') = '' OR COALESCE(p.unidade, '') = '' OR COALESCE(p.setor, '') = '');

-- Conferência: SELECT nome, email, telefone, unidade, setor, created_at FROM profiles ORDER BY created_at DESC LIMIT 15;
