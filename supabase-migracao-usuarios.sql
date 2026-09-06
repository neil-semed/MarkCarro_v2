-- ============================================================
-- CRIAR USUÁRIOS NO AUTH (rodar um por vez no Dashboard)
-- ou usar a API de admin do Supabase
-- ============================================================

-- ATENÇÃO: O Supabase Auth não permite INSERT direto via SQL.
-- Você precisa criar cada usuário pelo Dashboard:
-- Authentication → Users → Add user → Create new user
--
-- Usuários para criar:
-- ============================================================

-- CONDUTORES (senha padrão: trocar-123)
-- 1. valeriorrocha2@gmail.com / trocar-123
-- 2. rafaelsacramento584@yahoo.com / trocar-123
-- 3. divinorosa3@yahoo.com.br / trocar-123
-- 4. herbert.nicholls@hotmail.com / trocar-123
-- 5. lula@gmail.com / trocar-123
-- 6. sergin09@yahoo.com / trocar-123
-- 7. evandronicholls2@gmail.com / trocar-123
-- 8. palitin@gmail.com / trocar-123
-- 9. paulopsantos62@gmail.com / trocar-123
-- 10. jeidsonsilvavan@gmail.com / trocar-123
-- 11. ailtoncarlosrita@gmail.com / trocar-123
-- 12. helderhsborges@gmail.com / trocar-123
-- 13. jorgesantos@gmail.com / trocar-123
-- 14. gilbertojoga6@gmail.com / trocar-123

-- SOLICITANTES (senha padrão: trocar-123)
-- 15. inclusao.semed@pnl.mg.gov.br / trocar-123
-- 16. renildamg@gmail.com / trocar-123
-- 17. erikabritoeducacao@gmail.com / trocar-123
-- 18. janainalopes@prof.educacao.novalima.mg.gov.br / trocar-123
-- 19. elaine.braganca@educacao.mg.gov.br / trocar-123
-- 20. etnicoracial.semed@pnl.mg.gov.br / trocar-123
-- 21. danielleolicarsouza@yahoo.com.br / trocar-123
-- 22. escrituracao.semed@pnl.mg.gov.br / trocar-123

-- ============================================================
-- APÓS CRIAR TODOS OS AUTH USERS, RODE ISTO PARA CRIAR PERFIS:
-- ============================================================

-- Desabilitar FK temporariamente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- GESTOR (já existe, mas garantir)
UPDATE profiles SET tipo = 'admin', nome = 'NEIL MARQUES', ativo = true
WHERE email = 'neildalan@gmail.com';

-- Se não existir, criar:
INSERT INTO profiles (id, tipo, nome, email, ativo)
SELECT id, 'admin', 'NEIL MARQUES', email, true
FROM auth.users WHERE email = 'neildalan@gmail.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'neildalan@gmail.com');

-- CONDUTORES - criar perfil para cada auth user
DO $$
DECLARE
  usr RECORD;
