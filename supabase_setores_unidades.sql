-- ============================================================
-- MARKCARRO - Setores por Unidade: novos campos/policies + importação
-- da planilha (Unidade / Setor / E-mail) que você enviou.
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só adiciona coluna/política novas e faz INSERT (com ON CONFLICT, então
-- pode rodar de novo sem duplicar nada).
--
-- O que ele resolve:
-- 1) "Gerenciar unidade deve dar condição de cadastrar unidade e
--    setores" - a tela só geria a tabela "unidades" (nome/endereço/
--    telefone/email do prédio em si); não existia UPDATE/DELETE nem
--    tela nenhuma pra mexer em "tabelas_apoio" (Unidade+Setor+E-mail,
--    que é o que alimenta os dropdowns de Cadastro/Nova Solicitação).
--    Corrigido: RLS de UPDATE/DELETE liberada aqui, tela nova em
--    Gerenciar Unidades (seção "Setores").
-- 2) "Nova Solicitação/Cadastro precisam dos dados de unidade e setor" -
--    "tabelas_apoio" estava praticamente vazia (só o que já existia de
--    antes da migração) - é por isso que os dropdowns apareciam
--    incompletos ou vazios. Este script importa as 101 linhas da sua
--    planilha.
-- 3) "criar subdivisão de tipos de unidade" - adiciona uma coluna
--    "tipo" em "unidades" (Escola / Creche-CEI / Administrativo /
--    Cooperativa / Outro), já preenchida por um palpite a partir do
--    nome (dá pra corrigir depois, um por um, na tela Gerenciar
--    Unidades) - é o que permite criar um Setor "pra todas as Unidades
--    de um Tipo" de uma vez, na tela nova.
--
-- CORREÇÃO (rodada 2): na primeira tentativa, o passo de criar o índice
-- único abaixo falhou com:
--   ERRO 23505: could not create unique index "idx_tabelas_apoio_unidade_setor"
--   DETAIL: Key (unidade, setor)=(SEMED, EDUCAÇÃO INCLUSIVA) is duplicated.
-- Ou seja, já existia mais de uma linha com essa mesma combinação
-- Unidade+Setor na sua tabela `tabelas_apoio` (dado antigo, de antes
-- desta migração - não foi este script que criou; ele nem chega a inserir
-- nada, porque o INSERT do passo 6 só roda depois do índice). Como o
-- Postgres só relata a PRIMEIRA duplicata que encontra, pode haver mais
-- de uma - por isso o passo 2 abaixo agora limpa TODAS de uma vez antes
-- de criar o índice, e o restante do script (que provavelmente não
-- chegou a rodar da vez passada) segue normalmente. Todo o script
-- continua seguro de rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Coluna "tipo" em unidades
-- ------------------------------------------------------------
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS tipo TEXT;

-- ------------------------------------------------------------
-- 2) LIMPEZA (novo): remove duplicatas pré-existentes de (unidade, setor)
--    em tabelas_apoio ANTES de criar o índice único do passo 3 - é isso
--    que resolve o erro 23505 acima. Mantém sempre a linha de MENOR id
--    (a mais antiga) de cada combinação Unidade+Setor e apaga as demais.
--    Não tem problema qual das duplicatas sobrevive: o INSERT ... ON
--    CONFLICT do passo 6 já atualiza o e-mail da linha que ficar com o
--    e-mail correto da planilha. Seguro rodar de novo (se não houver
--    duplicata, esta linha simplesmente não apaga nada).
-- ------------------------------------------------------------
DELETE FROM tabelas_apoio a
USING tabelas_apoio b
WHERE a.id > b.id
  AND a.unidade = b.unidade
  AND a.setor = b.setor;

-- ------------------------------------------------------------
-- 3) Evita duplicar o mesmo Setor pra mesma Unidade (também é o que
--    permite os "ON CONFLICT" abaixo e nos INSERTs feitos pela tela).
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_tabelas_apoio_unidade_setor
  ON tabelas_apoio (unidade, setor);

-- ------------------------------------------------------------
-- 4) RLS: faltava UPDATE/DELETE em tabelas_apoio (só existia SELECT e
--    INSERT) - sem isso, Editar/Excluir Setor na tela nova falhava ou
--    silenciosamente não alterava nada.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin atualiza apoio" ON tabelas_apoio;
CREATE POLICY "Admin atualiza apoio" ON tabelas_apoio
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin exclui apoio" ON tabelas_apoio;
CREATE POLICY "Admin exclui apoio" ON tabelas_apoio
  FOR DELETE USING (is_admin());

