-- ============================================================
-- MARKCARRO - Redefinir senha de acesso (esqueci minha senha)
-- ============================================================
-- Use isso quando alguém esquecer a senha de login e não tiver como
-- recuperar sozinho pelo app: o MarkCarro ainda não tem um fluxo de
-- "Esqueci minha senha" por e-mail (não há infraestrutura de e-mail
-- configurada no projeto - as notificações são só o sininho dentro do
-- app). Então, por enquanto, redefinir senha é uma ação manual feita
-- aqui no Supabase.
--
-- ------------------------------------------------------------
-- OPÇÃO 1 (mais simples, sem SQL) - painel do Supabase:
-- Authentication > Users > clique no usuário > procure a opção de
-- redefinir/definir senha diretamente ali (o nome exato do botão varia
-- um pouco conforme a versão do Supabase Studio - normalmente algo como
-- "Reset Password" que deixa você digitar a nova senha na hora, sem
-- precisar de e-mail). Se essa opção não aparecer na sua versão, use a
-- Opção 2 abaixo.
--
-- OPÇÃO 2 - SQL Editor do Supabase (mesmo método já usado no arquivo
-- supabase_seed_usuarios.sql pra criar as contas originalmente):
-- 1) Troque o e-mail logo abaixo, se não for este (deduzi pelo cadastro
--    original no seed que é a conta admin "NEIL MARQUES").
-- 2) Troque NOVA_SENHA_AQUI pela senha nova (mínimo 6 caracteres).
-- 3) Rode só o bloco UPDATE abaixo no SQL Editor.
-- 4) Depois de conseguir logar com a senha nova, é recomendável:
--    a) trocar essa senha de novo pelo menu do usuário > Alterar Senha
--       dentro do próprio app (assim ela não fica só aqui no arquivo);
--    b) apagar/limpar o texto da senha deste arquivo e do histórico do
--       SQL Editor, já que fica em texto puro enquanto estiver aqui.
-- ------------------------------------------------------------

UPDATE auth.users
SET
  encrypted_password = crypt('NOVA_SENHA_AQUI', gen_salt('bf')),
  updated_at = now()
WHERE email = 'neildalan@gmail.com';

-- O SQL Editor mostra quantas linhas foram afetadas ao rodar o UPDATE
-- acima: se aparecer "0 rows affected", o e-mail está errado ou a
-- conta não existe com esse e-mail em auth.users - confira antes de
-- tentar de novo.