BEGIN
  FOR usr IN SELECT id, email FROM auth.users WHERE email IN (
    'valeriorrocha2@gmail.com', 'rafaelsacramento584@yahoo.com',
    'divinorosa3@yahoo.com.br', 'herbert.nicholls@hotmail.com',
    'lula@gmail.com', 'sergin09@yahoo.com',
    'evandronicholls2@gmail.com', 'palitin@gmail.com',
    'paulopsantos62@gmail.com', 'jeidsonsilvavan@gmail.com',
    'ailtoncarlosrita@gmail.com', 'helderhsborges@gmail.com',
    'jorgesantos@gmail.com', 'gilbertojoga6@gmail.com'
  ) LOOP
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = usr.id) THEN
      INSERT INTO profiles (id, tipo, nome, email, telefone, ativo) VALUES (
        usr.id, 'condutor',
        CASE usr.email
          WHEN 'valeriorrocha2@gmail.com' THEN 'VALÉRIO RIBEIRO ROCHA'
          WHEN 'rafaelsacramento584@yahoo.com' THEN 'RAFAEL LUCAS SACRAMENTO'
          WHEN 'divinorosa3@yahoo.com.br' THEN 'DIVINO ROSA'
          WHEN 'herbert.nicholls@hotmail.com' THEN 'HERBERT MARTINS NICHOLLS'
          WHEN 'lula@gmail.com' THEN 'LUIZ CARLOS OLIVEIRA'
          WHEN 'sergin09@yahoo.com' THEN 'SÉRGIO ANTÔNIO DE SOUZA'
          WHEN 'evandronicholls2@gmail.com' THEN 'EVANDRO CAMBA NICHOLLS'
          WHEN 'palitin@gmail.com' THEN 'GERALDO GOMES DA SILVA'
          WHEN 'paulopsantos62@gmail.com' THEN 'PAULO PEREIRA DOS SANTOS'
          WHEN 'jeidsonsilvavan@gmail.com' THEN 'JEIDSON SANTOS SILVA'
          WHEN 'ailtoncarlosrita@gmail.com' THEN 'AILTON CARLOS SANTA RITA'
          WHEN 'helderhsborges@gmail.com' THEN 'HELDER HENRIQUE SILVA BORGES'
          WHEN 'jorgesantos@gmail.com' THEN 'JORGE EVANGELISTA SANTOS'
          WHEN 'gilbertojoga6@gmail.com' THEN 'GILBERTO RAIMUNDO SANTOS'
        END,
        usr.email,
        CASE usr.email
          WHEN 'valeriorrocha2@gmail.com' THEN '(31) 98718-8134'
          WHEN 'rafaelsacramento584@yahoo.com' THEN '(31) 98602-9596'
          WHEN 'divinorosa3@yahoo.com.br' THEN '(31) 98206-3309'
          WHEN 'herbert.nicholls@hotmail.com' THEN '(31) 98782-2800'
          WHEN 'lula@gmail.com' THEN '(31) 98662-8872'
          WHEN 'sergin09@yahoo.com' THEN '(31) 99265-3207'
          WHEN 'evandronicholls2@gmail.com' THEN '(31) 98531-4016'
          WHEN 'palitin@gmail.com' THEN '(31) 99940-5961'
          WHEN 'paulopsantos62@gmail.com' THEN '(31) 99353-6669'
          WHEN 'jeidsonsilvavan@gmail.com' THEN '(31) 99734-2716'
          WHEN 'ailtoncarlosrita@gmail.com' THEN '(31) 98690-4008'
          WHEN 'helderhsborges@gmail.com' THEN '(31) 99505-2295'
          WHEN 'jorgesantos@gmail.com' THEN '(31) 99597-2583'
          WHEN 'gilbertojoga6@gmail.com' THEN '(31) 97363-4386'
        END,
        true
      );
    END IF;
  END LOOP;
END $$;

-- SOLICITANTES - criar perfil para cada auth user
DO $$
DECLARE
  usr RECORD;
