-- ============================================================
-- MARKCARRO - SEED de usuarios reais (gestor, condutores, solicitantes)
-- Rode este script DEPOIS do supabase_schema.sql, no SQL Editor do
-- Supabase. Ele cria a conta de login (auth.users + auth.identities) e a
-- linha completa em profiles para cada pessoa, direto por SQL - sem
-- passar pela tela de Cadastro uma por uma.
--
-- Observacoes importantes:
-- 1) "gestor" na planilha = tipo 'admin' no banco (é o nome que o
--    código usa internamente para o perfil de Gestor).
-- 2) Todo mundo consegue logar direto (e-mail já fica confirmado),
--    usando a senha exatamente como veio na planilha. Recomende que
--    cada pessoa troque a senha no primeiro acesso (menu do usuário >
--    Alterar Senha) - varias são bem previsiveis (ex: "trocar-123").
-- 3) A senha de ÉRIKA CRISTINA ("2408k") tem só 5 caracteres - deu pra
--    criar porque este script insere direto no banco (sem passar pela
--    validação normal do Supabase, que exige 6+), mas vale ela trocar
--    assim que entrar.
-- 4) Rodar esse script mais de uma vez é seguro: cada bloco só cria o
--    usuário se o e-mail ainda não existir.
-- ============================================================


