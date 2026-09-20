-- Lista toda conta de login (auth.users) sem perfil correspondente em
-- profiles - ou seja, toda conta orfa deixada por exclusao manual de linhas
-- em profiles pelo editor do Supabase (ver supabase_admin_buscar_id_por_email.sql
-- e a correção em api.js para o porquê disso acontece e como agora se
-- autocorrige na próxima tentativa de "Novo Condutor"/"Novo Solicitante").
--
-- Rode isso pra ver quais contas ainda estão pendentes (a partir de agora,
-- basta ir em "Novo Condutor"/"Novo Solicitante" de novo com o MESMO e-mail
-- que o app completa o cadastro sozinho, sem precisar de SQL manual).

SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;