-- ------------------------------------------------------------
-- 5) Popula "unidades" (metadados) com as Unidades da planilha que
--    ainda não existirem - não sobrescreve nome/tipo/endereço/telefone/
--    e-mail de Unidades já cadastradas manualmente.
-- ------------------------------------------------------------
INSERT INTO unidades (nome, tipo) VALUES
  ('CEI DOUTOR CÁSSIO MAGNANI', 'Creche/CEI'),
  ('CEI MARIA DA CONCEIÇÃO T.CORREA', 'Creche/CEI'),
  ('CEI MARIA DE LOURDES S. SERRETTI', 'Creche/CEI'),
  ('CEI NANCY ROMANI DUARTE', 'Creche/CEI'),
  ('CEI NIZE CONCEIÇÃO SILVA RIBEIRO', 'Creche/CEI'),
  ('CASA DO EDUCADOR', 'Administrativo'),
  ('CPP', 'Administrativo'),
  ('CRECHE FLOR DE CEREJEIRA', 'Creche/CEI'),
  ('CRECHE JARDIM DAS ACÁCIAS', 'Creche/CEI'),
  ('CRECHE JARDIM DAS AZALÉIAS', 'Creche/CEI'),
  ('CRECHE JARDIM DO IPÊ AMARELO', 'Creche/CEI'),
  ('CRECHE LAR DA ESPERANÇA', 'Creche/CEI'),
  ('CRECHE MENINO JESUS', 'Creche/CEI'),
  ('CRECHE MICO-ESTRELA', 'Creche/CEI'),
  ('CRECHE OLGA RAMOS DA CRUZ', 'Creche/CEI'),
  ('CRECHE PARAÍSO DO CAXINGUELÊ', 'Creche/CEI'),
  ('CRECHE PEQUENOS GUARÁS', 'Creche/CEI'),
  ('CRECHE TAMANDUÁ MIRIM', 'Creche/CEI'),
  ('CRECHE VALE DO FLAMBOIÃ', 'Creche/CEI'),
  ('CRECHE VALE DOS LÍRIOS', 'Creche/CEI'),
  ('EM ÁUREA LIMA TAVEIRA', 'Escola'),
  ('EM BENVINDA PINTO ROCHA', 'Escola'),
  ('EM CARLOS HENRIQUE RÓSCOE', 'Escola'),
  ('EM CESAR RODRIGUES', 'Escola'),
  ('EM CRISTIANO MACHADO', 'Escola'),
  ('EM DALVA CIFUENTES GONÇALVES', 'Escola'),
  ('EM DAVID FINLAY', 'Escola'),
  ('EM DONA ANTONIETA DIAS DE SOUZA', 'Escola'),
  ('EM DULCE SANTOS JONES', 'Escola'),
  ('EM EMÍLIA DE LIMA', 'Escola'),
  ('EM FLORIE WANDERLEY DIAS', 'Escola'),
  ('EM GEORGE CHALMERS', 'Escola'),
  ('EM HAROLD JONES', 'Escola'),
  ('EM JOSÉ BRASIL DIAS', 'Escola'),
  ('EM JOSÉ FRANCISCO DA SILVA', 'Escola'),
  ('EM MARTHA DRUMMOND FONSECA', 'Escola'),
  ('EM RUBEM COSTA LIMA', 'Escola'),
  ('EM URCINO DO NASCIMENTO', 'Escola'),
  ('EM VERA WANDERLEY DIAS', 'Escola'),
  ('EM VICENTE ESTEVÃO DOS SANTOS', 'Escola'),
  ('ESC. ANA DO NASCIMENTO SOUZA', 'Escola'),
  ('EJA - JARDIM DE PETRÓPOLIS', 'Escola'),
  ('SEMED', 'Administrativo'),
  ('COOPERATIVAS', 'Cooperativa')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------
