-- MarkCarro - RPC para "adotar" conta orfa (auth.users sem profiles)
--
-- Cenario: um Gestor exclui o registro de um condutor/solicitante direto na
-- tabela "profiles" pelo editor do Supabase, achando que isso remove o
-- usuario por completo. Na verdade profiles.id -> auth.users(id) ON DELETE
-- CASCADE só funciona num sentido: apagar de auth.users cascade para
-- profiles, mas apagar de profiles NAO apaga de auth.users. Isso deixa uma
-- conta de login orfa (sem perfil), e toda tentativa seguinte de "Novo
-- Condutor"/"Novo Solicitante" com o mesmo e-mail falha silenciosamente
-- (signUp() retorna identities: [] porque a conta de login já existe).
--
-- Esta funcao permite que o app, ao detectar esse caso, busque o id da
-- conta orfa e complete o perfil dela com os dados do formulario, em vez
-- de travar.

CREATE OR REPLACE FUNCTION public.admin_buscar_id_por_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar isso.';
  END IF;

  SELECT id INTO resultado
  FROM auth.users
  WHERE email = lower(trim(p_email));

  RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_buscar_id_por_email(text) TO authenticated;
