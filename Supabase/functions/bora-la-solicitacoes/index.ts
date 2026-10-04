// ============================================================
// MARKCARRO | Edge Function: bora-la-solicitacoes
//
// Ponte para o Bora Lá consultar e criar solicitações de transporte DIRETO no
// MarkCarro (tabela solicitacoes). O Bora Lá não guarda nada na própria base e
// não gerencia corridas (status/condutor continuam só no MarkCarro).
//
// Segurança (mesmo modelo da km-bridge, no sentido inverso):
//   1) Toda chamada vem com "Authorization: Bearer <token>" da sessão do usuário
//      logado no Bora Lá.
//   2) O token é validado no auth server do Bora Lá (GET .../auth/v1/user) - o
//      e-mail usado aqui é o que o Bora Lá confirma, nunca um e-mail do corpo.
//   3) A permissão (abas "Solicitações Carro"/"Nova Solicitação Carro") também é
//      conferida no Bora Lá: Admin sempre; perfil administrativo pelo perfil de
//      acesso (has_access_permission); perfis nativos por role_screen_permissions.
//   O login é o mesmo e-mail nas duas aplicações: a lista traz só as solicitações
//   desse e-mail.
//
// Ações (POST, body JSON com "action"):
//   contexto  {}                      -> dados do usuário, unidades e locais
//   setores   { unidade }             -> setores da unidade (tabelas_apoio)
//   listar    {}                      -> solicitações do e-mail logado + condutores
//   criar     { datas[], hora_saida, hora_retorno, origem, destino, justificativa,
//               tipo_viagem, qtd_pessoas, unidade, setor }
//             Escola: unidade = unidade logada, setor = "ADM Escolar", nome e
//             telefone do solicitante = os do Bora Lá.
//   cancelar  { id }                  -> status "Desprezado" (mesma regra do MarkCarro:
//                                        até 30 min antes da saída)
//
// COMO PUBLICAR (no projeto MarkCarro):
//   1. supabase login
//   2. supabase link --project-ref gvtgtdhfciqegnjqcqlf
//   3. supabase functions deploy bora-la-solicitacoes --no-verify-jwt
//      (--no-verify-jwt: o token é do Bora Lá; a validação é feita aqui dentro)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Projeto Bora Lá - chave pública (anon), a mesma que já está em config.js.
const BORA_LA_URL = 'https://rjuzhscynuleypaewgak.supabase.co';
const BORA_LA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdXpoc2N5bnVsZXlwYWV3Z2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTQwNDAsImV4cCI6MjEwNDIzMDA0MH0.enT2gJB4dy2xz_Z91tPY4ysoJ-GEEn2dpo_RHiy5jAs';

const TELA_LISTA = 'carrosolicitacoes';
const TELA_NOVA = 'carronova';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

