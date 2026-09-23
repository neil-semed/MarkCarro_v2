-- MarkCarro - função pública (só LEITURA) pro Bora Lá conseguir mostrar,
-- na tela dele, as corridas confirmadas do MarkCarro por placa - mesmo
-- espírito da Edge Function "agenda-veiculos" que o Bora Lá já expõe pro
-- MarkCarro (agora funciona nos 2 sentidos: não importa qual app o
-- motorista usa pra logar, ele vê a agenda dos 2 sistemas).
--
-- PEDIDO DO USUÁRIO ("use a mesma configuração do card do bora lá, com as
-- informações do solicitante e setor"): além de placa/motorista/horário,
-- agora também devolve origem, destino (campos separados - "detalhe"
-- continua existindo, junto, só por compatibilidade com quem já lê ele),
-- quantidade de passageiros e nome/telefone do solicitante - mesmo
-- espírito do que a Edge Function do Bora Lá já expõe sobre as excursões
-- dela. Não expõe nenhuma tabela nem policy nova - é uma função só de
-- leitura (SECURITY DEFINER, mas só devolve os campos abaixo, nunca a
-- linha inteira - sem justificativa, sem endereço/documento de ninguém).
--
-- Considera "ocupando a van": solicitacoes.status = 'Confirmada' e
-- condutor_ida/condutor_volta preenchido (mesmo critério já usado na
-- tela Agenda de Corridas e na Agenda Combinada do MarkCarro).

DROP FUNCTION IF EXISTS public.agenda_publica_veiculos(date, date);

CREATE OR REPLACE FUNCTION public.agenda_publica_veiculos(p_desde date, p_ate date)
RETURNS TABLE (
  sistema text,
  placa text,
  motorista text,
  data_viagem date,
  hora_saida time,
  hora_retorno time,
  detalhe text,
  status text,
  origem text,
  destino text,
  qtd_pessoas int,
  nome_solicitante text,
  telefone_solicitante text
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
  )
  SELECT DISTINCT
    'markcarro'::text AS sistema,
    placa,
    motorista,
    data_viagem,
    hora_saida,
    hora_retorno,
    (COALESCE(origem, '') || ' → ' || COALESCE(destino, '')) AS detalhe,
    status,
    origem,
    destino,
    qtd_pessoas,
    nome_solicitante,
    telefone_solicitante
  FROM base
  CROSS JOIN LATERAL (VALUES (placa_ida, nome_ida), (placa_volta, nome_volta)) AS pares(placa, motorista)
  WHERE placa IS NOT NULL
  ORDER BY data_viagem, hora_saida;
$$;

-- Só leitura, sem nenhum dado sensível devolvido - por isso pode ser
-- chamada sem login (anon), igual a função equivalente do Bora Lá.
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.agenda_publica_veiculos(date, date) TO authenticated;

-- Conferir (rode com um período de teste):
-- SELECT * FROM public.agenda_publica_veiculos(current_date, current_date + 30);
