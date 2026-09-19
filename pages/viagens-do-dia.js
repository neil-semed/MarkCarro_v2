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
    // condutores uma vez (cache compartilhado, ver pages/minhas-
    // solicitacoes.js) pra poder mostrar NOME em vez de e-mail cru - a
    // policy de SELECT em "profiles" já libera isso pra qualquer usuário
    // autenticado.
    // CORREÇÃO (pedido do usuário, 5ª vez): listarCondutoresParaExibicao()
    // em vez de listarCondutores() - esta tela é só de EXIBIÇÃO (nunca
    // atribui motorista a nada), então não deve perder um condutor que
    // tenha sido desativado depois. Ver comentário completo em api.js.
    if (!cacheCondutoresParaExibicao || !cacheCondutoresParaExibicao.length) {
      try { cacheCondutoresParaExibicao = await listarCondutoresParaExibicao(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    const hojeISO = new Date().toISOString().split('T')[0];
    const dados = await buscarSolicitacoesPorData(hojeISO, hojeISO);
    // PEDIDO DO USUÁRIO ("carregar somente as viagens confirmadas e
    // canceladas do dia"): antes mostrava TODOS os status (Pendente/Em
    // Análise inclusive, que ainda nem têm motorista de verdade atribuído).
    const filtradas = (dados || []).filter(s => s.status === 'Confirmada' || s.status === 'Cancelada');
    renderizarViagensDoDia(filtradas);
  } catch (e) {
    console.error('Erro ao carregar Viagens do Dia:', e);
    if (lista) {
      lista.innerHTML = `<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar as viagens de hoje. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarViagensDoDia()">Tentar de novo</button></div>`;
    }
    Components.Toast.error('Erro ao carregar viagens do dia');
  }
}

function _condutorInfoViagensDoDia(email) {
  if (!email) return '';
  const c = (typeof cacheCondutoresParaExibicao !== 'undefined' ? cacheCondutoresParaExibicao : []).find(x => x.email === email);
  const nome = c?.nome || email;
  return c?.telefone ? `${nome} · ${c.telefone}` : nome;
}

// CORREÇÃO (pedido do usuário: "ida em uma linha, volta em outra linha -
// mostrar o telefone do motorista - se for o mesmo motorista, 'Ida e Volta -
// nome do motorista'"): reaproveita o mesmo padrão de
// linhasEscalacaoCondutores() (pages/agenda-condutor.js), acrescentando o
// telefone do condutor em cada linha.
function _linhasMotoristaViagensDoDia(s) {
  const emailIda = s.condutor_ida || '';
  const emailVolta = s.condutor_volta || '';
  if (!emailIda && !emailVolta) return ['Sem motorista escalado'];
  if (emailIda && emailVolta && emailIda === emailVolta) {
    return [`Ida e Volta - ${_condutorInfoViagensDoDia(emailIda)}`];
  }
  const linhas = [];
  if (emailIda) linhas.push(`Ida - ${_condutorInfoViagensDoDia(emailIda)}`);
  if (emailVolta) linhas.push(`Volta - ${_condutorInfoViagensDoDia(emailVolta)}`);
  return linhas;
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
      ${_linhasMotoristaViagensDoDia(s).map(linha => `<div class="trip-meta-row">${IconesViagem.carro}<span>${linha}</span></div>`).join('')}
    </div>
  `).join('');
}

// Expor globalmente
window.abrirViagensDoDia = abrirViagensDoDia;
window.carregarViagensDoDia = carregarViagensDoDia;
