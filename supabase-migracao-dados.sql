-- ============================================================
-- MARCARRO - MIGRAÇÃO COMPLETA (VERSÃO CORRIGIDA)
-- Rode este SQL no Editor SQL do Supabase
-- ============================================================

-- 1. DESABILITAR RLS E FK TEMPORARIAMENTE
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. LIMPAR DADOS EXISTENTES
DELETE FROM profiles;
DELETE FROM tabelas_apoio;
DELETE FROM locais;

-- 3. INSERIR GESTOR
INSERT INTO profiles (id, tipo, nome, email, telefone, ativo)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'NEIL MARQUES',
  'neildalan@gmail.com',
  NULL,
  true
);

-- 4. INSERIR CONDUTORES
INSERT INTO profiles (id, tipo, nome, email, telefone, placa, modelo, capacidade, categoria, cnh, validade_cnh, ativo)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'condutor', 'VALÉRIO RIBEIRO ROCHA', 'valeriorrocha2@gmail.com', '(31) 98718-8134', 'PWR-4R46', 'FOX', '4L', 'Motorista', '3909724640', '2034-03-31', true),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'condutor', 'RAFAEL LUCAS SACRAMENTO', 'rafaelsacramento584@yahoo.com', '(31) 98602-9596', 'QSF-9H46', 'VAN', '15L', 'Motorista', '4488243092', '2035-04-15', true),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'condutor', 'DIVINO ROSA', 'divinorosa3@yahoo.com.br', '(31) 98206-3309', 'PYH-0047', 'PÁLIO', '4L', 'Motorista', '1368833977', '2030-06-10', true),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'condutor', 'HERBERT MARTINS NICHOLLS', 'herbert.nicholls@hotmail.com', '(31) 98782-2800', 'HJR-2429', 'MICRO_ÔNIBUS', '32L', 'Motorista', '3477292588', '2032-10-17', true),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'condutor', 'LUIZ CARLOS OLIVEIRA', 'lula@gmail.com', '(31) 98662-8872', 'QQY-9A46', 'FIORINO', '1L', 'Motorista', '2437256663', '2027-07-01', true),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'condutor', 'SÉRGIO ANTÔNIO DE SOUZA', 'sergin09@yahoo.com', '(31) 99265-3207', 'FTL-5C17', 'DOBLÔ', '6L', 'Motorista', '21055385030', '2028-08-10', true),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'condutor', 'EVANDRO CAMBA NICHOLLS', 'evandronicholls2@gmail.com', '(31) 98531-4016', 'QVJ-9G72', 'PICK-4P', '4L', 'Motorista', '1152848509', '2030-10-09', true),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'condutor', 'GERALDO GOMES DA SILVA', 'palitin@gmail.com', '(31) 99940-5961', 'HEM-7F60', 'MICRO_ÔNIBUS', '32L', 'Motorista', '1776110920', '2031-05-17', true),
  ('10000000-0000-0000-0000-000000000009'::uuid, 'condutor', 'PAULO PEREIRA DOS SANTOS', 'paulopsantos62@gmail.com', '(31) 99353-6669', 'GSV-5C26', 'MICRO_ÔNIBUS', '32L', 'Motorista', '2200651719', '2028-06-06', true),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'condutor', 'JEIDSON SANTOS SILVA', 'jeidsonsilvavan@gmail.com', '(31) 99734-2716', 'OWX-2815', 'VAN', '15L', 'Motorista', '4088705605', '2033-12-07', true),
  ('10000000-0000-0000-0000-000000000011'::uuid, 'condutor', 'AILTON CARLOS SANTA RITA', 'ailtoncarlosrita@gmail.com', '(31) 98690-4008', 'PVK-6456', 'VAN', '15L', 'Motorista', '2562154251', '2028-08-09', true),
  ('10000000-0000-0000-0000-000000000012'::uuid, 'condutor', 'HELDER HENRIQUE SILVA BORGES', 'helderhsborges@gmail.com', '(31) 99505-2295', 'QKR-4D13', 'VAN', '15L', 'Motorista', '5641312750', '2032-07-21', true),
  ('10000000-0000-0000-0000-000000000013'::uuid, 'condutor', 'JORGE EVANGELISTA SANTOS', 'jorgesantos@gmail.com', '(31) 99597-2583', 'HDH-3D62', 'IDEA', '4L', 'Motorista', '2437817698', '2029-09-18', true),
  ('10000000-0000-0000-0000-000000000014'::uuid, 'condutor', 'GILBERTO RAIMUNDO SANTOS', 'gilbertojoga6@gmail.com', '(31) 97363-4386', 'HIE-4152', 'FIETA', '4L', 'Motorista', '3445406855', '2026-12-10', true);

