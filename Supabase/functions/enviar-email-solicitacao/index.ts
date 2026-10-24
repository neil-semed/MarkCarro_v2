// ============================================================
// MARKCARRO - Edge Function: enviar-email-solicitacao
// ============================================================
// E-mail de solicitação de viagem quando a ORIGEM ou o DESTINO tem nome igual
// ao de uma Unidade ativa (tabela "unidades", escola/creche etc.).
// Eventos: 'registrada' (criada por Admin/Co-admin), 'confirmada' (com
// motorista de ida e/ou volta) e 'cancelada' (pelo gestor ou pelo solicitante).
// Destinatários: e-mail da(s) Unidade(s) da rota + e-mail do solicitante
// (não envia ao gestor que cadastrou, quando o solicitante é externo e não
// informou e-mail - nesse caso o app grava o e-mail do próprio gestor).
// Mesmo padrão visual do e-mail "Agenda de Corridas" (enviar-agenda-email).
// "Responder para" e o texto do rodapé usam o e-mail salvo em
// config_sistema (chave email_contato_mensagens), editado em Gerenciar
// Perfis de Acesso - nada de e-mail fixo no código.
//
// Secrets (os mesmos de enviar-agenda-email): BREVO_API_KEY,
// AGENDA_EMAIL_REMETENTE, AGENDA_EMAIL_REMETENTE_NOME (opcional).
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já vêm prontas.
// Publicar: supabase functions deploy enviar-email-solicitacao
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MODELO = 'v20261024c';

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}
const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const hhmm = (h: string | null | undefined) => (h ? h.slice(0, 5) : '');
function dataLonga(iso: string): string {
  const [a, m, d] = iso.split('-');
  const dia = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d}/${m}/${a}`;
}
function agoraBR(): string {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value || '';
  return `${g('day')}/${g('month')}/${g('year')} às ${g('hour')}:${g('minute')}`;
}
// Quebra o texto contínuo de telefone/placa/e-mail cru para o Gmail não auto-linkar
// (mesma técnica do e-mail da Agenda).
const ZWSP = '​';
const semLink = (t: string) => `<span style="color:inherit;text-decoration:none;">${esc(t.split('').join(ZWSP))}</span>`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return resposta({ error: 'Método não permitido' }, 405);
  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) return resposta({ error: 'Sessão expirada.' }, 401);
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const BREVO_API_KEY = (Deno.env.get('BREVO_API_KEY') || '').trim();
    const REMETENTE_EMAIL = (Deno.env.get('AGENDA_EMAIL_REMETENTE') || '').trim();
    const REMETENTE_NOME = (Deno.env.get('AGENDA_EMAIL_REMETENTE_NOME') || 'MarkCarro').trim();
    if (!BREVO_API_KEY || !REMETENTE_EMAIL || !SERVICE) return resposta({ error: 'E-mail não configurado no servidor.' }, 500);

    const { id, evento } = await req.json().catch(() => ({}));
    if (!id || !['registrada', 'confirmada', 'cancelada'].includes(evento)) return resposta({ error: 'Parâmetros inválidos.' }, 400);

    // Quem chama: identidade/RLS do próprio usuário (só enxerga solicitação a que tem direito).
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: ud, error: eu } = await userClient.auth.getUser();
    if (eu || !ud?.user) return resposta({ error: 'Sessão inválida.' }, 401);
    const { data: s, error: es } = await userClient.from('solicitacoes').select('*').eq('id', id).maybeSingle();
    if (es || !s) return resposta({ error: 'Solicitação não encontrada.' }, 404);

    const db = createClient(SUPABASE_URL, SERVICE);
    const { data: operador } = await db.from('profiles').select('nome, tipo, perfil_acesso_id, email').eq('id', ud.user.id).maybeSingle();
    const ehAdmin = operador?.tipo === 'admin';
    if ((evento === 'registrada' || evento === 'confirmada') && !ehAdmin) return resposta({ error: 'Só gestores.' }, 403);
    // Coerência evento x status gravado (evita disparar e-mail que não corresponde ao estado real).
    const st = s.status || 'Pendente';
    if (evento === 'confirmada' && st !== 'Confirmada') return resposta({ ignorado: true, motivo: 'status não é Confirmada' });
    if (evento === 'cancelada' && st !== 'Cancelada' && st !== 'Desprezado') return resposta({ ignorado: true, motivo: 'status não é cancelado' });

    // Unidades na rota (nome igual, ignorando acento/maiúscula).
    const { data: unidades } = await db.from('unidades').select('nome, email, ativo');
    const nomes = new Set([norm(s.origem), norm(s.destino)]);
    const naRota = (unidades || []).filter((u: { nome: string; ativo: boolean }) => u.ativo !== false && nomes.has(norm(u.nome)));
    if (!naRota.length) return resposta({ ignorado: true, motivo: 'origem/destino não é Unidade cadastrada' });

    // Destinatários.
    const para = new Map<string, string>();
    naRota.forEach((u: { nome: string; email: string | null }) => { if (u.email && u.email.trim()) para.set(u.email.trim().toLowerCase(), u.nome); });
    const emailSol = String(s.email_solicitante || '').trim().toLowerCase();
    if (emailSol) {
      const { data: perfSol } = await db.from('profiles').select('tipo').ilike('email', emailSol).maybeSingle();
      const eEmailDoGestor = !!s.nome_ext && perfSol?.tipo === 'admin';
      if (!eEmailDoGestor) para.set(emailSol, s.nome_ext || emailSol);
    }
    if (!para.size) return resposta({ ignorado: true, motivo: 'nenhum destinatário com e-mail' });

    // E-mail de contato (editado na tela Perfis de Acesso).
    const { data: cfg } = await db.from('config_sistema').select('valor').eq('chave', 'email_contato_mensagens').maybeSingle();
    const contato = (cfg?.valor || '').trim();

    // Operador (quem definiu o status) e perfil.
    let perfilNome = 'Solicitante';
    if (ehAdmin) {
      perfilNome = 'Administrador';
      if (operador?.perfil_acesso_id) {
        const { data: pa } = await db.from('perfis_acesso').select('nome').eq('id', operador.perfil_acesso_id).maybeSingle();
        if (pa?.nome) perfilNome = pa.nome;
      }
    }
    const operadorTxt = `${operador?.nome || ud.user.email} (${perfilNome})`;

    // Motoristas (nome, telefone, placa).
    const emailsC = [s.condutor_ida, s.condutor_volta].filter(Boolean) as string[];
    const mapaC: Record<string, { nome: string; telefone: string | null; placa: string | null }> = {};
    for (const e of new Set(emailsC)) {
      const { data: c } = await db.from('profiles').select('nome, telefone, placa').ilike('email', e).maybeSingle();
      if (c) mapaC[e.toLowerCase()] = c;
    }
    const descC = (e: string, completo: boolean) => {
      const c = mapaC[e.toLowerCase()];
      if (!c) return semLink(e);
      if (!completo) return semLink(c.nome || e);
      return [semLink(c.nome || e), c.telefone ? `Celular ${semLink(c.telefone)}` : '', c.placa ? `Placa ${semLink(c.placa)}` : ''].filter(Boolean).join(' &middot; ');
    };
    const completo = evento === 'confirmada';
    let linhasCond = '';
    const ida = s.condutor_ida as string | null, volta = s.condutor_volta as string | null;
    const L = (k: string, v: string) => `<p style="font-size:12px;margin:0 0 5px;"><strong>${k}:</strong> ${v}</p>`;
    if (ida && volta && ida.toLowerCase() === volta.toLowerCase()) linhasCond = L('Motorista (ida e volta)', descC(ida, completo));
    else {
      if (ida) linhasCond += L('Motorista (ida)', descC(ida, completo));
      if (volta) linhasCond += L('Motorista (volta)', descC(volta, completo));
      if (!ida && !volta) linhasCond = L('Condutor', '-');
    }

    const cfgEv = {
      registrada: { titulo: 'Solicitação de viagem registrada', status: st, rot: 'Registrada' },
      confirmada: { titulo: 'Viagem confirmada', status: 'Confirmada', rot: 'Confirmada' },
      cancelada: { titulo: 'Viagem cancelada', status: 'Cancelada', rot: 'Cancelada' },
    }[evento as 'registrada' | 'confirmada' | 'cancelada'];
    const [aa, mm, dd] = String(s.data_viagem).split('-');

    const corpo =
      L('Data', esc(dataLonga(s.data_viagem))) +
      L('Horário', `Saída ${esc(hhmm(s.hora_saida))}${s.hora_retorno ? ` &middot; Retorno ${esc(hhmm(s.hora_retorno))}` : ''}`) +
      L('Origem', semLink(s.origem || '-')) + L('Destino', semLink(s.destino || '-')) +
      L('Solicitante', semLink(s.nome_ext || s.email_solicitante || '-')) +
      L('Celular', semLink(s.telefone_ext || '-')) + L('Passageiros', esc(s.qtd_pessoas ?? '-')) +
      linhasCond + L('Status', `<strong>${esc(cfgEv.status)}</strong>`) +
      L(`${cfgEv.rot} em`, esc(agoraBR())) + L(`${cfgEv.rot} por`, esc(operadorTxt));

    const rodape = contato
      ? `Para cancelar ou alterar a viagem, responda este e-mail ou escreva para ${esc(contato)}.`
      : 'Para cancelar ou alterar a viagem, responda este e-mail.';
    const FAVICON_URL = 'https://neil-semed.github.io/MarkCarro_v2/favicon.png';
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Language" content="pt-BR">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no"></head>
<body style="margin:0;padding:0;">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;color:#1e293b;">
  <table role="presentation" style="width:100%;border-collapse:collapse;padding:12px 4px;border-bottom:2px solid #facc15;"><tr>
    <td style="padding:0 10px 0 0;width:28px;"><img src="${FAVICON_URL}" alt="" width="28" height="28" style="width:28px;height:28px;border-radius:6px;display:block;"></td>
    <td><h2 style="margin:0;font-size:15px;color:#1e293b;">MarkCarro | ${cfgEv.titulo}</h2><p style="margin:1px 0 0;font-size:10px;color:#64748b;">SEMED Nova Lima</p></td></tr></table>
  <div style="padding:12px 4px;">${corpo}
    <p style="font-size:10px;color:#64748b;margin-top:14px;">${rodape}<br>Transporte - SEMED.<br>(Essa mensagem foi gerada automaticamente - modelo ${MODELO})</p>
  </div>
</div></body></html>`;

    const payload: Record<string, unknown> = {
      sender: { name: REMETENTE_NOME, email: REMETENTE_EMAIL },
      to: [...para.entries()].map(([email, nome]) => ({ email, name: nome || email })),
      subject: `[MarkCarro] ${cfgEv.titulo} - ${dd}/${mm}/${aa}`,
      htmlContent: html,
    };
    if (contato) payload.replyTo = { email: contato };

    const rb = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const txt = await rb.text();
    if (!rb.ok) return resposta({ error: `Erro ao enviar e-mail (Brevo): ${txt || rb.status}` }, 502);
    return resposta({ success: true, enviados: para.size });
  } catch (e) {
    return resposta({ error: 'Erro interno: ' + ((e as Error)?.message || String(e)) }, 500);
  }
});
