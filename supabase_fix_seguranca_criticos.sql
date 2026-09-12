-- ============================================================
-- MARKCARRO - Auditoria de segurança: 2 falhas CRÍTICAS de escalação
-- de privilégio + observações. Rode este script no SQL Editor do
-- Supabase. Não apaga nenhum dado - só substitui uma função/gatilho e
-- cria um gatilho novo (ambos "CREATE OR REPLACE" / "DROP...IF EXISTS",
-- seguro rodar mais de uma vez).
--
-- CONTEXTO: você pediu para tratar as questões de segurança antes de
-- continuar com o resto. Revisei todas as políticas de RLS (linha por
-- linha, em todos os arquivos supabase_*.sql já aplicados) e encontrei
-- DUAS formas de QUALQUER pessoa virar Administrador do sistema sozinha,
-- sem precisar de senha de ninguém - só usando o próprio app (ou uma
-- chamada direta à API do Supabase, usando a mesma anon key pública que
-- já está em config.js, visível pra qualquer visitante do site). As duas
-- são corrigidas abaixo.
-- ============================================================

-- ------------------------------------------------------------
-- FALHA 1 (CRÍTICA) - Auto-cadastro como Admin
--
-- A tela pública de Cadastro só mostra as opções "Solicitante" e
-- "Condutor" no formulário - mas quem cria a conta é
-- `_sb.auth.signUp({ email, password, options: { data: metaDados } })`,
-- chamado direto pelo SDK do Supabase com a anon key. O campo
-- `options.data.tipo` (metaDados.tipo) é escolhido pelo NAVEGADOR de
-- quem está se cadastrando - o Supabase não valida esse valor. E o
-- gatilho `handle_new_user()` (criado em supabase_schema.sql) confia
-- cegamente nele:
--
--   INSERT INTO public.profiles (id, tipo, nome, email)
--   VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante'), ...)
--
-- Ou seja: qualquer pessoa, sem estar logada, pode abrir o Console do
-- navegador na tela de Cadastro (ou até fora do app) e rodar algo como:
--
--   supabase.auth.signUp({
--     email: 'qualquer@coisa.com', password: 'AlgumaSenha123',
--     options: { data: { tipo: 'admin', nome: 'Invasor' } }
--   })
--
-- ...e nascer já como Administrador (`is_admin()` = true), com acesso
-- total: ver/editar/excluir qualquer solicitação, gerenciar usuários,
-- unidades, cooperativas, tudo.
--
-- CORREÇÃO: o gatilho agora ignora qualquer "tipo" que não seja
-- 'solicitante' ou 'condutor' vindo do cadastro público, caindo pra
-- 'solicitante' nesse caso. Promover alguém a admin continua exigindo o
-- UPDATE manual documentado no supabase_schema.sql (ou uma tela de
-- gestão de admins, se um dia você quiser construir uma) - nunca mais
-- pelo próprio cadastro.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  tipo_solicitado TEXT := COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante');
BEGIN
  IF tipo_solicitado NOT IN ('solicitante', 'condutor') THEN
    tipo_solicitado := 'solicitante';
  END IF;

  INSERT INTO public.profiles (id, tipo, nome, email)
  VALUES (
    NEW.id,
    tipo_solicitado,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- (o gatilho em si, on_auth_user_created, já existe e continua
-- apontando pra esta função - não precisa recriar.)

-- ------------------------------------------------------------
-- FALHA 2 (CRÍTICA, e mais direta que a Falha 1) - Auto-promoção a
-- Admin depois de já estar logado
--
-- A política "Usuario atualiza proprio perfil" permite UPDATE em
-- `profiles` quando `auth.uid() = id` - mas isso só controla QUAL LINHA
-- a pessoa pode alterar, não QUAIS COLUNAS. RLS no Postgres não
-- restringe colunas sozinho. Isso significa que qualquer Solicitante ou
-- Condutor já logado (uma conta comum, criada normalmente) pode chamar,
-- pelo próprio navegador:
--
--   supabase.from('profiles').update({ tipo: 'admin' }).eq('id', <seu próprio id>)
--
-- E essa chamada É PERMITIDA pela política atual (a linha é a própria,
-- então passa o USING e o WITH CHECK) - a pessoa vira Administrador na
-- hora, sem passar por nenhuma tela do app. O mesmo vale pra
-- `ativo` (reativar a própria conta se algum dia for desativada) e pra
-- `ver_agenda_geral` (se auto-conceder a visão de todas as corridas, que
-- hoje só o Gestor concede pela tela Gerenciar Condutores) e
-- `cooperativa_id`.
--
-- CORREÇÃO: um gatilho BEFORE UPDATE em profiles que, quando quem está
-- fazendo a alteração NÃO é admin, força esses 4 campos a manterem o
-- valor antigo (ignora silenciosamente qualquer tentativa de mudá-los) -
-- não afeta em nada a edição do próprio nome/telefone/placa/modelo/
-- categoria/cnh/unidade/setor, que continuam livres como já eram. E não
-- afeta o Gestor (is_admin() = true) editando o perfil de qualquer
-- pessoa pela tela Gerenciar Condutores/Usuários - continua funcionando
-- exatamente igual.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.proteger_colunas_privilegiadas_profiles()
RETURNS trigger AS $$
BEGIN
  IF NOT is_admin() THEN
    NEW.tipo := OLD.tipo;
    NEW.ativo := OLD.ativo;
    NEW.ver_agenda_geral := OLD.ver_agenda_geral;
    NEW.cooperativa_id := OLD.cooperativa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_proteger_colunas_privilegiadas_profiles ON profiles;
CREATE TRIGGER trg_proteger_colunas_privilegiadas_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_colunas_privilegiadas_profiles();

-- ============================================================
-- CONFERIR NO FINAL:
--
-- 1) Deve mostrar exatamente este gatilho novo em profiles, além do
--    "on_auth_user_created" que já existia:
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'profiles'::regclass AND NOT tgisinternal;
--
-- 2) Teste manual (opcional, recomendado): logado como Solicitante ou
--    Condutor comum (não Admin), tente no Console do navegador:
--      await supabase.from('profiles').update({tipo:'admin'}).eq('id', (await supabase.auth.getUser()).data.user.id)
--    Antes desta correção: funcionava. Depois: o comando roda sem erro,
--    mas o campo "tipo" continua o mesmo de antes (confira consultando
--    seu próprio perfil de novo).
-- ============================================================
