// ============================================================
// MARKCARRO - Edge Function: enviar-agenda-email
// ============================================================
// Dispara por e-mail (via Brevo) a Agenda de Corridas de um período pra
// uma lista de destinatários cadastrados na tela Gerenciar Usuários
// (tabela destinatarios_relatorio). Chamada por enviarAgendaPorEmail()
// em api.js, a partir do botão "Enviar por E-mail" na Agenda de Corridas.
//
// Identidade: mesmo padrão do km-bridge (ver _chamarKmBridge em api.js) -
// quem autoriza a chamada é o PRÓPRIO usuário logado no MarkCarro. O token
// de sessão (Authorization: Bearer ...) é repassado pro cliente Supabase
// aqui dentro, então as consultas rodam com a MESMA identidade/RLS de quem
// clicou no botão - por isso também é checado explicitamente se quem
// chamou é admin (perfil.tipo === 'admin'), pra dar um erro claro em vez
// de simplesmente devolver uma lista vazia por causa do RLS.
//
// Variáveis de ambiente necessárias (configurar com "supabase secrets
// set", ver INSTRUCOES_EMAIL_AGENDA.txt):
//   BREVO_API_KEY               - chave de API da conta Brevo
//   AGENDA_EMAIL_REMETENTE      - e-mail remetente (precisa estar
//                                 validado/autenticado na conta Brevo)
//   AGENDA_EMAIL_REMETENTE_NOME - nome exibido do remetente (opcional,
//                                 padrão "MarkCarro")
// SUPABASE_URL e SUPABASE_ANON_KEY já vêm prontas por padrão em toda
// Edge Function do Supabase - não precisa configurar.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function formatarDataBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarHoraBR(hora: string | null | undefined): string {
  if (!hora) return '';
  return hora.slice(0, 5);
}

interface Solicitacao {
  id: string;
  data_viagem: string;
  hora_saida: string | null;
  hora_retorno: string | null;
  origem: string | null;
  destino: string | null;
  nome_ext: string | null;
  email_solicitante: string;
  telefone_ext: string | null;
  qtd_pessoas: number | null;
  condutor_ida: string | null;
  condutor_volta: string | null;
  status: string | null;
}