-- ------------------------------------------------------------
-- NEIL MARQUES (admin) - neildalan@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'neildalan@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'neildalan@gmail.com', crypt('dell-4250', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"admin","nome":"NEIL MARQUES"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'neildalan@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = NULL,
      unidade = NULL,
      setor = NULL,
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- VALÉRIO RIBEIRO ROCHA (condutor) - valeriorrocha2@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'valeriorrocha2@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'valeriorrocha2@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"VALÉRIO RIBEIRO ROCHA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'valeriorrocha2@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98718-8134',
      unidade = NULL,
      setor = NULL,
      placa = 'PWR-4R46',
      modelo = 'FOX',
      capacidade = 4,
      categoria = 'Motorista',
      cnh = '3909724640',
      validade_cnh = DATE '2034-03-31',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- RAFAEL LUCAS SACRAMENTO (condutor) - rafaelsacramento584@yahoo.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rafaelsacramento584@yahoo.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'rafaelsacramento584@yahoo.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"RAFAEL LUCAS SACRAMENTO"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'rafaelsacramento584@yahoo.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98602-9596',
      unidade = NULL,
      setor = NULL,
      placa = 'QSF-9H46',
      modelo = 'VAN',
      capacidade = 15,
      categoria = 'Motorista',
      cnh = '4488243092',
      validade_cnh = DATE '2035-04-15',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- DIVINO ROSA (condutor) - divinorosa3@yahoo.com.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'divinorosa3@yahoo.com.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'divinorosa3@yahoo.com.br', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"DIVINO ROSA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'divinorosa3@yahoo.com.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98206-3309',
      unidade = NULL,
      setor = NULL,
      placa = 'PYH-0047',
      modelo = 'PÁLIO',
      capacidade = 4,
      categoria = 'Motorista',
      cnh = '1368833977',
      validade_cnh = DATE '2030-06-10',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- HERBERT MARTINS NICHOLLS (condutor) - herbert.nicholls@hotmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'herbert.nicholls@hotmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'herbert.nicholls@hotmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"HERBERT MARTINS NICHOLLS"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'herbert.nicholls@hotmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98782-2800',
      unidade = NULL,
      setor = NULL,
      placa = 'HJR-2429',
      modelo = 'MICRO_ÔNIBUS',
      capacidade = 32,
      categoria = 'Motorista',
      cnh = '3477292588',
      validade_cnh = DATE '2032-10-17',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- LUIZ CARLOS OLIVEIRA (condutor) - lula@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lula@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'lula@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"LUIZ CARLOS OLIVEIRA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'lula@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98662-8872',
      unidade = NULL,
      setor = NULL,
      placa = 'QQY-9A46',
      modelo = 'FIORINO',
      capacidade = 1,
      categoria = 'Motorista',
      cnh = '2437256663',
      validade_cnh = DATE '2027-07-01',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- SÉRGIO ANTÔNIO DE SOUZA (condutor) - sergin09@yahoo.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sergin09@yahoo.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'sergin09@yahoo.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"SÉRGIO ANTÔNIO DE SOUZA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'sergin09@yahoo.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99265-3207',
      unidade = NULL,
      setor = NULL,
      placa = 'FTL-5C17',
      modelo = 'DOBLÔ',
      capacidade = 6,
      categoria = 'Motorista',
      cnh = '21055385030',
      validade_cnh = DATE '2028-08-10',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- MÁRCIA SERÁPIA (solicitante) - inclusao.semed@pnl.mg.gov.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'inclusao.semed@pnl.mg.gov.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'inclusao.semed@pnl.mg.gov.br', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"MÁRCIA SERÁPIA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'inclusao.semed@pnl.mg.gov.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '31 99999-8888',
      unidade = 'SEMED',
      setor = 'EDUCAÇÃO INCLUSIVA',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- EVANDRO CAMBA NICHOLLS (condutor) - evandronicholls2@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'evandronicholls2@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'evandronicholls2@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"EVANDRO CAMBA NICHOLLS"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'evandronicholls2@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98531-4016',
      unidade = NULL,
      setor = NULL,
      placa = 'QVJ-9G72',
      modelo = 'PICK-4P',
      capacidade = 4,
      categoria = 'Motorista',
      cnh = '1152848509',
      validade_cnh = DATE '2030-10-09',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- GERALDO GOMES DA SILVA (condutor) - palitin@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'palitin@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'palitin@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"GERALDO GOMES DA SILVA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'palitin@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99940-5961',
      unidade = NULL,
      setor = NULL,
      placa = 'HEM-7F60',
      modelo = 'MICRO_ÔNIBUS',
      capacidade = 32,
      categoria = 'Motorista',
      cnh = '1776110920',
      validade_cnh = DATE '2031-05-17',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- PAULO PEREIRA DOS SANTOS (condutor) - paulopsantos62@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'paulopsantos62@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'paulopsantos62@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"PAULO PEREIRA DOS SANTOS"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'paulopsantos62@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99353-6669',
      unidade = NULL,
      setor = NULL,
      placa = 'GSV-5C26',
      modelo = 'MICRO_ÔNIBUS',
      capacidade = 32,
      categoria = 'Motorista',
      cnh = '2200651719',
      validade_cnh = DATE '2028-06-06',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- JEIDSON SANTOS SILVA (condutor) - jeidsonsilvavan@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jeidsonsilvavan@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'jeidsonsilvavan@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"JEIDSON SANTOS SILVA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'jeidsonsilvavan@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99734-2716',
      unidade = NULL,
      setor = NULL,
      placa = 'OWX-2815',
      modelo = 'VAN',
      capacidade = 15,
      categoria = 'Motorista',
      cnh = '4088705605',
      validade_cnh = DATE '2033-12-07',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- AILTON CARLOS SANTA RITA (condutor) - ailtoncarlosrita@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ailtoncarlosrita@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'ailtoncarlosrita@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"AILTON CARLOS SANTA RITA"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'ailtoncarlosrita@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98690-4008',
      unidade = NULL,
      setor = NULL,
      placa = 'PVK-6456',
      modelo = 'VAN',
      capacidade = 15,
      categoria = 'Motorista',
      cnh = '2562154251',
      validade_cnh = DATE '2028-08-09',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- HELDER HENRIQUE SILVA BORGES (condutor) - helderhsborges@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'helderhsborges@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'helderhsborges@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"HELDER HENRIQUE SILVA BORGES"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'helderhsborges@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99505-2295',
      unidade = NULL,
      setor = NULL,
      placa = 'QKR-4D13',
      modelo = 'VAN',
      capacidade = 15,
      categoria = 'Motorista',
      cnh = '5641312750',
      validade_cnh = DATE '2032-07-21',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- RENILDA GONÇALVES (solicitante) - renildamg@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'renildamg@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'renildamg@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"RENILDA GONÇALVES"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'renildamg@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99209-2318',
      unidade = 'SEMED',
      setor = 'ESCRITURAÇÃO',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- JORGE EVANGELISTA SANTOS (condutor) - jorgesantos@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jorgesantos@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'jorgesantos@gmail.com', crypt('mudar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"JORGE EVANGELISTA SANTOS"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'jorgesantos@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99597-2583',
      unidade = NULL,
      setor = NULL,
      placa = 'HDH-3D62',
      modelo = 'IDEA',
      capacidade = 4,
      categoria = 'Motorista',
      cnh = '2437817698',
      validade_cnh = DATE '2029-09-18',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- ÉRIKA CRISTINA DE BRITO BERNARDINO (solicitante) - erikabritoeducacao@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'erikabritoeducacao@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'erikabritoeducacao@gmail.com', crypt('2408k', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"ÉRIKA CRISTINA DE BRITO BERNARDINO"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'erikabritoeducacao@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99870-7962',
      unidade = 'SEMED',
      setor = 'PEDAGOGIA',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Janaína Lopes de Jesus (solicitante) - janainalopes@prof.educacao.novalima.mg.gov.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'janainalopes@prof.educacao.novalima.mg.gov.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'janainalopes@prof.educacao.novalima.mg.gov.br', crypt('16051966', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"Janaína Lopes de Jesus"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'janainalopes@prof.educacao.novalima.mg.gov.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98785-2938',
      unidade = 'EM EMÍLIA DE LIMA',
      setor = 'Outro',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Elaine Bragança (solicitante) - elaine.braganca@educacao.mg.gov.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'elaine.braganca@educacao.mg.gov.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'elaine.braganca@educacao.mg.gov.br', crypt('StrongesteW10', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"Elaine Bragança"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'elaine.braganca@educacao.mg.gov.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99972-3058',
      unidade = 'SEMED',
      setor = 'ESCRITURAÇÃO',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Silvânia Valentim (solicitante) - etnicoracial.semed@pnl.mg.gov.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'etnicoracial.semed@pnl.mg.gov.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'etnicoracial.semed@pnl.mg.gov.br', crypt('#Negra2024@', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"Silvânia Valentim"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'etnicoracial.semed@pnl.mg.gov.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 98264-5101',
      unidade = 'SEMED',
      setor = 'ETINICOS',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Danielle Cristina de Oliveira Carvalho Souza (solicitante) - danielleolicarsouza@yahoo.com.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'danielleolicarsouza@yahoo.com.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'danielleolicarsouza@yahoo.com.br', crypt('vivianvida', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"Danielle Cristina de Oliveira Carvalho Souza"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'danielleolicarsouza@yahoo.com.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 99337-2370',
      unidade = 'SEMED',
      setor = 'EDUCAÇÃO INCLUSIVA',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Karla Sousa (solicitante) - escrituracao.semed@pnl.mg.gov.br
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'escrituracao.semed@pnl.mg.gov.br') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'escrituracao.semed@pnl.mg.gov.br', crypt('escritura', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"solicitante","nome":"Karla Sousa"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'escrituracao.semed@pnl.mg.gov.br'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 31988-3117',
      unidade = 'SEMED',
      setor = 'ESCRITURAÇÃO',
      placa = NULL,
      modelo = NULL,
      capacidade = NULL,
      categoria = NULL,
      cnh = NULL,
      validade_cnh = NULL,
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;

-- ------------------------------------------------------------
-- GILBERTO RAIMUNDO SANTOS (condutor) - gilbertojoga6@gmail.com
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gilbertojoga6@gmail.com') THEN
    novo_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      'gilbertojoga6@gmail.com', crypt('trocar-123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"tipo":"condutor","nome":"GILBERTO RAIMUNDO SANTOS"}'::jsonb,
      '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), novo_id, novo_id::text,
        jsonb_build_object('sub', novo_id::text, 'email', 'gilbertojoga6@gmail.com'),
        'email', now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Estrutura de auth.identities varia entre versões do Supabase;
      -- login por e-mail/senha funciona mesmo sem essa linha.
      NULL;
    END;

    -- O gatilho on_auth_user_created já grava tipo/nome/email; aqui
    -- completamos o restante do perfil.
    UPDATE profiles SET
      telefone = '(31) 97363-4386',
      unidade = NULL,
      setor = NULL,
      placa = 'HIE-4152',
      modelo = 'FIETA',
      capacidade = 4,
      categoria = 'Motorista',
      cnh = '3445406855',
      validade_cnh = DATE '2026-12-10',
      ativo = true
    WHERE id = novo_id;
  END IF;
END $$;
