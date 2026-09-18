-- ============================================================
-- MARKCARRO - Migração: auto-confirmar e-mail de contas criadas pelo Admin
-- ============================================================
-- BUG "SUPER GRAVE" (Gerenciar Condutores/Usuários - "não salva o cadastro
-- de motorista novo"): se "Confirm email" estiver LIGADO no seu projeto
-- Supabase (Authentication > Sign In / Providers > Email), toda conta
-- criada pelo app (inclusive pelo Admin, nas telas Gerenciar Condutores e
-- Gerenciar Usuários) fica "pendente de confirmação" - e como foi o ADMIN
-- quem cadastrou, e não a própria pessoa, NINGUÉM nunca recebe/clica no
-- e-mail de confirmação. Resultado: a conta é criada, mas o
-- condutor/usuário NUNCA consegue logar (e-mail "não confirmado" pra
-- sempre) - o que pode ter dado a impressão de "não salvou nada".
--
-- Esta migração faz o gatilho de criação de perfil (handle_new_user, que já
-- existe) confirmar sozinho o e-mail de qualquer conta criada com a
-- marcação "criado_por_admin" no metadado (é isso que
-- criarUsuarioComoAdmin(), em api.js, agora envia) - só essas, nunca as
-- contas que a própria pessoa cria pelo Cadastro normal (essas continuam
-- exigindo confirmação normalmente, se essa opção estiver ligada no seu
-- projeto).
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase e clique
-- em "Run". Seguro rodar mais de uma vez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, tipo, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'solicitante'),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );

  -- NOVO: confirma o e-mail sozinho só quando a conta foi criada pelo
  -- Admin (ver comentário acima) - deixa a pessoa logar imediatamente,
  -- com a senha que o admin definiu no cadastro, sem depender de um
  -- e-mail de confirmação que ninguém vai clicar.
  IF (NEW.raw_user_meta_data->>'criado_por_admin') = 'true' AND NEW.email_confirmed_at IS NULL THEN
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CONTAS JÁ CRIADAS ANTES DESTA MIGRAÇÃO (condutores/usuários que você já
-- tentou cadastrar pelo Admin e que podem ter ficado com e-mail não
-- confirmado): rode a consulta abaixo pra ver quem está nessa situação,
-- e o UPDATE logo depois pra liberar o login deles agora.
-- ============================================================

-- 1) Ver quem está com e-mail pendente de confirmação:
-- SELECT email, created_at FROM auth.users WHERE email_confirmed_at IS NULL ORDER BY created_at DESC;

-- 2) Confirmar manualmente UM caso específico (troque o e-mail):
-- UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'coloque-aqui@exemplo.com';
