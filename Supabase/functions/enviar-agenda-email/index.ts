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
// HISTÓRICO: chegou a usar Resend (secrets RESEND_API_KEY/RESEND_FROM) -
// voltou pro Brevo porque a conta do Resend estava em modo de teste (só
// manda pro próprio e-mail do dono da conta, sem domínio verificado) e o
// Brevo permite validar só um remetente avulso, sem precisar verificar um
// domínio inteiro.
//
// Variáveis de ambiente necessárias (configurar com "supabase secrets
// set", ver INSTRUCOES_EMAIL_AGENDA.txt):
//   BREVO_API_KEY               - chave de API da conta Brevo (aba
//                                 "API Keys" dentro de SMTP & API - NÃO é
//                                 a chave/senha da aba "SMTP")
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
    // .trim() - defesa contra espaço/quebra de linha invisível grudado na
    // hora de colar a chave no campo de Secret (causa comum do Brevo
    // devolver "Key not found" mesmo com uma chave aparentemente certa).
    const BREVO_API_KEY = (Deno.env.get('BREVO_API_KEY') || '').trim();
    const REMETENTE_EMAIL = (Deno.env.get('AGENDA_EMAIL_REMETENTE') || '').trim();
    const REMETENTE_NOME = (Deno.env.get('AGENDA_EMAIL_REMETENTE_NOME') || 'MarkCarro').trim();

    if (!BREVO_API_KEY || !REMETENTE_EMAIL) {
      return resposta({ error: 'E-mail não configurado no servidor (faltam BREVO_API_KEY / AGENDA_EMAIL_REMETENTE). Veja INSTRUCOES_EMAIL_AGENDA.txt.' }, 500);
    }
    // Diagnóstico SEGURO (não revela a chave inteira) - só pra confirmar,
    // num eventual erro do Brevo, se o secret chegou com o tamanho e o
    // prefixo certos ("xkeysib-..."), sem expor o valor de verdade.
    const _diagChave = `tamanho=${BREVO_API_KEY.length}, começa_com="${BREVO_API_KEY.slice(0, 9)}", termina_com="${BREVO_API_KEY.slice(-4)}"`;

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

    // CORREÇÃO URGENTE ("não está mandando para todos os emails
    // cadastrados"): antes só ia pra quem estava "Ativo" (o botão
    // "Bloquear" em Gerenciar Usuários excluía silenciosamente do envio) -
    // agora manda pra TODOS os destinatários cadastrados, bloqueados ou
    // não (o botão Bloquear/Ativar continua existindo na tela, só não
    // afeta mais quem recebe o e-mail).
    const { data: destinatarios, error: erroDestin } = await supabase
      .from('destinatarios_relatorio')
      .select('email, nome');
    if (erroDestin) return resposta({ error: 'Erro ao buscar destinatários: ' + erroDestin.message }, 500);

    const listaDestinatarios = (destinatarios || []) as Destinatario[];
    if (!listaDestinatarios.length) {
      return resposta({ error: 'Nenhum destinatário cadastrado. Cadastre em Gerenciar Usuários.' }, 400);
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
      (condutores || []).forEach((c: { email: string; nome: string }) => { mapaCondutores[c.email.trim().toLowerCase()] = c.nome; });
    }

    function nomeCondutor(email: string | null): string {
      if (!email) return '';
      const chave = email.trim().toLowerCase();
      return mapaCondutores[chave] || email;
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

    // PEDIDO DO USUÁRIO: sem hiperlink nenhum em endereço/telefone - vários
    // clientes de e-mail (Gmail no celular, Apple Mail) "detectam" texto que
    // parece endereço/telefone e sozinhos transformam em link azul sublinhado,
    // por conta própria, DEPOIS que o e-mail já chegou - isso não depende de
    // CSS nem do <meta name="format-detection">, que o Gmail simplesmente
    // ignora (só o Apple Mail respeita). A única forma que realmente engana
    // esse "detector automático" é quebrar o texto contínuo do telefone/
    // endereço com um caractere invisível (zero-width space) entre cada
    // letra/dígito - pro olho humano continua exatamente igual, mas o
    // detector do Gmail não reconhece mais o padrão de telefone/endereço.
    const ZWSP = '​';
    const semAutoDeteccao = (texto: string) => texto.split('').join(ZWSP);
    const semLink = (texto: string) => `<span style="color:inherit;text-decoration:none;">${texto}</span>`;

    // CORREÇÃO (pedido do usuário, "tirar todos os hiperlinks"): Solicitante
    // e Condutor não passavam por semLink()/semAutoDeteccao() como Origem/
    // Destino e Celular já passavam - quando caía no fallback pro e-mail cru
    // (s.email_solicitante, ou o e-mail de condutor sem perfil encontrado em
    // mapaCondutores), o Gmail auto-linkava (sublinhado azul, clicável) por
    // conta própria. Agora as 4 colunas com possível e-mail/telefone cru
    // passam pelo mesmo tratamento.
    const linhasHtml = lista.map((s) => `
      <tr>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ' &rarr; ' + formatarHoraBR(s.hora_retorno) : ''}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${semLink(semAutoDeteccao(s.origem || '-'))} &rarr; ${semLink(semAutoDeteccao(s.destino || '-'))}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${semLink(semAutoDeteccao(s.nome_ext || s.email_solicitante))}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${semLink(semAutoDeteccao(s.telefone_ext || '-'))}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;text-align:center;">${s.qtd_pessoas ?? '-'}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${semLink(semAutoDeteccao(celulaCondutor(s)))}</td>
        <td style="padding:4px 7px;border:1px solid #e2e8f0;">${s.status || 'Pendente'}</td>
      </tr>`).join('');

    // Ícone do app (favicon.png, publicado no GitHub Pages junto do resto
    // do site) ao lado do título, no lugar do preenchimento azul de antes.
    const FAVICON_URL = 'https://neil-semed.github.io/MarkCarro_v2/favicon.png';

    // CORREÇÃO (pedido do usuário, "no título, coloque um espaço após o
    // favicon"): o cabeçalho usava flexbox (display:flex + gap) pra separar
    // logo e título - gap em flexbox não é suportado em vários clientes de
    // e-mail (ex: Outlook desktop não roda flexbox de jeito nenhum), então o
    // "espaço" podia simplesmente não aparecer. Trocado por uma <table>
    // (padrão de compatibilidade em e-mail) com padding-right explícito na
    // célula da logo - funciona em qualquer cliente.
    const htmlEmail = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;color:#1e293b;">
        <table role="presentation" style="width:100%;border-collapse:collapse;padding:12px 4px;border-bottom:2px solid #facc15;">
          <tr>
            <td style="padding:0 10px 0 0;width:28px;">
              <img src="${FAVICON_URL}" alt="" width="28" height="28" style="width:28px;height:28px;border-radius:6px;display:block;">
            </td>
            <td>
              <h2 style="margin:0;font-size:15px;color:#1e293b;">MarkCarro | Agenda de Corridas</h2>
              <p style="margin:1px 0 0;font-size:10px;color:#64748b;">SEMED Nova Lima</p>
            </td>
          </tr>
        </table>
        <div style="padding:12px 4px;">
          <p style="font-size:12px;margin:0 0 10px;"><strong>Período:</strong> ${periodoTitulo} &nbsp;&middot;&nbsp; <strong>Corridas:</strong> ${lista.length}</p>
          <table style="border-collapse:collapse;width:100%;font-size:10px;">
            <thead>
              <tr style="background:#facc15;">
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Horário</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Origem &rarr; Destino</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Solicitante</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Celular</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Pass</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Condutor</th>
                <th style="padding:4px 7px;border:1px solid #e2e8f0;text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
          </table>
          <p style="font-size:10px;color:#64748b;margin-top:14px;">Transporte - SEMED.<br>(Essa mensagem foi gerada automaticamente - modelo v20261002a)</p>
        </div>
      </div>`;

    // Meta de format-detection vai no <head> do e-mail - impede Apple
    // Mail/Gmail mobile de auto-linkar telefone/endereço/data/e-mail.
    // CORREÇÃO (pedido do usuário, "tratar essas mensagens de segurança ou
    // texto em inglês"): lang="pt-BR" + Content-Language ajudam o Gmail a
    // detectar o idioma certo do corpo do e-mail (o aviso "parece estar em
    // inglês" aparece quando o texto corrido é escasso - a maior parte do
    // e-mail é tabela/números/nomes próprios - e o detector de idioma do
    // Gmail erra por falta de texto pra analisar). O aviso de "mensagem
    // suspeita"/imagens ocultas, por outro lado, é do histórico de
    // reputação do domínio de envio do Brevo (SPF/DKIM/DMARC) com aquele
    // destinatário - não dá pra resolver só pelo HTML do e-mail; tende a
    // sumir conforme a caixa de entrada "aprende" a confiar no remetente.
    const htmlEmailCompleto = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Language" content="pt-BR">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
</head>
<body style="margin:0;padding:0;">
${htmlEmail}
</body>
</html>`;

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
        htmlContent: htmlEmailCompleto,
      }),
    });

    const textoBruto = await respostaBrevo.text();
    let corpoResp: Record<string, unknown> = {};
    try { corpoResp = JSON.parse(textoBruto); } catch (_e) { /* não era JSON */ }

    if (!respostaBrevo.ok) {
      const motivo = (corpoResp?.message as string) || textoBruto || `HTTP ${respostaBrevo.status}`;
      return resposta({ error: `Erro ao enviar e-mail (Brevo): ${motivo} [diagnóstico: ${_diagChave}]` }, 502);
    }

    return resposta({ success: true, enviados: listaDestinatarios.length, corridas: lista.length });
  } catch (e) {
    return resposta({ error: 'Erro interno: ' + ((e as Error)?.message || String(e)) }, 500);
  }
});
