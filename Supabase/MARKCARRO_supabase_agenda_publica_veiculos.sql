-- MarkCarro - função pública (só LEITURA) pro Bora Lá conseguir mostrar,
-- na tela dele, as corridas confirmadas do MarkCarro por placa - mesmo
-- espírito da Edge Function "agenda-veiculos" que o Bora Lá já expõe pro
-- MarkCarro (funciona nos 2 sentidos: não importa qual app o motorista usa
-- pra logar, ele vê a agenda dos 2 sistemas).
--
-- ATUALIZAÇÃO (pedido do usuário: "aparece a viagem agendada no markcarro,
-- mas não aparece sómente IDA ou Volta - tem que aparecer conforme o
-- gravado no markcarro"): agora devolve também a coluna "sentido":
--   'ida'   -> essa linha é só o trecho de IDA (condutor_ida da solicitação
--              é um motorista/van diferente do condutor_volta)
--   'volta' -> essa linha é só o trecho de VOLTA (idem, motorista/van
--              diferente do condutor_ida)
--   'ambos' -> a mesma van/motorista faz ida E volta dessa solicitação -
--              nesse caso não faz sentido separar em 2 linhas, então
--              continua sendo 1 linha só, com os 2 horários.
-- Antes, quando ida e volta eram motoristas/vans diferentes, cada um saía
-- como uma linha igual (placa, motorista, os 2 horários) - sem indicar
-- que aquele motorista só é responsável por metade da viagem. O app do
-- Bora Lá usa esse campo pra negritar "Ida"/"Volta" e sublinhar só o
-- horário correspondente no card do motorista.
--
-- Considera "ocupando a van": solicitacoes.status = 'Confirmada' e
-- condutor_ida/condutor_volta preenchido (mesmo critério já usado na
-- tela Agenda de Corridas e na Agenda Combinada do MarkCarro).
--
-- ATUALIZAÇÃO (pedido do usuário: "agendamento do markcarro apresentado
-- nos cards do app do bora lá (todas as telas) deve apresentar a
-- justificativa registrada no markcarro"): passa a devolver também
-- "justificativa" - o comentário antigo acima dizia que essa função nunca
-- devolveria justificativa; isso foi decisão de projeto de antes, revista
-- agora a pedido explícito do usuário.

DROP FUNCTION IF EXISTS public.agenda_publica_veiculos(date, date);

CREATE OR REPLACE FUNCTION public.agenda_publica_veiculos(p_desde date, p_ate date)
RETURNS TABLE (
  sistema text,
  placa text,
  motorista text,
  sentido text,
  data_viagem date,
  hora_saida time,
  hora_retorno time,
  detalhe text,
  status text,
  origem text,
  destino text,
  qtd_pessoas int,
  nome_solicitante text,
  telefone_solicitante text,
  justificativa text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH limites AS (
    SELECT p_desde AS desde, p_ate AS ate
  ),
  base AS (
    SELECT
      s.data_viagem,
      s.hora_saida,
      s.hora_retorno,
      s.origem,
      s.destino,
      s.status,
      s.qtd_pessoas,
      COALESCE(s.nome_ext, s.email_solicitante) AS nome_solicitante,
      s.telefone_ext AS telefone_solicitante,
      s.justificativa AS justificativa,
      p_ida.placa AS placa_ida,
      p_ida.nome AS nome_ida,
      p_volta.placa AS placa_volta,
      p_volta.nome AS nome_volta
    FROM public.solicitacoes s
    LEFT JOIN public.profiles p_ida ON p_ida.email = s.condutor_ida
    LEFT JOIN public.profiles p_volta ON p_volta.email = s.condutor_volta
    CROSS JOIN limites l
    WHERE s.status = 'Confirmada'
      AND (s.condutor_ida IS NOT NULL OR s.condutor_volta IS NOT NULL)
      AND s.data_viagem BETWEEN l.desde AND l.ate
      -- Trava o mesmo limite de período que a função do Bora Lá usa, pra
      -- não virar uma consulta pesada/sem fim.
      AND (l.ate - l.desde) <= 90
  ),
  -- Uma linha por "responsável" (van/motorista) da solicitação - se ida e
  -- volta são feitas pela mesma van, gera 1 linha só (sentido='ambos');
  -- se são vans/motoristas diferentes, gera 2 linhas separadas.
  pares AS (
    SELECT
      data_viagem, hora_saida, hora_retorno, origem, destino, status, qtd_pessoas,
      nome_solicitante, telefone_solicitante, justificativa,
      placa_ida AS placa,
      nome_ida AS motorista,
      CASE WHEN placa_ida IS NOT DISTINCT FROM placa_volta THEN 'ambos' ELSE 'ida' END AS sentido
    FROM base
    WHERE placa_ida IS NOT NULL

    UNION ALL

    SELECT
      data_viagem, hora_saida, hora_retorno, origem, destino, status, qtd_pessoas,
      nome_solicitante, telefone_solicitante, justificativa,
      placa_volta AS placa,
      nome_volta AS motorista,
      'volta' AS sentido
    FROM base
    WHERE placa_volta IS NOT NULL
      AND placa_ida IS DISTINCT FROM placa_volta
  )
  SELECT DISTINCT
    'markcarro'::text AS sistema,
    placa,
    motorista,
    sentido,
    data_viagem,
    hora_saida,
    hora_retorno,
    (COALESCE(origem, '') || ' → ' || COALESCE(destino, '')) AS detalhe,
    status,
    origem,
    destino,
    qtd_pessoas,
    nome_solicitante,
    telefone_solicitante,
    justificativa
  FROM pares
  WHERE placa IS NOT NULL
  ORDER BY data_viagem, hora_saida;
$$;

-- Só leitura, sem nenhum dado sensível devolvido - por isso pode ser
-- chamada sem login (anon), igual a função equivalente do Bora Lá.
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO authenticated;

-- Conferir (rode com um período de teste):
-- SELECT * FROM public.agenda_publica_veiculos(current_date, current_date + 30);