async function boraGet(path: string, token: string) {
  const resp = await fetch(`${BORA_LA_URL}${path}`, { headers: { apikey: BORA_LA_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!resp.ok) return null;
  return await resp.json().catch(() => null);
}

async function boraRpc(fn: string, args: Record<string, unknown>, token: string) {
  const resp = await fetch(`${BORA_LA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: BORA_LA_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!resp.ok) return null;
  return await resp.json().catch(() => null);
}

type UsuarioBora = { id: string; email: string; role: string; nome: string; telefone: string; escola: string | null; token: string };

async function usuarioDoBoraLa(token: string): Promise<UsuarioBora | null> {
  const user = await boraGet('/auth/v1/user', token);
  if (!user?.id || !user?.email) return null;
  const perfis = await boraGet(`/rest/v1/profiles?id=eq.${user.id}&select=*`, token);
  const p = Array.isArray(perfis) ? perfis[0] : null;
  if (!p || p.active === false) return null;
  let escola: string | null = null;
  if (p.role === 'escola' && p.school_id) {
    const escolas = await boraGet(`/rest/v1/schools?id=eq.${p.school_id}&select=name`, token);
    escola = Array.isArray(escolas) && escolas[0]?.name ? String(escolas[0].name) : null;
  }
  return {
    id: user.id,
    email: String(user.email).trim().toLowerCase(),
    role: String(p.role || ''),
    nome: String(p.full_name || user.user_metadata?.full_name || user.email),
    telefone: String(p.phone || ''),
    escola,
    token,
  };
}

async function podeVer(u: UsuarioBora, tela: string): Promise<boolean> {
  if (u.role === 'admin') return true;
  if (u.role === 'operacional') return (await boraRpc('has_access_permission', { p_screen_key: tela, p_requires_edit: false }, u.token)) === true;
  const linhas = await boraGet(`/rest/v1/role_screen_permissions?role=eq.${encodeURIComponent(u.role)}&screen_key=eq.${tela}&select=can_view`, u.token);
  return Array.isArray(linhas) && linhas[0]?.can_view === true;
}

// E-mail usado em ilike (sem diferenciar maiúsculas): "_" e "%" viram literais.
function emailLike(e: string) { return e.replace(/[\\%_]/g, (m) => '\\' + m); }

function dataBR(d: string) { const [y, m, dd] = String(d || '').slice(0, 10).split('-'); return y ? `${dd}/${m}/${y}` : '-'; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Sessão do Bora Lá não informada.' }, 401);
  const u = await usuarioDoBoraLa(token);
  if (!u) return json({ error: 'Sessão do Bora Lá inválida ou expirada. Entre novamente.' }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const [verLista, verNova] = await Promise.all([podeVer(u, TELA_LISTA), podeVer(u, TELA_NOVA)]);
  if (!verLista && !verNova) return json({ error: 'Seu perfil no Bora Lá não tem acesso às solicitações de carro.' }, 403);

  const { data: perfilMc } = await db.from('profiles').select('nome, unidade, setor, telefone').ilike('email', emailLike(u.email)).maybeSingle();

  async function responsavelSetor(unidade: string, setor: string): Promise<string | null> {
    const { data } = await db.from('tabelas_apoio').select('email').eq('unidade', unidade).eq('setor', setor).maybeSingle();
    return data?.email || null;
  }

  try {
    if (action === 'contexto') {
      const [{ data: apoio }, { data: locais }] = await Promise.all([
        db.from('tabelas_apoio').select('unidade').order('unidade'),
        db.from('locais').select('nome').order('nome'),
      ]);
      return json({
        usuario: { email: u.email, nome: u.nome, telefone: u.telefone, role: u.role, escola: u.escola },
        perfil_mc: perfilMc || null,
        unidades: [...new Set((apoio || []).map((r: { unidade: string }) => r.unidade).filter(Boolean))],
        locais: (locais || []).map((r: { nome: string }) => r.nome),
        pode_lista: verLista, pode_nova: verNova,
        pode_recorrencia: u.role === 'admin',
      });
    }

    if (action === 'setores') {
      const unidade = String(body.unidade || '');
      const { data } = await db.from('tabelas_apoio').select('setor').eq('unidade', unidade).order('setor');
      return json({ setores: [...new Set((data || []).map((r: { setor: string }) => r.setor).filter(Boolean))] });
    }

    if (action === 'listar') {
      if (!verLista) return json({ error: 'Sem acesso à aba Solicitações Carro.' }, 403);
      const { data, error } = await db.from('solicitacoes').select('*').ilike('email_solicitante', emailLike(u.email)).order('data_solicitacao', { ascending: false }).limit(500);
      if (error) throw error;
      const emails = [...new Set((data || []).flatMap((s: Record<string, string>) => [s.condutor_ida, s.condutor_volta]).filter(Boolean))];
      let condutores: unknown[] = [];
      if (emails.length) {
        const { data: c } = await db.from('profiles').select('email, nome, telefone, capacidade').in('email', emails);
        condutores = c || [];
      }
      return json({ solicitacoes: data || [], condutores });
    }

    if (action === 'criar') {
      if (!verNova) return json({ error: 'Sem acesso à aba Nova Solicitação Carro.' }, 403);
      const txt = (v: unknown) => String(v ?? '').trim();
      const escola = !!u.escola;
      const unidade = escola ? u.escola! : txt(body.unidade);
      const setor = escola ? 'ADM Escolar' : txt(body.setor);
      const base = {
        email_solicitante: u.email,
        // Escola (ou quem não tem cadastro no MarkCarro): nome e telefone vêm do Bora Lá.
        nome_ext: escola || !perfilMc ? u.nome : null,
        telefone_ext: escola || !perfilMc ? (u.telefone || null) : null,
        unidade, setor,
        hora_saida: txt(body.hora_saida), hora_retorno: txt(body.hora_retorno),
        origem: txt(body.origem), destino: txt(body.destino), justificativa: txt(body.justificativa),
        tipo_viagem: ['Motorista', 'Motoboy'].includes(txt(body.tipo_viagem)) ? txt(body.tipo_viagem) : 'Motorista',
        qtd_pessoas: Math.max(1, parseInt(String(body.qtd_pessoas), 10) || 1),
      };
      let datas: string[] = Array.isArray(body.datas) ? body.datas.map(txt).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
      if (u.role !== 'admin') datas = datas.slice(0, 1); // recorrência só para Admin, como no MarkCarro
      datas = datas.slice(0, 200);
      if (!datas.length || !base.unidade || !base.setor || !base.hora_saida || !base.hora_retorno || !base.origem || !base.destino || !base.justificativa) {
        return json({ error: 'Preencha todos os campos obrigatórios.' }, 400);
      }
      const { data, error } = await db.from('solicitacoes').insert(datas.map((d) => ({ ...base, data_viagem: d }))).select('id');
      if (error) throw error;
      const resp = await responsavelSetor(unidade, setor);
      if (resp) {
        await db.from('notificacoes').insert({ email_destinatario: resp, tipo: 'nova_solicitacao_setor', mensagem: `${u.nome} criou uma nova solicitação de viagem (${base.origem} → ${base.destino}).`, lida: false });
      }
      return json({ criadas: (data || []).length });
    }

    if (action === 'cancelar') {
      if (!verLista) return json({ error: 'Sem acesso à aba Solicitações Carro.' }, 403);
      const { data: s, error } = await db.from('solicitacoes').select('*').eq('id', body.id).maybeSingle();
      if (error) throw error;
      if (!s || String(s.email_solicitante || '').trim().toLowerCase() !== u.email) return json({ error: 'Solicitação não encontrada.' }, 404);
      if (['Cancelada', 'Desprezado'].includes(s.status)) return json({ error: 'Esta solicitação já está cancelada.' }, 400);
      if (s.data_viagem && s.hora_saida) {
        // Horário de Brasília (UTC-3).
        const saida = new Date(`${s.data_viagem}T${String(s.hora_saida).slice(0, 5)}:00-03:00`);
        if (!isNaN(saida.getTime()) && saida.getTime() - Date.now() <= 30 * 60 * 1000) {
          return json({ error: 'Não é mais possível cancelar: faltam menos de 30 minutos para a saída.' }, 400);
        }
      }
      const { error: errUp } = await db.from('solicitacoes').update({ status: 'Desprezado' }).eq('id', s.id);
      if (errUp) throw errUp;
      const mensagem = `${u.nome} cancelou a solicitação de ${dataBR(s.data_viagem)} às ${String(s.hora_saida || '').slice(0, 5)} (${s.origem} → ${s.destino}).`;
      const { data: gestores } = await db.from('profiles').select('email').eq('tipo', 'admin').eq('ativo', true);
      const avisos = (gestores || []).map((g: { email: string }) => ({ email_destinatario: g.email, tipo: 'cancelamento_solicitante', mensagem, lida: false }));
      const resp = s.unidade && s.setor ? await responsavelSetor(s.unidade, s.setor) : null;
      if (resp) avisos.push({ email_destinatario: resp, tipo: 'cancelamento_solicitante', mensagem, lida: false });
      if (avisos.length) await db.from('notificacoes').insert(avisos);
      return json({ ok: true });
    }

    return json({ error: 'Ação desconhecida.' }, 400);
  } catch (err) {
    return json({ error: (err as Error)?.message || 'Erro inesperado no MarkCarro.' }, 500);
  }
});