BEGIN
  FOR usr IN SELECT id, email FROM auth.users WHERE email IN (
    'inclusao.semed@pnl.mg.gov.br', 'renildamg@gmail.com',
    'erikabritoeducacao@gmail.com', 'janainalopes@prof.educacao.novalima.mg.gov.br',
    'elaine.braganca@educacao.mg.gov.br', 'etnicoracial.semed@pnl.mg.gov.br',
    'danielleolicarsouza@yahoo.com.br', 'escrituracao.semed@pnl.mg.gov.br'
  ) LOOP
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = usr.id) THEN
      INSERT INTO profiles (id, tipo, nome, email, telefone, unidade, setor, ativo) VALUES (
        usr.id, 'solicitante',
        CASE usr.email
          WHEN 'inclusao.semed@pnl.mg.gov.br' THEN 'MÁRCIA SERÁPIA'
          WHEN 'renildamg@gmail.com' THEN 'RENILDA GONÇALVES'
          WHEN 'erikabritoeducacao@gmail.com' THEN 'ÉRIKA CRISTINA DE BRITO BERNARDINO'
          WHEN 'janainalopes@prof.educacao.novalima.mg.gov.br' THEN 'Janaína Lopes de Jesus'
          WHEN 'elaine.braganca@educacao.mg.gov.br' THEN 'Elaine Bragança'
          WHEN 'etnicoracial.semed@pnl.mg.gov.br' THEN 'Silvânia Valentim'
          WHEN 'danielleolicarsouza@yahoo.com.br' THEN 'Danielle Cristina de Oliveira Carvalho Souza'
          WHEN 'escrituracao.semed@pnl.mg.gov.br' THEN 'Karla Sousa'
        END,
        usr.email,
        CASE usr.email
          WHEN 'inclusao.semed@pnl.mg.gov.br' THEN '31 99999-8888'
          WHEN 'renildamg@gmail.com' THEN '(31) 99209-2318'
          WHEN 'erikabritoeducacao@gmail.com' THEN '(31) 99870-7962'
          WHEN 'janainalopes@prof.educacao.novalima.mg.gov.br' THEN '(31) 98785-2938'
          WHEN 'elaine.braganca@educacao.mg.gov.br' THEN '(31) 99972-3058'
          WHEN 'etnicoracial.semed@pnl.mg.gov.br' THEN '(31) 98264-5101'
          WHEN 'danielleolicarsouza@yahoo.com.br' THEN '(31) 99337-2370'
          WHEN 'escrituracao.semed@pnl.mg.gov.br' THEN '(31) 31988-3117'
        END,
        CASE usr.email
          WHEN 'inclusao.semed@pnl.mg.gov.br' THEN 'SEMED'
          WHEN 'renildamg@gmail.com' THEN 'SEMED'
          WHEN 'erikabritoeducacao@gmail.com' THEN 'SEMED'
          WHEN 'janainalopes@prof.educacao.novalima.mg.gov.br' THEN 'EM EMÍLIA DE LIMA'
          WHEN 'elaine.braganca@educacao.mg.gov.br' THEN 'SEMED'
          WHEN 'etnicoracial.semed@pnl.mg.gov.br' THEN 'SEMED'
          WHEN 'danielleolicarsouza@yahoo.com.br' THEN 'SEMED'
          WHEN 'escrituracao.semed@pnl.mg.gov.br' THEN 'SEMED'
        END,
        CASE usr.email
          WHEN 'inclusao.semed@pnl.mg.gov.br' THEN 'EDUCAÇÃO INCLUSIVA'
          WHEN 'renildamg@gmail.com' THEN 'ESCRITURAÇÃO'
          WHEN 'erikabritoeducacao@gmail.com' THEN 'PEDAGOGIA'
          WHEN 'janainalopes@prof.educacao.novalima.mg.gov.br' THEN 'Outro'
          WHEN 'elaine.braganca@educacao.mg.gov.br' THEN 'ESCRITURAÇÃO'
          WHEN 'etnicoracial.semed@pnl.mg.gov.br' THEN 'ETINICOS'
          WHEN 'danielleolicarsouza@yahoo.com.br' THEN 'EDUCAÇÃO INCLUSIVA'
          WHEN 'escrituracao.semed@pnl.mg.gov.br' THEN 'ESCRITURAÇÃO'
        END,
        true
      );
    END IF;
  END LOOP;
END $$;

-- Reabilitar FK e RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- TABELAS DE APOIO
INSERT INTO tabelas_apoio (unidade, setor, email) VALUES
  ('SEMED', 'EDUCAÇÃO INCLUSIVA', 'inclusao.semed@pnl.mg.gov.br'),
  ('SEMED', 'ESCRITURAÇÃO', 'escrituracao.semed@pnl.mg.gov.br'),
  ('SEMED', 'PEDAGOGIA', 'erikabritoeducacao@gmail.com'),
  ('SEMED', 'ETINICOS', 'etnicoracial.semed@pnl.mg.gov.br'),
  ('EM EMÍLIA DE LIMA', 'Outro', 'janainalopes@prof.educacao.novalima.mg.gov.br')
ON CONFLICT DO NOTHING;

-- LOCAIS
INSERT INTO locais (nome) VALUES
  ('SEMED'), ('EM EMÍLIA DE LIMA'), ('EM THEREZINHA'),
  ('EM PAULO FREIRE'), ('EM RUBEM BRAGA'), ('EM TERESA'),
  ('EM GRACIOSA'), ('EM ALTO BARREIRO'), ('EM NORTE DA SERRA'),
  ('CMB'), ('PMBH'), ('GOVERNO DO ESTADO'), ('OUTRO')
ON CONFLICT (nome) DO NOTHING;

-- VERIFICAR
SELECT tipo, COUNT(*) as total FROM profiles GROUP BY tipo;
