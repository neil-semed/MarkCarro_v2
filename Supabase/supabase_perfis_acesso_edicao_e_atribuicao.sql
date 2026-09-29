-- ============================================================
-- MARKCARRO - Perfis de Acesso: nível "Consulta/Pode editar" por tela
-- + atribuição do perfil a um usuário Admin de verdade
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só adiciona colunas novas (com DEFAULT seguro) e atualiza a função
-- de criação de usuário.
--
-- O que isso adiciona:
-- 1) perfis_acesso.telas_edicao (jsonb) - subconjunto de
--    telas_permitidas onde o perfil também pode EDITAR (criar/alterar/
--    excluir), não só ver. Perfis já existentes recebem
--    telas_edicao = telas_permitidas (ninguém perde a capacidade de
--    edição que já tinha - só passa a ser possível RESTRINGIR daqui
--    pra frente, editando o perfil na tela "Gerenciar Perfis de
--    Acesso").
-- 2) profiles.perfil_acesso_id (uuid, aponta pra perfis_acesso.id) -
--    até agora "Perfis de Acesso" era só um cadastro solto, sem
--    ligação com nenhum usuário de verdade (nenhuma tela aplicava essa
--    permissão). Esta coluna é o que permite escolher, ao criar/editar
--    um usuário Admin em "Gerenciar Usuários", qual Perfil de Acesso
--    ele usa. NULL = admin com acesso total, sem restrição (é o que
--    todo admin já cadastrado tem hoje - ninguém é afetado por essa
--    mudança até alguém escolher um perfil pra ele explicitamente).
-- 3) admin_upsert_perfil() passa a aceitar perfil_acesso_id também
--    (mesmo mecanismo usado pra criar Condutor/Solicitante, agora
--    também pra criar Admin com um Perfil de Acesso já na criação).
--
-- IMPORTANTE (mesma ressalva da 1ª versão): este continua sendo um
-- controle de nível de APLICAÇÃO (esconde pílulas de menu, desabilita
-- formulários) - não é uma trava de segurança no banco (RLS). Ver
-- pages/login.js (aplicarRestricaoPerfilAcessoAdmin) e app.js
-- (usuarioPodeEditarTela).
-- ============================================================

ALTER TABLE perfis_acesso ADD COLUMN IF NOT EXISTS telas_edicao JSONB DEFAULT '[]'::jsonb;

-- Backfill (roda uma vez): perfis já cadastrados ganham "Pode editar"
-- em tudo que já estava marcado, pra não perder capacidade nenhuma.
UPDATE perfis_acesso
SET telas_edicao = telas_permitidas
WHERE telas_edicao IS NULL OR telas_edicao = '[]'::jsonb;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS perfil_acesso_id UUID REFERENCES perfis_acesso(id) ON DELETE SET NULL;

-- admin_upsert_perfil(): mesma função de sempre (ver
-- supabase_fix_criar_usuario_rpc.sql), só acrescentando a coluna nova
-- na lista - todo o resto (INSERT/UPDATE dos demais campos) continua
-- idêntico.
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
    ver_agenda_geral, perfil_acesso_id
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
    COALESCE((p_dados->>'ver_agenda_geral')::boolean, false),
    NULLIF(p_dados->>'perfil_acesso_id', '')::uuid
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
    ativo = true,
    perfil_acesso_id = COALESCE(EXCLUDED.perfil_acesso_id, public.profiles.perfil_acesso_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_perfil(uuid, jsonb) TO authenticated;
