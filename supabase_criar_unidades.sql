-- ============================================================
-- MARKCARRO - Nova tabela: Unidades (cadastro próprio, separado do
-- sistema atual de Unidade/Setor em tabelas_apoio)
-- Rode este script no SQL Editor do Supabase. Não apaga nenhum dado -
-- só cria uma tabela nova.
--
-- Por que uma tabela separada: hoje "Unidade" não é uma entidade própria
-- no banco - é só um texto repetido dentro de `tabelas_apoio` (que
-- também guarda Setor e um e-mail de contato por Setor, usado nos
-- dropdowns de Cadastro/Nova Solicitação/Gerenciar Usuários). Criar essa
-- tabela nova para nome/endereço/telefone/e-mail da Unidade em si NÃO
-- mexe em nada que já funciona: `tabelas_apoio` continua exatamente como
-- está, e os dropdowns de Unidade em outras telas continuam lendo de lá.
-- Esta tabela serve só para a nova tela "Gerenciar Unidades".
-- ============================================================

CREATE TABLE IF NOT EXISTS unidades (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Unidades visiveis para autenticados') THEN
    CREATE POLICY "Unidades visiveis para autenticados" ON unidades
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Admin cria unidade') THEN
    CREATE POLICY "Admin cria unidade" ON unidades
      FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Admin atualiza unidade') THEN
    CREATE POLICY "Admin atualiza unidade" ON unidades
      FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Admin exclui unidade') THEN
    CREATE POLICY "Admin exclui unidade" ON unidades
      FOR DELETE USING (is_admin());
  END IF;
END $$;

-- ============================================================
-- Opcional: já popular a tabela nova com os nomes de Unidade que já
-- existem hoje em tabelas_apoio, pra não começar do zero (só o nome -
-- endereço/telefone/e-mail da Unidade ficam em branco pra você
-- preencher depois na tela Gerenciar Unidades).
-- ============================================================
INSERT INTO unidades (nome)
SELECT DISTINCT unidade FROM tabelas_apoio
WHERE unidade IS NOT NULL AND unidade <> ''
ON CONFLICT (nome) DO NOTHING;