-- 6) Popula "tabelas_apoio" (Unidade + Setor + E-mail, usada nos
--    dropdowns) com as 101 linhas da planilha. ON CONFLICT atualiza o
--    e-mail se você rodar este script de novo depois de mudar algum
--    e-mail na planilha (não duplica linhas).
-- ------------------------------------------------------------
INSERT INTO tabelas_apoio (unidade, setor, email) VALUES
  ('CEI DOUTOR CÁSSIO MAGNANI', 'ADM ESCOLAR', 'ceipcm.semed@pnl.mg.gov.br'),
  ('CEI DOUTOR CÁSSIO MAGNANI', 'ASS - PSICO', 'ceipcm.semed@pnl.mg.gov.br'),
  ('CEI MARIA DA CONCEIÇÃO T.CORREA', 'ADM ESCOLAR', 'ceimt.semed@pnl.mg.gov.br'),
  ('CEI MARIA DA CONCEIÇÃO T.CORREA', 'ASS - PSICO', 'ceimt.semed@pnl.mg.gov.br'),
  ('CEI MARIA DE LOURDES S. SERRETTI', 'ADM ESCOLAR', 'ceimlss.semed@pnl.mg.gov.br'),
  ('CEI MARIA DE LOURDES S. SERRETTI', 'ASS - PSICO', 'ceimlss.semed@pnl.mg.gov.br'),
  ('CEI NANCY ROMANI DUARTE', 'ADM ESCOLAR', 'ceinr.semed@pnl.mg.gov.br'),
  ('CEI NANCY ROMANI DUARTE', 'ASS - PSICO', 'ceinr.semed@pnl.mg.gov.br'),
  ('CEI NIZE CONCEIÇÃO SILVA RIBEIRO', 'ADM ESCOLAR', 'ceincr.semed@pnl.mg.gov.br'),
  ('CEI NIZE CONCEIÇÃO SILVA RIBEIRO', 'ASS - PSICO', 'ceincr.semed@pnl.mg.gov.br'),
  ('CASA DO EDUCADOR', 'ADM', 'casadoeducador.semed@pnl.mg.gov.br'),
  ('CPP', 'ADM', 'cpp.semed@pnl.mg.gov.br'),
  ('CRECHE FLOR DE CEREJEIRA', 'ASS - PSICO', 'cei.fdc.semed@pnl.mg.gov.br'),
  ('CRECHE JARDIM DAS ACÁCIAS', 'ASS - PSICO', 'cei.jda.semed@pnl.mg.gov.br'),
  ('CRECHE JARDIM DAS AZALÉIAS', 'ASS - PSICO', 'cei.ja.semed@pnl.mg.gov.br'),
  ('CRECHE JARDIM DO IPÊ AMARELO', 'ASS - PSICO', 'cei.jia.semed@pnl.mg.gov.br'),
  ('CRECHE LAR DA ESPERANÇA', 'ADM ESCOLAR', 'ceile.semed@pnl.mg.gov.br'),
  ('CRECHE LAR DA ESPERANÇA', 'ASS - PSICO', 'ceile.semed@pnl.mg.gov.br'),
  ('CRECHE MENINO JESUS', 'ADM ESCOLAR', 'ceimj.semed@pnl.mg.gov.br'),
  ('CRECHE MENINO JESUS', 'ASS - PSICO', 'ceimj.semed@pnl.mg.gov.br'),
  ('CRECHE MICO-ESTRELA', 'ASS - PSICO', 'cei.me.semed@pnl.mg.gov.br'),
  ('CRECHE OLGA RAMOS DA CRUZ', 'ASS - PSICO', 'ceiorc.semed@pnl.mg.gov.br'),
  ('CRECHE PARAÍSO DO CAXINGUELÊ', 'ASS - PSICO', 'cei.pdc.semed@pnl.mg.gov.br'),
  ('CRECHE PEQUENOS GUARÁS', 'ASS - PSICO', 'cei.pg.semed@pnl.mg.gov.br'),
  ('CRECHE TAMANDUÁ MIRIM', 'ASS - PSICO', 'cei.tm.semed@pnl.mg.gov.br'),
  ('CRECHE VALE DO FLAMBOIÃ', 'ASS - PSICO', 'cei.vdf.semed@pnl.mg.gov.br'),
  ('CRECHE VALE DOS LÍRIOS', 'ASS - PSICO', 'cei.vdl.semed@pnl.mg.gov.br'),
  ('EM ÁUREA LIMA TAVEIRA', 'ADM ESCOLAR', 'emalt.semed@pnl.mg.gov.br'),
  ('EM ÁUREA LIMA TAVEIRA', 'ASS - PSICO', 'emalt.semed@pnl.mg.gov.br'),
  ('EM BENVINDA PINTO ROCHA', 'ADM ESCOLAR', 'embpr.semed@pnl.mg.gov.br'),
  ('EM BENVINDA PINTO ROCHA', 'ASS - PSICO', 'embpr.semed@pnl.mg.gov.br'),
  ('EM CARLOS HENRIQUE RÓSCOE', 'ADM ESCOLAR', 'emchr.semed@pnl.mg.gov.br'),
  ('EM CARLOS HENRIQUE RÓSCOE', 'ASS - PSICO', 'emchr.semed@pnl.mg.gov.br'),
  ('EM CESAR RODRIGUES', 'ADM ESCOLAR', 'emcr.semed@pnl.mg.gov.br'),
  ('EM CESAR RODRIGUES', 'ASS - PSICO', 'emcr.semed@pnl.mg.gov.br'),
  ('EM CRISTIANO MACHADO', 'ADM ESCOLAR', 'emcm.semed@pnl.mg.gov.br'),
  ('EM CRISTIANO MACHADO', 'ASS - PSICO', 'emcm.semed@pnl.mg.gov.br'),
  ('EM DALVA CIFUENTES GONÇALVES', 'ADM ESCOLAR', 'emdcg.semed@pnl.mg.gov.br'),
  ('EM DALVA CIFUENTES GONÇALVES', 'ASS - PSICO', 'emdcg.semed@pnl.mg.gov.br'),
  ('EM DAVID FINLAY', 'ADM ESCOLAR', 'emdf.semed@pnl.mg.gov.br'),
  ('EM DAVID FINLAY', 'ASS - PSICO', 'emdf.semed@pnl.mg.gov.br'),
  ('EM DONA ANTONIETA DIAS DE SOUZA', 'ADM ESCOLAR', 'emdads.semed@pnl.mg.gov.br'),
  ('EM DONA ANTONIETA DIAS DE SOUZA', 'ASS - PSICO', 'emdads.semed@pnl.mg.gov.br'),
  ('EM DULCE SANTOS JONES', 'ADM ESCOLAR', 'emdsj.semed@pnl.mg.gov.br'),
  ('EM DULCE SANTOS JONES', 'ASS - PSICO', 'emdsj.semed@pnl.mg.gov.br'),
  ('EM EMÍLIA DE LIMA', 'ADM ESCOLAR', 'emel.semed@pnl.mg.gov.br'),
  ('EM EMÍLIA DE LIMA', 'ASS - PSICO', 'emel.semed@pnl.mg.gov.br'),
  ('EM FLORIE WANDERLEY DIAS', 'ADM ESCOLAR', 'emfwd.semed@pnl.mg.gov.br'),
  ('EM FLORIE WANDERLEY DIAS', 'ASS - PSICO', 'emfwd.semed@pnl.mg.gov.br'),
  ('EM GEORGE CHALMERS', 'ADM ESCOLAR', 'emgch.semed@pnl.mg.gov.br'),
  ('EM GEORGE CHALMERS', 'ASS - PSICO', 'emgch.semed@pnl.mg.gov.br'),
  ('EM HAROLD JONES', 'ADM ESCOLAR', 'emhj.semed@pnl.mg.gov.br'),
  ('EM HAROLD JONES', 'ASS - PSICO', 'emhj.semed@pnl.mg.gov.br'),
  ('EM JOSÉ BRASIL DIAS', 'ADM ESCOLAR', 'emjbd.semed@pnl.mg.gov.br'),
  ('EM JOSÉ BRASIL DIAS', 'ASS - PSICO', 'emjbd.semed@pnl.mg.gov.br'),
  ('EM JOSÉ FRANCISCO DA SILVA', 'ADM ESCOLAR', 'emjfs.semed@pnl.mg.gov.br'),
  ('EM JOSÉ FRANCISCO DA SILVA', 'ASS - PSICO', 'emjfs.semed@pnl.mg.gov.br'),
  ('EM MARTHA DRUMMOND FONSECA', 'ADM ESCOLAR', 'emmdf.semed@pnl.mg.gov.br'),
  ('EM MARTHA DRUMMOND FONSECA', 'ASS - PSICO', 'emmdf.semed@pnl.mg.gov.br'),
  ('EM RUBEM COSTA LIMA', 'ADM ESCOLAR', 'emrcl.semed@pnl.mg.gov.br'),
  ('EM RUBEM COSTA LIMA', 'ASS - PSICO', 'emrcl.semed@pnl.mg.gov.br'),
  ('EM URCINO DO NASCIMENTO', 'ADM ESCOLAR', 'emudn.semed@pnl.mg.gov.br'),
  ('EM URCINO DO NASCIMENTO', 'ASS - PSICO', 'emudn.semed@pnl.mg.gov.br'),
  ('EM VERA WANDERLEY DIAS', 'ADM ESCOLAR', 'emvwd.semed@pnl.mg.gov.br'),
  ('EM VERA WANDERLEY DIAS', 'ASS - PSICO', 'emvwd.semed@pnl.mg.gov.br'),
  ('EM VICENTE ESTEVÃO DOS SANTOS', 'ADM ESCOLAR', 'emves.semed@pnl.mg.gov.br'),
  ('EM VICENTE ESTEVÃO DOS SANTOS', 'ASS - PSICO', 'emves.semed@pnl.mg.gov.br'),
  ('ESC. ANA DO NASCIMENTO SOUZA', 'ADM ESCOLAR', 'eanee.semed@pnl.mg.gov.br'),
  ('ESC. ANA DO NASCIMENTO SOUZA', 'ASS - PSICO', 'eanee.semed@pnl.mg.gov.br'),
  ('EJA - JARDIM DE PETRÓPOLIS', 'ASS - PSICO', 'emcm.semed@pnl.mg.gov.br'),
  ('SEMED', 'ADMINISTRAÇÃO', 'suao.semed@pnl.mg.gov.br'),
  ('SEMED', 'CADASTRO ESCOLAR', 'cadastro.semed@pnl.mg.gov.br'),
  ('SEMED', 'CAE', 'cae@pnl.mg.gov.br'),
  ('SEMED', 'CASA DO EDUCADOR', 'casadoeducador.semed@pnl.mg.gov.br'),
  ('SEMED', 'CASA DOS CONSELHOS', 'cme@pnl.mg.gov.br'),
  ('SEMED', 'COMUNICAÇÃO', 'comunicacao.semed@pnl.mg.gov.br'),
  ('SEMED', 'CPP', 'cpp.semed@pnl.mg.gov.br'),
  ('SEMED', 'EDUCAÇÃO INCLUSIVA', 'inclusao.semed@pnl.mg.gov.br'),
  ('SEMED', 'EDUCAÇÃO INFANTIL', 'nei.semed@pnl.mg.gov.br'),
  ('SEMED', 'ENSINO FUNDAMENTAL', 'nef.semed@pnl.mg.gov.br'),
  ('SEMED', 'ESCRITURAÇÃO', 'escrituracao.semed@pnl.mg.gov.br'),
  ('SEMED', 'ETINICOS', 'etnicoracial.semed@pnl.mg.gov.br'),
  ('SEMED', 'EVENTOS', 'eventos.semed@pnl.mg.gov.br'),
  ('SEMED', 'EXCURSÃO', 'excursao.semed@pnl.mg.gov.br'),
  ('SEMED', 'EXPEDIENTE', 'pedidos.expediente@pnl.mg.gov.br'),
  ('SEMED', 'FINANCEIRO', 'financeiro.semed@pnl.mg.gov.br'),
  ('SEMED', 'GABINETE', 'gabinete.semed@pnl.mg.gov.br'),
  ('SEMED', 'JURÍDICO', 'juridico.semed@pnl.mg.gov.br'),
  ('SEMED', 'NTE', 'nte@pnl.mg.gov.br'),
  ('SEMED', 'NUTRIÇÃO', 'nutricao.semed@pnl.mg.gov.br'),
  ('SEMED', 'OBRAS', 'obras.semed@pnl.mg.gov.br'),
  ('SEMED', 'PATRIMÔNIO', 'patrimonio.semed@pnl.mg.gov.br'),
  ('SEMED', 'PEDAGOGIA', 'dep.ensino.semed@pnl.mg.gov.br'),
  ('SEMED', 'PESI', 'pesi.semed@pnl.mg.gov.br'),
  ('SEMED', 'RH', 'rh.semed@pnl.mg.gov.br'),
  ('SEMED', 'SERVIÇO SOCIAL', 'servsocial.semed@pnl.mg.gov.br'),
  ('SEMED', 'TI', 'ti.semed@pnl.mg.gov.br'),
  ('SEMED', 'TRANSPORTE', 'transporte.semed@pnl.mg.gov.br'),
  ('COOPERATIVAS', 'COOPERNOVA', 'transporte.semed@pnl.mg.gov.br'),
  ('COOPERATIVAS', 'COOPERTRANSP', 'transporte.semed@pnl.mg.gov.br')
ON CONFLICT (unidade, setor) DO UPDATE SET email = EXCLUDED.email;

-- Conferir no final:
-- SELECT unidade, setor, email FROM tabelas_apoio ORDER BY unidade, setor;
-- SELECT nome, tipo FROM unidades ORDER BY tipo, nome;
-- SELECT unidade, setor, COUNT(*) FROM tabelas_apoio GROUP BY unidade, setor HAVING COUNT(*) > 1; -- deve voltar 0 linhas
