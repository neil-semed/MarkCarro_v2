-- MarkCarro - "Criar conta não carrega Unidades nem Setores"
-- Execute UMA vez no SQL Editor do projeto MarkCarro (pode rodar de novo, é seguro).
--
-- A tela "Criar conta" roda SEM login (sessão anônima). Para os dropdowns de
-- Unidade/Setor aparecerem ali, a leitura de "tabelas_apoio" (Unidade/Setor) e
-- "locais" precisa estar liberada também para o papel anônimo. As tabelas só
-- têm nomes de unidades/setores/locais - nenhum dado pessoal. Escrita
-- (INSERT/UPDATE/DELETE) continua só para admin (políticas existentes).

GRANT SELECT ON public.tabelas_apoio TO anon, authenticated;
GRANT SELECT ON public.locais        TO anon, authenticated;

ALTER TABLE public.tabelas_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apoio visivel" ON public.tabelas_apoio;
CREATE POLICY "Apoio visivel" ON public.tabelas_apoio
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Locais visiveis" ON public.locais;
CREATE POLICY "Locais visiveis" ON public.locais
  FOR SELECT USING (true);

-- Conferência (deve devolver linhas com roles {public} ou {anon,authenticated}):
-- SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
--  WHERE tablename IN ('tabelas_apoio','locais') AND cmd = 'SELECT';
