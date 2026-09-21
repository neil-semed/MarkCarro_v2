-- MarkCarro - Corrige "não cria solicitante" no auto-cadastro público
-- ("Criar conta").
--
-- CAUSA: depois do signUp() na tela "Criar conta", o app chama
-- atualizarPerfil() (UPDATE direto em profiles) pra completar
-- telefone/Unidade/Setor - o gatilho handle_new_user() só grava
-- id/tipo/nome/email/ativo, nunca esses campos extras (mesma limitação
-- que já existia na criação pelo Admin, resolvida lá por
-- admin_upsert_perfil()). O problema: se o projeto Supabase tem
-- "Confirm email" ligado (confirmação de e-mail obrigatória),
-- signUp() NÃO devolve sessão nenhuma até o e-mail ser confirmado - ou
-- seja, o UPDATE seguinte roda SEM login nenhum (usuário anônimo). A
-- política de RLS "Usuario atualiza proprio perfil" exige
-- auth.uid() = id, então esse UPDATE sempre afeta 0 linhas, SEM
-- devolver erro nenhum (não tem RLS pra INSERT que bloqueie, é um
-- UPDATE filtrado que só não acha a linha permitida) - o app mostra
-- "Cadastro realizado!" mesmo assim, e o solicitante fica com conta de
-- login criada mas telefone/Unidade/Setor sempre em branco (pareceria
-- "não criou", já que não dá pra usar o app direito sem Unidade/Setor).
-- Reproduzido e confirmado num Postgres local antes deste script.
--
-- CORREÇÃO: nova função completar_cadastro_proprio(), SECURITY DEFINER
-- (roda por fora do RLS), chamada pelo app logo após o signUp() do
-- auto-cadastro, no lugar do UPDATE direto. Só aceita completar um
-- perfil criado nos ÚLTIMOS 15 MINUTOS (a própria conta que acabou de
-- se cadastrar) - nunca um perfil antigo ou de outra pessoa, mesmo que
-- alguém descubra o UUID por fora. Só grava telefone/Unidade/Setor
-- (nunca tipo/nome/email/ativo - esses continuam só do gatilho, não dá
-- pra essa função virar uma porta pra alguém se autopromover a admin
-- ou trocar o e-mail/tipo de outra conta).

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
    telefone = COALESCE(p_dados->>'telefone', telefone),
    unidade = COALESCE(p_dados->>'unidade', unidade),
    setor = COALESCE(p_dados->>'setor', setor),
    placa = COALESCE(p_dados->>'placa', placa),
    modelo = COALESCE(p_dados->>'modelo', modelo),
    capacidade = COALESCE(NULLIF(p_dados->>'capacidade', '')::integer, capacidade),
    categoria = COALESCE(p_dados->>'categoria', categoria),
    cnh = COALESCE(p_dados->>'cnh', cnh),
    validade_cnh = COALESCE(NULLIF(p_dados->>'validade_cnh', '')::date, validade_cnh)
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.completar_cadastro_proprio(uuid, jsonb) TO anon, authenticated;
