// ============================================================
// MARKCARRO - Página: Viagens do Dia (Solicitante)
// ============================================================
// Pedido do usuário: "criar uma tela para apresentar todas as viagens do
// dia - cards empilhados mostrando o horário de saída e retorno, origem
// e destino, solicitante e motorista escalado - usar cores direfentes".
// Confirmado via pergunta ao usuário: escopo = TODA A ORGANIZAÇÃO (não
// só o próprio setor), cores = por STATUS da viagem (mesmo padrão já
// usado nos outros ".trip-card" do app), local = nova aba na barra
// inferior do Solicitante.
//
// IMPORTANTE: como isso é "toda a organização" (não só as próprias
// solicitações nem só o próprio setor), depende de uma policy de RLS
// nova - ver supabase_rls_viagens_do_dia_solicitante.sql. Sem rodar
// aquele SQL uma vez no Supabase, esta tela carrega vazia pra um
// solicitante (o Postgres devolve só as próprias linhas, mesmo pedindo
// tudo - RLS filtra antes do JS aqui rodar).

async function abrirViagensDoDia() {
  esconderTodasTelas();
  document.getElementById('tela-viagens-do-dia').classList.remove('hidden');
  marcarAbaAtiva('viagens-do-dia');
  await carregarViagensDoDia();
}

async function carregarViagensDoDia() {
  const lista = document.getElementById('lista-viagens-do-dia');
  if (lista) lista.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Carregando...</div>';

  try {
    // Mesmo princípio já usado na Agenda Geral do Condutor: carrega os
    // condutores uma vez (cache compartilhado, ver app.js) pra poder
    // mostrar NOME em vez de e-mail cru - a policy de SELECT em
    // "profiles" já libera isso pra qualquer usuário autenticado.
    if (!cacheCondutores || !cacheCondutores.length) {
      try { cacheCondutores = await listarCondutores(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    const hojeISO = new Date().toISOString().split('T')[0];
    const dados = await buscarSolicitacoesPorData(hojeISO, hojeISO);
    renderizarViagensDoDia(dados || []);
  } catch (e) {
    console.error('Erro ao carregar Viagens do Dia:', e);
    if (lista) {
      lista.innerHTML = `<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar as viagens de hoje. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarViagensDoDia()">Tentar de novo</button></div>`;
    }
    Components.Toast.error('Erro ao carregar viagens do dia');
  }
}

function _nomeCondutorViagensDoDia(email) {
  if (!email) return '';
  const c = (typeof cacheCondutores !== 'undefined' ? cacheCondutores : []).find(x => x.email === email);
  return c?.nome || email;
}

function _motoristaEscaladoTexto(s) {
  const partes = [];
  if (s.condutor_ida) partes.push(`Ida: ${_nomeCondutorViagensDoDia(s.condutor_ida)}`);
  if (s.condutor_volta) partes.push(`Volta: ${_nomeCondutorViagensDoDia(s.condutor_volta)}`);
  return partes.join(' · ') || 'Sem motorista escalado';
}

function renderizarViagensDoDia(dados) {
  const lista = document.getElementById('lista-viagens-do-dia');
  const contador = document.getElementById('contador-viagens-do-dia');
  if (!lista) return;

  if (contador) contador.textContent = dados.length;

  if (!dados.length) {
    lista.innerHTML = '<p class="text-sm text-slate-400 py-10 text-center">Nenhuma viagem hoje.</p>';
    return;
  }

  // Ordena por horário de saída - mais cedo primeiro.
  const ordenados = [...dados].sort((a, b) => (a.hora_saida || '').localeCompare(b.hora_saida || ''));

  lista.innerHTML = ordenados.map(s => `
    <div class="trip-card ${classeCorBordaViagem(s.status)}">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
        </div>
        <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
      </div>
      <div class="trip-route">
        <div class="trip-route-point origem"><span class="trip-route-label">Origem</span>${s.origem || '—'}</div>
        <div class="trip-route-point destino"><span class="trip-route-label">Destino</span>${s.destino || '—'}</div>
      </div>
      <div class="trip-meta-row">${IconesViagem.usuario}<span>${s.nome_ext || s.email_solicitante}</span></div>
      <div class="trip-meta-row">${IconesViagem.carro}<span>${_motoristaEscaladoTexto(s)}</span></div>
    </div>
  `).join('');
}

// Expor globalmente
window.abrirViagensDoDia = abrirViagensDoDia;
window.carregarViagensDoDia = carregarViagensDoDia;