interface Destinatario {
  email: string;
  nome: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return resposta({ error: 'Método não permitido' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) return resposta({ error: 'Sessão expirada. Faça login novamente.' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';
    const REMETENTE_EMAIL = Deno.env.get('AGENDA_EMAIL_REMETENTE') || '';
    const REMETENTE_NOME = Deno.env.get('AGENDA_EMAIL_REMETENTE_NOME') || 'MarkCarro';

    if (!BREVO_API_KEY || !REMETENTE_EMAIL) {
      return resposta({ error: 'E-mail não configurado no servidor (faltam BREVO_API_KEY / AGENDA_EMAIL_REMETENTE). Veja INSTRUCOES_EMAIL_AGENDA.txt.' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Confirma quem está chamando (mesmo servidor de autenticação do
    // MarkCarro) e se é admin - sem isso, um não-admin só receberia listas
    // vazias por causa do RLS, sem entender o motivo.
    const { data: userData, error: erroUser } = await supabase.auth.getUser();
    if (erroUser || !userData?.user) return resposta({ error: 'Sessão inválida.' }, 401);

    const { data: perfil, error: erroPerfil } = await supabase
      .from('profiles')
      .select('tipo')
      .eq('id', userData.user.id)
      .single();
    if (erroPerfil || !perfil || perfil.tipo !== 'admin') {
      return resposta({ error: 'Só administradores podem enviar a Agenda por e-mail.' }, 403);
    }

    const corpoReq = await req.json().catch(() => ({}));
    const dataInicio: string | undefined = corpoReq.data_inicio;
    const dataFim: string = corpoReq.data_fim || dataInicio;
    if (!dataInicio) return resposta({ error: 'Informe ao menos a data inicial.' }, 400);

    const { data: solicitacoes, error: erroSolic } = await supabase
      .from('solicitacoes')
      .select('*')
      .gte('data_viagem', dataInicio)
      .lte('data_viagem', dataFim)
      .order('data_viagem')
      .order('hora_saida');
    if (erroSolic) return resposta({ error: 'Erro ao buscar a agenda: ' + erroSolic.message }, 500);

    const lista = (solicitacoes || []) as Solicitacao[];
    if (!lista.length) {
      return resposta({ error: 'Não há corridas no período selecionado.' }, 400);
    }

    const { data: destinatarios, error: erroDestin } = await supabase
      .from('destinatarios_relatorio')
      .select('email, nome')
      .eq('ativo', true);
    if (erroDestin) return resposta({ error: 'Erro ao buscar destinatários: ' + erroDestin.message }, 500);

    const listaDestinatarios = (destinatarios || []) as Destinatario[];
    if (!listaDestinatarios.length) {
      return resposta({ error: 'Nenhum destinatário ativo cadastrado. Cadastre em Gerenciar Usuários.' }, 400);
    }

    // Resolve os e-mails de condutor_ida/condutor_volta pro NOME - a Edge
    // Function não tem acesso ao cache do navegador (cacheCondutoresParaExibicao
    // em api.js/agenda.js), então busca os perfis de condutor direto aqui.
    const emailsCondutores = Array.from(new Set(
      lista.flatMap((s) => [s.condutor_ida, s.condutor_volta]).filter((e): e is string => !!e)
    ));
    const mapaCondutores: Record<string, string> = {};
    if (emailsCondutores.length) {
      const { data: condutores } = await supabase
        .from('profiles')
        .select('email, nome')
        .in('email', emailsCondutores);
      (condutores || []).forEach((c: { email: string; nome: string }) => { mapaCondutores[c.email] = c.nome; });
    }

    function nomeCondutor(email: string | null): string {
      if (!email) return '';
      return mapaCondutores[email] || email;
    }

    // PEDIDO DO USUÁRIO: quando o condutor de IDA é diferente do de VOLTA,
    // mostra os dois na mesma célula (em vez de só um deles).
    function celulaCondutor(s: Solicitacao): string {
      const ida = nomeCondutor(s.condutor_ida);
      const volta = nomeCondutor(s.condutor_volta);
      if (ida && volta && ida !== volta) return `${ida} (ida) / ${volta} (volta)`;
      return ida || volta || '-';
    }

    const periodoTitulo = dataInicio === dataFim
      ? formatarDataBR(dataInicio)
      : `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`;

    const linhasHtml = lista.map((s) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ' / ' + formatarHoraBR(s.hora_retorno) : ''}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.origem || '-'} &rarr; ${s.destino || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.nome_ext || s.email_solicitante}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.telefone_ext || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;">${s.qtd_pessoas ?? '-'}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${celulaCondutor(s)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.status || 'Pendente'}</td>
      </tr>`).join('');

    const htmlEmail = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;">
        <div style="background:#1e40af;color:#ffffff;padding:14px 18px;">
          <h2 style="margin:0;font-size:18px;">MarkCarro | Agenda de Corridas</h2>
          <p style="margin:2px 0 0;font-size:12px;">SEMED Nova Lima</p>
        </div>
        <div style="padding:14px 18px;">
          <p style="font-size:14px;margin:0 0 12px;"><strong>Período:</strong> ${periodoTitulo} &nbsp;&middot;&nbsp; <strong>Corridas:</strong> ${lista.length}</p>
          <table style="border-collapse:collapse;width:100%;font-size:12.5px;">
            <thead>
              <tr style="background:#facc15;">
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Horário</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Origem &rarr; Destino</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Solicitante</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Celular</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Pass</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Condutor</th>
                <th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
          </table>
          <p style="font-size:11px;color:#64748b;margin-top:16px;">Transporte - SEMED.<br>(Essa mensagem foi gerada automaticamente)</p>
        </div>
      </div>`;

    const tituloEmail = `[MarkCarro] Agenda de Corridas - ${periodoTitulo}`;

    const respostaBrevo = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: REMETENTE_NOME, email: REMETENTE_EMAIL },
        to: listaDestinatarios.map((d) => ({ email: d.email, name: d.nome || d.email })),
        subject: tituloEmail,
        htmlContent: htmlEmail,
      }),
    });

    const textoBruto = await respostaBrevo.text();
    let corpoResp: Record<string, unknown> = {};
    try { corpoResp = JSON.parse(textoBruto); } catch (_e) { /* não era JSON */ }

    if (!respostaBrevo.ok) {
      const motivo = (corpoResp?.message as string) || textoBruto || `HTTP ${respostaBrevo.status}`;
      return resposta({ error: `Erro ao enviar e-mail (Brevo): ${motivo}` }, 502);
    }

    return resposta({ success: true, enviados: listaDestinatarios.length, corridas: lista.length });
  } catch (e) {
    return resposta({ error: 'Erro interno: ' + ((e as Error)?.message || String(e)) }, 500);
  }
});
