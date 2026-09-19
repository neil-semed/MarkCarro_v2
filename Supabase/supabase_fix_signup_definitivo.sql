-- ============================================================
-- MARKCARRO - Criação de usuário: correção definitiva (6ª tentativa,
-- mecanismo diferente das anteriores)
-- Rode este script inteiro no SQL Editor do Supabase.
-- ============================================================
--
-- O QUE MUDA DE VERDADE EM RELAÇÃO A supabase_fix_criacao_usuarios_admin.sql:
--
-- 1) O gatilho BEFORE INSERT que esse script anterior criou
--    (auto_confirmar_criado_por_admin, mexendo direto em auth.users) é
--    REMOVIDO. Qualquer gatilho em auth.users é ponto único de falha: se
--    ele erra por qualquer motivo, o Supabase Auth recusa criar a conta
--    inteira ("Database error saving new user") - e não tem como eu
--    verificar isso de fora, testando num Postgres local, porque depende
--    do motor interno do Supabase Auth (GoTrue), que eu não tenho acesso
--    aqui pra testar de verdade.
--
-- 2) handle_new_user() (o gatilho AFTER INSERT que cria a linha em
--    profiles) agora NUNCA pode travar a criação da conta: o INSERT em
--    profiles roda dentro de um bloco próprio que captura qualquer erro
--    (BEGIN/EXCEPTION) - se der problema aí, a conta em auth.users é
--    criada do mesmo jeito (só fica faltando o perfil, que a
--    admin_upsert_perfil() já resolve na sequência, chamada pelo app).
--    Testado num Postgres local forçando o INSERT em profiles falhar de
--    propósito: auth.users continuou sendo criado mesmo assim.
--
-- 3) A confirmação de e-mail de conta criada pelo Admin deixa de ser um
--    gatilho (rodando DENTRO da mesma transação do cadastro) e passa a
--    ser uma chamada SEPARADA (admin_confirmar_email), feita pelo app
--    LOGO DEPOIS que a conta já foi criada com sucesso - nunca pode fazer
--    o cadastro em si falhar, porque roda depois, numa transação própria.
-- ============================================================

-- ------------------------------------------------------------
-- 1) handle_new_user() - à prova de erro: NUNCA bloqueia auth.users
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  tipo_solicitado TEXT := COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante');
BEGIN
  IF tipo_solicitado NOT IN ('solicitante', 'condutor') THEN
    tipo_solicitado := 'solicitante';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, tipo, nome, email, ativo)
    VALUES (
      NEW.id,
      tipo_solicitado,
      COALESCE(NEW.raw_user_meta_data->>'nome', ''),
      NEW.email,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    -- Nunca deixa um erro aqui (linha duplicada, coluna obrigatória
    -- faltando, o que for) derrubar a criação da conta de login.
    RAISE WARNING 'handle_new_user: falha ao criar profiles para % (%): %', NEW.email, NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 2) Remove o gatilho BEFORE INSERT em auth.users (suspeito nº 1 de ter
--    quebrado a criação de usuários) - a confirmação de e-mail passa a
--    ser feita pela função separada abaixo.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_confirmar ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirmar_criado_por_admin();

-- ------------------------------------------------------------
-- 3) Confirmação de e-mail para conta criada pelo Admin - chamada pelo
--    app (api.js: adminConfirmarEmail) IMEDIATAMENTE depois que
--    criarUsuarioComoAdmin() já retornou com sucesso. Roda numa
--    transação própria, separada da criação da conta.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirmar_email(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar e-mail de usuário criado.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirmar_email(uuid) TO authenticated;

-- ============================================================
-- DIAGNÓSTICO 1 - gatilhos hoje em auth.users (deve aparecer só
-- "on_auth_user_created" depois de rodar este script):
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--
-- DIAGNÓSTICO 2 - "vários registros da tabela profiles (upload via CSV)
-- não logam": isso só é possível se a conta de login (auth.users) dessas
-- pessoas nunca existiu ou está com problema. Rode para listar quem está
-- assim (perfil existe, mas sem conta de login correspondente):
-- SELECT p.email, p.nome, p.tipo
--   FROM public.profiles p
--   LEFT JOIN auth.users u ON u.id = p.id
--   WHERE u.id IS NULL;
-- Se a consulta acima devolver linhas, cada uma delas nunca vai conseguir
-- logar até ter uma conta de login criada pra aquele e-mail (pelo
-- Gerenciar Usuários/Condutores do Admin, ou pelo cadastro público) - não
-- tem ajuste de SQL que resolva sozinho, porque essas pessoas nunca
-- tiveram senha nenhuma cadastrada no sistema de login.
-- ============================================================
