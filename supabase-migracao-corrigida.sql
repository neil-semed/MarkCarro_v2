-- ============================================================
-- MARKCARRO - MIGRAÇÃO CORRIGIDA (v2)
-- Esta versão NÃO usa UUIDs hardcoded.
-- Rodar APÓS criar os usuários no Auth (Dashboard ou Admin API)
-- ============================================================

-- 1. DESABILITAR RLS E FK TEMPORARIAMENTE
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. LIMPAR DADOS EXISTENTES (opcional - comentar se quiser manter)
-- DELETE FROM profiles;
-- DELETE FROM tabelas_apoio;
-- DELETE FROM locais;

-- 3. CRIAR PERFIS VINCULADOS AOS AUTH USERS POR EMAIL
-- O trigger handle_new_user já cria perfis básicos no signup.
-- Este script ATUALIZA os perfis com dados completos.

-- GESTOR / ADMIN
UPDATE profiles SET 
  tipo = 'admin',
  nome = 'NEIL MARQUES',
  telefone = NULL,
  ativo = true
WHERE email = 'neildalan@gmail.com';

-- Se não existir (usuário ainda não fez signup), criar quando ele se cadastrar
-- O trigger cuida disso automaticamente.

-- CONDUTORES - Atualizar perfis existentes
UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'VALÉRIO RIBEIRO ROCHA',
  telefone = '(31) 98718-8134',
  placa = 'PWR-4R46',
  modelo = 'FOX',
  capacidade = 4,
  categoria = 'Motorista',
  cnh = '3909724640',
  validade_cnh = '2034-03-31',
  ativo = true
WHERE email = 'valeriorrocha2@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'RAFAEL LUCAS SACRAMENTO',
  telefone = '(31) 98602-9596',
  placa = 'QSF-9H46',
  modelo = 'VAN',
  capacidade = 15,
  categoria = 'Motorista',
  cnh = '4488243092',
  validade_cnh = '2035-04-15',
  ativo = true
WHERE email = 'rafaelsacramento584@yahoo.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'DIVINO ROSA',
  telefone = '(31) 98206-3309',
  placa = 'PYH-0047',
  modelo = 'PÁLIO',
  capacidade = 4,
  categoria = 'Motorista',
  cnh = '1368833977',
  validade_cnh = '2030-06-10',
  ativo = true
WHERE email = 'divinorosa3@yahoo.com.br';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'HERBERT MARTINS NICHOLLS',
  telefone = '(31) 98782-2800',
  placa = 'HJR-2429',
  modelo = 'MICRO_ÔNIBUS',
  capacidade = 32,
  categoria = 'Motorista',
  cnh = '3477292588',
  validade_cnh = '2032-10-17',
  ativo = true
WHERE email = 'herbert.nicholls@hotmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'LUIZ CARLOS OLIVEIRA',
  telefone = '(31) 98662-8872',
  placa = 'QQY-9A46',
  modelo = 'FIORINO',
  capacidade = 1,
  categoria = 'Motorista',
  cnh = '2437256663',
  validade_cnh = '2027-07-01',
  ativo = true
WHERE email = 'lula@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'SÉRGIO ANTÔNIO DE SOUZA',
  telefone = '(31) 99265-3207',
  placa = 'FTL-5C17',
  modelo = 'DOBLÔ',
  capacidade = 6,
  categoria = 'Motorista',
  cnh = '21055385030',
  validade_cnh = '2028-08-10',
  ativo = true
WHERE email = 'sergin09@yahoo.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'EVANDRO CAMBA NICHOLLS',
  telefone = '(31) 98531-4016',
  placa = 'QVJ-9G72',
  modelo = 'PICK-4P',
  capacidade = 4,
  categoria = 'Motorista',
  cnh = '1152848509',
  validade_cnh = '2030-10-09',
  ativo = true
WHERE email = 'evandronicholls2@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'GERALDO GOMES DA SILVA',
  telefone = '(31) 99940-5961',
  placa = 'HEM-7F60',
  modelo = 'MICRO_ÔNIBUS',
  capacidade = 32,
  categoria = 'Motorista',
  cnh = '1776110920',
  validade_cnh = '2031-05-17',
  ativo = true
WHERE email = 'palitin@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'PAULO PEREIRA DOS SANTOS',
  telefone = '(31) 99353-6669',
  placa = 'GSV-5C26',
  modelo = 'MICRO_ÔNIBUS',
  capacidade = 32,
  categoria = 'Motorista',
  cnh = '2200651719',
  validade_cnh = '2028-06-06',
  ativo = true
WHERE email = 'paulopsantos62@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'JEIDSON SANTOS SILVA',
  telefone = '(31) 99734-2716',
  placa = 'OWX-2815',
  modelo = 'VAN',
  capacidade = 15,
  categoria = 'Motorista',
  cnh = '4088705605',
  validade_cnh = '2033-12-07',
  ativo = true
WHERE email = 'jeidsonsilvavan@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'AILTON CARLOS SANTA RITA',
  telefone = '(31) 98690-4008',
  placa = 'PVK-6456',
  modelo = 'VAN',
  capacidade = 15,
  categoria = 'Motorista',
  cnh = '2562154251',
  validade_cnh = '2028-08-09',
  ativo = true
