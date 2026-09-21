-- MarkCarro - função pública (só LEITURA) pro Bora Lá conseguir mostrar,
-- na tela dele, as corridas confirmadas do MarkCarro por placa - mesmo
-- espírito da Edge Function "agenda-veiculos" que o Bora Lá já expõe pro
-- MarkCarro (agora funciona nos 2 sentidos: não importa qual app o
-- motorista usa pra logar, ele vê a agenda dos 2 sistemas).
--
-- Só devolve o que é preciso pra evitar bater 2 vans no mesmo horário:
-- placa, data, horário, "origem → destino" e status - nada de nome de
-- solicitante, unidade/setor, justificativa, telefone etc. Não expõe
-- nenhuma tabela nem policy nova - é uma função só de leitura (SECURITY
-- DEFINER, mas só devolve os 6 campos abaixo, nunca a linha inteira).
--
-- Considera "ocupando a van": solicitacoes.status = 'Confirmada' e
-- condutor_ida/condutor_volta preenchido (mesmo critério já usado na
-- tela Agenda de Corridas e na Agenda Combinada do MarkCarro).

CREATE OR REPLACE FUNCTION public.agenda_publica_veiculos(p_desde date, p_ate date)
RETURNS TABLE (
  sistema text,
  placa text,
  data_viagem date,
  hora_saida time,
  hora_retorno time,
  detalhe text,
  status text
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
      p_ida.placa AS placa_ida,
      p_volta.placa AS placa_volta
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
  )
  SELECT DISTINCT
    'markcarro'::text AS sistema,
    placa,
    data_viagem,
    hora_saida,
    hora_retorno,
    (COALESCE(origem, '') || ' → ' || COALESCE(destino, '')) AS detalhe,
    status
  FROM base
  CROSS JOIN LATERAL (VALUES (placa_ida), (placa_volta)) AS placas(placa)
  WHERE placa IS NOT NULL
  ORDER BY data_viagem, hora_saida;
$$;

-- Só leitura, sem nenhum dado sensível devolvido - por isso pode ser
-- chamada sem login (anon), igual a função equivalente do Bora Lá.
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO authenticated;

-- Conferir (rode com um período de teste):
-- SELECT * FROM public.agenda_publica_veiculos(current_date, current_date + 30);
