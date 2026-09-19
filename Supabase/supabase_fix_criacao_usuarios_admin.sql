-- ============================================================
-- MARKCARRO - Migração: corrige de vez a criação de usuários pelo Admin
-- (Gerenciar Condutores E Gerenciar Usuários - "não salva novo
-- condutor/solicitante na base", 4 tentativas anteriores sem sucesso)
-- ============================================================
--
-- O QUE ESTAVA ACONTECENDO DE VERDADE (achado revendo o histórico de
-- migrações já entregues, não mais um "chute"):
--
-- 1) supabase_auto_confirmar_criados_por_admin.sql e
--    supabase_fix_seguranca_criticos.sql cada uma faz
--    "CREATE OR REPLACE FUNCTION public.handle_new_user()" com um corpo
--    DIFERENTE (uma confirma o e-mail sozinha pra contas criadas pelo
--    Admin; a outra bloqueia "tipo" inválido vindo do cadastro público).
--    Como as duas substituem a MESMA função, só a que rodou por ÚLTIMO
--    no seu SQL Editor ficou valendo de verdade - a outra correção foi
--    apagada silenciosamente, sem nenhum aviso. Ou seja: dependendo da
--    ORDEM em que você rodou os scripts que te mandei, uma das duas
--    correções nunca esteve realmente ativa no seu banco.
--
-- 2) Pior: a versão "auto-confirmar" fazia, DENTRO do próprio gatilho
--    AFTER INSERT de auth.users, um "UPDATE auth.users SET
--    email_confirmed_at = now() WHERE id = NEW.id" - ou seja, o gatilho
--    tentava alterar a MESMA tabela/linha que acabou de disparar ele.
--    Esse padrão é uma causa conhecida de "Database error saving new
--    user" no Supabase (a linha em auth.users pode nem chegar a existir
--    de verdade se esse UPDATE falhar, porque tudo roda na MESMA
--    transação do cadastro) - o que bate exatamente com "nenhum
--    registro no Supabase" que você reportou agora pro Solicitante (e
--    provavelmente é a causa real do Condutor também, já que os dois
--    passam pelo MESMO gatilho e pela MESMA criarUsuarioComoAdmin()).
--
-- A CORREÇÃO: uma ÚNICA função handle_new_user() (fim das duas versões
-- conflitantes brigando entre si), e a confirmação de e-mail passa a
-- acontecer num gatilho SEPARADO, do tipo BEFORE INSERT - que só AJUSTA
-- o valor antes de gravar (NEW.email_confirmed_at := ...), sem nunca
-- fazer um UPDATE de volta na tabela. Sem escrita repetida na mesma
-- linha, sem risco de travar o cadastro inteiro.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase e
-- clique em "Run". Seguro rodar mais de uma vez (substitui as versões
-- anteriores das duas funções/gatilhos por estas).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Função que cria a linha em profiles (junta as duas correções
--    anteriores que estavam brigando: tipo só pode ser solicitante/
--    condutor vindo do cadastro público, E ativo=true já gravado
--    explicitamente - reforça, do lado do banco, a mesma correção que
--    já foi feita no app em gerenciar-condutores.js/gerenciar-usuarios.js).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  tipo_solicitado TEXT := COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante');
BEGIN
  IF tipo_solicitado NOT IN ('solicitante', 'condutor') THEN
    tipo_solicitado := 'solicitante';
  END IF;

  INSERT INTO public.profiles (id, tipo, nome, email, ativo)
  VALUES (
    NEW.id,
    tipo_solicitado,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 2) Confirmação de e-mail pra contas criadas pelo Admin - agora como
--    gatilho BEFORE INSERT separado (só ajusta o valor da própria linha
--    ANTES dela ser gravada, nunca escreve de volta na tabela depois).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_confirmar_criado_por_admin()
RETURNS trigger AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'criado_por_admin') = 'true' THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_confirmar ON auth.users;
CREATE TRIGGER on_auth_user_created_confirmar
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirmar_criado_por_admin();

-- ============================================================
-- DIAGNÓSTICO - rode ANTES e DEPOIS de testar um cadastro novo
-- ============================================================
-- Depois de rodar a migração acima, tente cadastrar de novo um
-- Solicitante (ou Condutor) pelo Admin e rode as consultas abaixo pra
-- ver exatamente o que aconteceu (troque o e-mail usado no teste):

-- 1) A conta de login foi criada mesmo? (deve aparecer 1 linha)
-- SELECT id, email, email_confirmed_at, created_at, raw_user_meta_data
--   FROM auth.users WHERE email = 'coloque-aqui@exemplo.com';

-- 2) O perfil foi criado? (deve aparecer 1 linha, com ativo = true)
-- SELECT id, email, tipo, ativo FROM public.profiles
--   WHERE email = 'coloque-aqui@exemplo.com';

-- 3) Confirma quais gatilhos existem HOJE em auth.users (deve aparecer
--    exatamente "on_auth_user_created" e "on_auth_user_created_confirmar" -
--    se aparecer qualquer outro nome de gatilho aqui, me avise antes de
--    testar de novo):
-- SELECT tgname AS gatilho, tgenabled AS ativo
--   FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- Se MESMO ASSIM o cadastro continuar sem criar nada em auth.users (item
-- 1 vazio), o erro está acontecendo ANTES de chegar no gatilho (na
-- própria chamada signUp() do Supabase Auth) - nesse caso preciso que
-- você copie a mensagem exata do toast vermelho que aparece na tela (ou
-- abra o Console do navegador, F12, e me mande o erro que aparece lá),
-- porque sem essa mensagem não dá pra saber qual é a causa nova.