WHERE email = 'ailtoncarlosrita@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'HELDER HENRIQUE SILVA BORGES',
  telefone = '(31) 99505-2295',
  placa = 'QKR-4D13',
  modelo = 'VAN',
  capacidade = 15,
  categoria = 'Motorista',
  cnh = '5641312750',
  validade_cnh = '2032-07-21',
  ativo = true
WHERE email = 'helderhsborges@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'JORGE EVANGELISTA SANTOS',
  telefone = '(31) 99597-2583',
  placa = 'HDH-3D62',
  modelo = 'IDEA',
  capacidade = 4,
  categoria = 'Motorista',
  cnh = '2437817698',
  validade_cnh = '2029-09-18',
  ativo = true
WHERE email = 'jorgesantos@gmail.com';

UPDATE profiles SET 
  tipo = 'condutor',
  nome = 'GILBERTO RAIMUNDO SANTOS',
  telefone = '(31) 97363-4386',
  placa = 'HIE-4152',
  modelo = 'FIETA',
  capacidade = 4,
  categoria = 'Motorista',
  cnh = '3445406855',
  validade_cnh = '2026-12-10',
  ativo = true
WHERE email = 'gilbertojoga6@gmail.com';

-- SOLICITANTES - Atualizar perfis existentes
UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'MÁRCIA SERÁPIA',
  telefone = '31 99999-8888',
  unidade = 'SEMED',
  setor = 'EDUCAÇÃO INCLUSIVA',
  ativo = true
WHERE email = 'inclusao.semed@pnl.mg.gov.br';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'RENILDA GONÇALVES',
  telefone = '(31) 99209-2318',
  unidade = 'SEMED',
  setor = 'ESCRITURAÇÃO',
  ativo = true
WHERE email = 'renildamg@gmail.com';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'ÉRIKA CRISTINA DE BRITO BERNARDINO',
  telefone = '(31) 99870-7962',
  unidade = 'SEMED',
  setor = 'PEDAGOGIA',
  ativo = true
WHERE email = 'erikabritoeducacao@gmail.com';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'Janaína Lopes de Jesus',
  telefone = '(31) 98785-2938',
  unidade = 'EM EMÍLIA DE LIMA',
  setor = 'Outro',
  ativo = true
WHERE email = 'janainalopes@prof.educacao.novalima.mg.gov.br';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'Elaine Bragança',
  telefone = '(31) 99972-3058',
  unidade = 'SEMED',
  setor = 'ESCRITURAÇÃO',
  ativo = true
WHERE email = 'elaine.braganca@educacao.mg.gov.br';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'Silvânia Valentim',
  telefone = '(31) 98264-5101',
  unidade = 'SEMED',
  setor = 'ETINICOS',
  ativo = true
WHERE email = 'etnicoracial.semed@pnl.mg.gov.br';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'Danielle Cristina de Oliveira Carvalho Souza',
  telefone = '(31) 99337-2370',
  unidade = 'SEMED',
  setor = 'EDUCAÇÃO INCLUSIVA',
  ativo = true
WHERE email = 'danielleolicarsouza@yahoo.com.br';

UPDATE profiles SET 
  tipo = 'solicitante',
  nome = 'Karla Sousa',
  telefone = '(31) 31988-3117',
  unidade = 'SEMED',
  setor = 'ESCRITURAÇÃO',
  ativo = true
WHERE email = 'escrituracao.semed@pnl.mg.gov.br';

-- 4. REABILITAR FK E RLS
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. TABELAS DE APOIO
INSERT INTO tabelas_apoio (unidade, setor, email) VALUES
  ('SEMED', 'EDUCAÇÃO INCLUSIVA', 'inclusao.semed@pnl.mg.gov.br'),
  ('SEMED', 'ESCRITURAÇÃO', 'escrituracao.semed@pnl.mg.gov.br'),
  ('SEMED', 'PEDAGOGIA', 'erikabritoeducacao@gmail.com'),
  ('SEMED', 'ETINICOS', 'etnicoracial.semed@pnl.mg.gov.br'),
  ('EM EMÍLIA DE LIMA', 'Outro', 'janainalopes@prof.educacao.novalima.mg.gov.br')
ON CONFLICT DO NOTHING;

-- 6. LOCAIS
INSERT INTO locais (nome) VALUES
  ('SEMED'), ('EM EMÍLIA DE LIMA'), ('EM THEREZINHA'),
  ('EM PAULO FREIRE'), ('EM RUBEM BRAGA'), ('EM TERESA'),
  ('EM GRACIOSA'), ('EM ALTO BARREIRO'), ('EM NORTE DA SERRA'),
  ('CMB'), ('PMBH'), ('GOVERNO DO ESTADO'), ('OUTRO')
ON CONFLICT (nome) DO NOTHING;

-- 7. VERIFICAR DADOS INSERIDOS
SELECT tipo, COUNT(*) as total FROM profiles GROUP BY tipo;
SELECT COUNT(*) as total_locais FROM locais;
SELECT COUNT(*) as total_apoio FROM tabelas_apoio;