-- 5. INSERIR SOLICITANTES
INSERT INTO profiles (id, tipo, nome, email, telefone, unidade, setor, ativo)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, 'solicitante', 'MÁRCIA SERÁPIA', 'inclusao.semed@pnl.mg.gov.br', '31 99999-8888', 'SEMED', 'EDUCAÇÃO INCLUSIVA', true),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'solicitante', 'RENILDA GONÇALVES', 'renildamg@gmail.com', '(31) 99209-2318', 'SEMED', 'ESCRITURAÇÃO', true),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'solicitante', 'ÉRIKA CRISTINA DE BRITO BERNARDINO', 'erikabritoeducacao@gmail.com', '(31) 99870-7962', 'SEMED', 'PEDAGOGIA', true),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'solicitante', 'Janaína Lopes de Jesus', 'janainalopes@prof.educacao.novalima.mg.gov.br', '(31) 98785-2938', 'EM EMÍLIA DE LIMA', 'Outro', true),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'solicitante', 'Elaine Bragança', 'elaine.braganca@educacao.mg.gov.br', '(31) 99972-3058', 'SEMED', 'ESCRITURAÇÃO', true),
  ('20000000-0000-0000-0000-000000000006'::uuid, 'solicitante', 'Silvânia Valentim', 'etnicoracial.semed@pnl.mg.gov.br', '(31) 98264-5101', 'SEMED', 'ETINICOS', true),
  ('20000000-0000-0000-0000-000000000007'::uuid, 'solicitante', 'Danielle Cristina de Oliveira Carvalho Souza', 'danielleolicarsouza@yahoo.com.br', '(31) 99337-2370', 'SEMED', 'EDUCAÇÃO INCLUSIVA', true),
  ('20000000-0000-0000-0000-000000000008'::uuid, 'solicitante', 'Karla Sousa', 'escrituracao.semed@pnl.mg.gov.br', '(31) 31988-3117', 'SEMED', 'ESCRITURAÇÃO', true);

-- 6. INSERIR TABELAS DE APOIO
INSERT INTO tabelas_apoio (unidade, setor, email) VALUES
  ('SEMED', 'EDUCAÇÃO INCLUSIVA', 'inclusao.semed@pnl.mg.gov.br'),
  ('SEMED', 'ESCRITURAÇÃO', 'escrituracao.semed@pnl.mg.gov.br'),
  ('SEMED', 'PEDAGOGIA', 'erikabritoeducacao@gmail.com'),
  ('SEMED', 'ETINICOS', 'etnicoracial.semed@pnl.mg.gov.br'),
  ('EM EMÍLIA DE LIMA', 'Outro', 'janainalopes@prof.educacao.novalima.mg.gov.br');

-- 7. INSERIR LOCAIS
INSERT INTO locais (nome) VALUES
  ('SEMED'),
  ('EM EMÍLIA DE LIMA'),
  ('EM THEREZINHA'),
  ('EM PAULO FREIRE'),
  ('EM RUBEM BRAGA'),
  ('EM TERESA'),
  ('EM GRACIOSA'),
  ('EM ALTO BARREIRO'),
  ('EM NORTE DA SERRA'),
  ('CMB'),
  ('PMBH'),
  ('GOVERNO DO ESTADO'),
  ('OUTRO');

-- 8. REABILITAR FK E RLS
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 9. VERIFICAR DADOS INSERIDOS
SELECT tipo, COUNT(*) as total FROM profiles GROUP BY tipo;
SELECT COUNT(*) as total_locais FROM locais;
SELECT COUNT(*) as total_apoio FROM tabelas_apoio;
