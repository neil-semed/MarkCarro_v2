// ============================================================
// MARKCARRO - Página: Dashboard do Gestor (KPIs + gráficos)
// ============================================================
// CORREÇÃO: esta tela também continha "Gerenciamento de Solicitações" (a
// tabela operacional de Confirmar/Ocupado/Cancelar/atribuir condutor) -
// separado agora pro seu próprio arquivo (pages/gerenciamento-
// solicitacoes.js) e sua própria tela/pílula de navegação, a pedido do
// usuário: a fusão das duas coisas causava confusão sobre onde estava o
// quê (item 8 do lote de correções - "ao clicar no botão, volta ao
// painel, vai para dashboard - sem acesso ao painel de viagens"). Agora o
// Dashboard cuida só dos indicadores/gráficos.

// Cache própria do Dashboard, independente da usada pela tela de
// Gerenciamento de Solicitações (cacheTodasSolicitacoesGestor, em
// pages/gerenciamento-solicitacoes.js) - cada tela busca seus próprios
// dados, pra não depender da ordem em que o admin visita uma ou outra.
let cacheSolicitacoesDashboard = [];
let cacheRegistrosKmDashboard = [];

// Substitui a antiga proteção baseada em "tbody.children.length > 1" (que
// não existe aqui, já que o Dashboard não tem uma tabela central) - mesmo
// princípio: só pula o recarregamento se já carregou uma vez nesta sessão
// E não foi pedido explicitamente ("Atualizar", ou o pill do topo depois
// de sair e voltar a esta mesma tela sem ter saído do app).
let _dashboardGestorCarregado = false;

async function carregarDashboardGestor(forcarAtualizacao = false) {
  if (!forcarAtualizacao && _dashboardGestorCarregado) return;

  try {
    const [solicitacoes, condutores, registrosKm] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores(),
      listarTodosKM().catch(() => [])
    ]);

    cacheCondutores = condutores || [];
    cacheSolicitacoesDashboard = solicitacoes || [];
    cacheRegistrosKmDashboard = registrosKm || [];
    _dashboardGestorCarregado = true;

    preencherFiltrosDashboard();
    aplicarFiltrosDashboard();
  } catch (e) {
    console.error('Erro ao carregar dashboard:', e);
    Components.Toast.error('Erro ao carregar o Dashboard');
  }
}

// ============================================================
// Filtros do Dashboard (Período / Unidade / Setor / Condutor) - afetam só
// os KPIs e os gráficos abaixo; a tela de Gerenciamento de Solicitações
// (separada) tem seus próprios filtros e sua própria busca.
// ============================================================

function preencherFiltrosDashboard() {
  const selUnidade = document.getElementById('dash-filtro-unidade');
  const selSetor = document.getElementById('dash-filtro-setor');
  const selCondutor = document.getElementById('dash-filtro-condutor');
  if (!selUnidade || !selSetor || !selCondutor) return;

  const valorAtualUnidade = selUnidade.value;
  const valorAtualSetor = selSetor.value;
  const valorAtualCondutor = selCondutor.value;

  const unidades = (cacheUnidades && cacheUnidades.length)
    ? cacheUnidades.slice().sort()
    : [...new Set(cacheSolicitacoesDashboard.map(s => s.unidade).filter(Boolean))].sort();
  selUnidade.innerHTML = '<option value="">Todas</option>' +
    unidades.map(u => `<option value="${u}">${u}</option>`).join('');

  const setores = [...new Set(cacheSolicitacoesDashboard.map(s => s.setor).filter(Boolean))].sort();
  selSetor.innerHTML = '<option value="">Todos</option>' +
    setores.map(s => `<option value="${s}">${s}</option>`).join('');

  const condutoresOrdenados = cacheCondutores.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  selCondutor.innerHTML = '<option value="">Todos</option>' +
    condutoresOrdenados.map(c => `<option value="${c.email}">${c.nome}</option>`).join('');

  // Restaura a seleção anterior, se ainda existir entre as opções (evita
  // "resetar" os filtros toda vez que o botão Atualizar é usado).
  if ([...selUnidade.options].some(o => o.value === valorAtualUnidade)) selUnidade.value = valorAtualUnidade;
  if ([...selSetor.options].some(o => o.value === valorAtualSetor)) selSetor.value = valorAtualSetor;
  if ([...selCondutor.options].some(o => o.value === valorAtualCondutor)) selCondutor.value = valorAtualCondutor;
}

// Aplica o filtro de Período (em dias, mesmo padrão de
// pareto-solic-periodo: 0 = todo o período) sobre uma data-base.
function _dentroDoPeriodo(dataStr, dias) {
  if (dias === 0) return true;
  if (!dataStr) return false;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const d = new Date(dataStr);
  const diffDias = (hoje - d) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= dias;
}

function aplicarFiltrosDashboard() {
  const dias = Number(document.getElementById('dash-filtro-periodo')?.value ?? 0);
  const unidade = document.getElementById('dash-filtro-unidade')?.value || '';
  const setor = document.getElementById('dash-filtro-setor')?.value || '';
  const condutorEmail = document.getElementById('dash-filtro-condutor')?.value || '';

  // Período + Unidade + Setor afetam os KPIs e os gráficos baseados em
  // solicitações (Status, Destinos, Setores).
  let solicitacoesFiltradas = cacheSolicitacoesDashboard.filter(s => _dentroDoPeriodo(s.data_viagem, dias));
  if (unidade) solicitacoesFiltradas = solicitacoesFiltradas.filter(s => s.unidade === unidade);
  if (setor) solicitacoesFiltradas = solicitacoesFiltradas.filter(s => s.setor === setor);

  // Período + Condutor afetam os dois gráficos de KM (registros de KM não
  // têm unidade/setor - são vinculados ao condutor, não à solicitação).
  let registrosFiltrados = cacheRegistrosKmDashboard.filter(r => _dentroDoPeriodo(r.data, dias));
  if (condutorEmail) registrosFiltrados = registrosFiltrados.filter(r => r.email_condutor === condutorEmail);

  renderizarDashboardGestor(solicitacoesFiltradas, registrosFiltrados);
}

function limparFiltrosDashboard() {
  const selPeriodo = document.getElementById('dash-filtro-periodo');
  const selUnidade = document.getElementById('dash-filtro-unidade');
  const selSetor = document.getElementById('dash-filtro-setor');
  const selCondutor = document.getElementById('dash-filtro-condutor');
  if (selPeriodo) selPeriodo.value = '0';
  if (selUnidade) selUnidade.value = '';
  if (selSetor) selSetor.value = '';
  if (selCondutor) selCondutor.value = '';
  aplicarFiltrosDashboard();
}

// ============================================================
// DASHBOARD (KPIs + gráficos) - reúne os indicadores que existiam
// espalhados no sistema antigo em Apps Script (contagens por status, KM
// por condutor, destinos/setores mais frequentes).
//
// CORREÇÃO (layout "muito pobre"): KPIs, "Solicitações por Setor",
// "Solicitações por Status" e "Top Condutores por KM" deixaram de ser
// number-only/Chart.js e passaram a ser cartões "executivos" (ícone +
// listas ranqueadas com barra de progresso, barra segmentada com
// legenda, pódio com avatar de iniciais), inspirados no mockup "Painel
// Executivo" enviado pelo usuário como modelo - só CSS/HTML, sem
// biblioteca de gráfico nem de ícone externa. "Evolução de KM" e
// "Destinos mais Agendados" continuam sendo gráficos de verdade
// (Chart.js), só com o cabeçalho do cartão restilizado.
// ============================================================

let _chartsDashboard = {};
const _PALETA_DASHBOARD = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59', '#B8452A', '#37A057'];
const _CORES_STATUS_DASHBOARD = {
  'Pendente': '#F5A623',
  'Em Análise': '#044AAA',
  'Confirmada': '#46BE6B',
  'Cancelada': '#D85736',
  'Ocupado': '#94A3B8',
  'Desprezado': '#64748B'
};

function _destruirChart(chave) {
  if (_chartsDashboard[chave]) {
    _chartsDashboard[chave].destroy();
    _chartsDashboard[chave] = null;
  }
}

function _pctDashboard(parte, total) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

function renderizarDashboardGestor(solicitacoes, registrosKm) {
  // ---- KPIs ----
  const total = solicitacoes.length;
  const pendentes = solicitacoes.filter(s => ['Pendente', 'Em Análise'].includes(s.status || 'Pendente')).length;
  const aprovadas = solicitacoes.filter(s => s.status === 'Confirmada').length;
  const recusadas = solicitacoes.filter(s => ['Cancelada', 'Ocupado', 'Desprezado'].includes(s.status)).length;

  const elTotal = document.getElementById('stat-total-solic');
  if (elTotal) {
    elTotal.textContent = total;
    document.getElementById('stat-pendentes').textContent = pendentes;
    document.getElementById('stat-aprovadas').textContent = aprovadas;
    document.getElementById('stat-recusadas').textContent = recusadas;

    // Rodapé com % real sobre o total filtrado (não é comparativo de
    // período anterior "fictício" - o app ainda não guarda um histórico
    // pra calcular uma variação de verdade).
    const capTotal = document.getElementById('stat-total-solic-caption');
    const capPendentes = document.getElementById('stat-pendentes-caption');
    const capAprovadas = document.getElementById('stat-aprovadas-caption');
    const capRecusadas = document.getElementById('stat-recusadas-caption');
    if (capTotal) capTotal.textContent = total ? 'no período selecionado' : 'nenhuma solicitação no período';
    if (capPendentes) capPendentes.textContent = `${_pctDashboard(pendentes, total)}% do total`;
    if (capAprovadas) capAprovadas.textContent = `${_pctDashboard(aprovadas, total)}% do total`;
    if (capRecusadas) capRecusadas.textContent = `${_pctDashboard(recusadas, total)}% do total`;
  }

  // ---- Solicitações por Setor (lista ranqueada com barra de progresso) ----
  const listaSetores = document.getElementById('dash-setores-lista');
  if (listaSetores) {
    const contagemSetor = {};
    solicitacoes.forEach(s => { const setor = s.setor || 'Sem setor'; contagemSetor[setor] = (contagemSetor[setor] || 0) + 1; });
    const topSetores = Object.entries(contagemSetor).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (!topSetores.length) {
      listaSetores.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Sem dados no período selecionado.</p>';
    } else {
      listaSetores.innerHTML = topSetores.map(([setor, qtd], i) => {
        const pct = _pctDashboard(qtd, total);
        const cor = _PALETA_DASHBOARD[i % _PALETA_DASHBOARD.length];
        return `
          <div class="ranked-bar-row">
            <div class="flex items-center justify-between gap-2 text-sm mb-1">
              <span class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${cor};"></span>
                <span class="text-slate-700 truncate">${setor}</span>
              </span>
              <span class="text-slate-500 shrink-0">${pct}% <span class="text-slate-400">(${qtd})</span></span>
            </div>
            <div class="ranked-bar-track">
              <div class="ranked-bar-fill" style="width:${pct}%; background:${cor};"></div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // ---- Solicitações por Status (barra segmentada + legenda) ----
  const containerStatus = document.getElementById('dash-status-segmentado');
  if (containerStatus) {
    const contagemStatus = {};
    solicitacoes.forEach(s => { const st = s.status || 'Pendente'; contagemStatus[st] = (contagemStatus[st] || 0) + 1; });
    const entradasStatus = Object.entries(contagemStatus).sort((a, b) => b[1] - a[1]);

    if (!entradasStatus.length) {
      containerStatus.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Sem dados no período selecionado.</p>';
    } else {
      const segmentos = entradasStatus.map(([status, qtd]) => {
        const corSeg = _CORES_STATUS_DASHBOARD[status] || '#94A3B8';
        return `<span style="width:${_pctDashboard(qtd, total)}%; background:${corSeg};" title="${status}: ${qtd}"></span>`;
      }).join('');
      const legendas = entradasStatus.map(([status, qtd]) => {
        const corLeg = _CORES_STATUS_DASHBOARD[status] || '#94A3B8';
        return `
          <div class="seg-legend-row">
            <span class="flex items-center gap-2 min-w-0">
              <span class="seg-legend-dot" style="background:${corLeg};"></span>
              <span class="text-slate-700 truncate">${status}</span>
            </span>
            <span class="text-slate-500 shrink-0">${qtd} <span class="text-slate-400">(${_pctDashboard(qtd, total)}%)</span></span>
          </div>`;
      }).join('');
      containerStatus.innerHTML = `<div class="segbar-track mb-3">${segmentos}</div><div>${legendas}</div>`;
    }
  }

  // ---- KM por condutor (total rodado, só registros com KM final) ----
  const registrosCompletos = (registrosKm || []).filter(r => r.km_final != null && r.km_final !== '');
  const kmPorCondutor = {};
  registrosCompletos.forEach(r => {
    const km = Number(r.km_final) - Number(r.km_inicial);
    kmPorCondutor[r.email_condutor] = (kmPorCondutor[r.email_condutor] || 0) + km;
  });
  const nomeCondutor = email => (cacheCondutores.find(c => c.email === email)?.nome) || email;

  // ---- KM por Categoria de Condutor (Motorista/Motoboy - barra
  // segmentada, mesmo componente visual do card de Status) ----
  const containerCategoria = document.getElementById('dash-categoria-segmentado');
  if (containerCategoria) {
    const categoriaCondutor = email => (cacheCondutores.find(c => c.email === email)?.categoria) || 'Não informada';
    const kmPorCategoria = {};
    Object.entries(kmPorCondutor).forEach(([email, km]) => {
      const cat = categoriaCondutor(email);
      kmPorCategoria[cat] = (kmPorCategoria[cat] || 0) + km;
    });
    const totalKmCategoria = Object.values(kmPorCategoria).reduce((s, v) => s + v, 0);
    const entradasCategoria = Object.entries(kmPorCategoria).sort((a, b) => b[1] - a[1]);
    const _CORES_CATEGORIA = { 'Motorista': '#044AAA', 'Motoboy': '#37A057', 'Não informada': '#94A3B8' };

    if (!entradasCategoria.length) {
      containerCategoria.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Sem registros de KM no período selecionado.</p>';
    } else {
      const segmentosCat = entradasCategoria.map(([cat, km]) => {
        const corCat = _CORES_CATEGORIA[cat] || '#94A3B8';
        return `<span style="width:${_pctDashboard(km, totalKmCategoria)}%; background:${corCat};" title="${cat}: ${Math.round(km)} km"></span>`;
      }).join('');
      const legendasCat = entradasCategoria.map(([cat, km]) => {
        const corCat = _CORES_CATEGORIA[cat] || '#94A3B8';
        return `
          <div class="seg-legend-row">
            <span class="flex items-center gap-2 min-w-0">
              <span class="seg-legend-dot" style="background:${corCat};"></span>
              <span class="text-slate-700 truncate">${cat}</span>
            </span>
            <span class="text-slate-500 shrink-0">${Math.round(km).toLocaleString('pt-BR')} km <span class="text-slate-400">(${_pctDashboard(km, totalKmCategoria)}%)</span></span>
          </div>`;
      }).join('');
      containerCategoria.innerHTML = `<div class="segbar-track mb-3">${segmentosCat}</div><div>${legendasCat}</div>`;
    }
  }

  // ---- Top Condutores por KM (pódio/leaderboard com avatar de iniciais) ----
  const leaderboard = document.getElementById('dash-condutores-leaderboard');
  if (leaderboard) {
    const entradasKm = Object.entries(kmPorCondutor).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!entradasKm.length) {
      leaderboard.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Sem registros de KM no período selecionado.</p>';
    } else {
      const totalKmLeaderboard = entradasKm.reduce((s, e) => s + e[1], 0);
      leaderboard.innerHTML = entradasKm.map(([email, km], i) => {
        const nome = nomeCondutor(email);
        const cor = _PALETA_DASHBOARD[i % _PALETA_DASHBOARD.length];
        return `
          <div class="leader-row">
            <span class="text-xs font-bold text-slate-400 w-5 text-center shrink-0">${i + 1}º</span>
            <span class="leader-avatar" style="background:${cor};">${obterIniciais(nome)}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-slate-800 truncate">${nome}</span>
              <span class="block text-xs text-slate-400">${_pctDashboard(km, totalKmLeaderboard)}% do total do grupo</span>
            </span>
            <span class="text-sm font-semibold text-slate-700 shrink-0">${Math.round(km).toLocaleString('pt-BR')} km</span>
          </div>`;
      }).join('');
    }
  }

  // A partir daqui, só os 2 gráficos que continuam sendo Chart.js de
  // verdade (Evolução de KM, Destinos) - sem Chart.js carregado, os
  // widgets acima (KPIs/ranking/segmentado/leaderboard) continuam
  // funcionando normalmente, então o "return" fica só aqui embaixo.
  if (typeof Chart === 'undefined') return;

  // ---- Evolução de KM por condutor (linha, um dataset por condutor -
  // limitado aos 5 com mais KM total pra não poluir o gráfico) ----
  const canvasKmEvolucao = document.getElementById('dash-km-evolucao-canvas');
  if (canvasKmEvolucao) {
    const top5 = Object.entries(kmPorCondutor).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    const datasPorDia = {};
    registrosCompletos.forEach(r => {
      if (!top5.includes(r.email_condutor)) return;
      datasPorDia[r.data] = datasPorDia[r.data] || {};
      datasPorDia[r.data][r.email_condutor] = (datasPorDia[r.data][r.email_condutor] || 0) + (Number(r.km_final) - Number(r.km_inicial));
    });
    const diasOrdenados = Object.keys(datasPorDia).sort();

    _destruirChart('kmEvolucao');
    if (diasOrdenados.length && top5.length) {
      _chartsDashboard.kmEvolucao = new Chart(canvasKmEvolucao.getContext('2d'), {
        type: 'line',
        data: {
          labels: diasOrdenados.map(formatarDataBR),
          datasets: top5.map((email, i) => ({
            label: nomeCondutor(email),
            data: diasOrdenados.map(d => Math.round(datasPorDia[d]?.[email] || 0)),
            borderColor: _PALETA_DASHBOARD[i % _PALETA_DASHBOARD.length],
            backgroundColor: _PALETA_DASHBOARD[i % _PALETA_DASHBOARD.length],
            tension: 0.2,
            fill: false
          }))
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
      });
    }
  }

  // ---- Destinos mais agendados ----
  const canvasDestinos = document.getElementById('dash-destinos-canvas');
  if (canvasDestinos) {
    const contagemDestinos = {};
    solicitacoes.forEach(s => { if (s.destino) contagemDestinos[s.destino] = (contagemDestinos[s.destino] || 0) + 1; });
    const topDestinos = Object.entries(contagemDestinos).sort((a, b) => b[1] - a[1]).slice(0, 10);

    _destruirChart('destinos');
    if (topDestinos.length) {
      _chartsDashboard.destinos = new Chart(canvasDestinos.getContext('2d'), {
        type: 'bar',
        data: { labels: topDestinos.map(e => e[0]), datasets: [{ label: 'Solicitações', data: topDestinos.map(e => e[1]), backgroundColor: '#46BE6B' }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    }
  }

  // ---- Cancelamentos por Setor (mede desistências) ----
  // "Cancelada" = admin cancelou a corrida; "Desprezado" = o próprio
  // solicitante desistiu da agenda. Os dois juntam pra medir desistência
  // por setor, pedido do usuário.
  const canvasCancelSetor = document.getElementById('dash-cancelamentos-setor-canvas');
  if (canvasCancelSetor) {
    const contagemCancelSetor = {};
    solicitacoes.forEach(s => {
      if (s.status === 'Cancelada' || s.status === 'Desprezado') {
        const setor = s.setor || 'Não informado';
        contagemCancelSetor[setor] = (contagemCancelSetor[setor] || 0) + 1;
      }
    });
    const topCancelSetor = Object.entries(contagemCancelSetor).sort((a, b) => b[1] - a[1]).slice(0, 10);

    _destruirChart('cancelamentosSetor');
    if (topCancelSetor.length) {
      _chartsDashboard.cancelamentosSetor = new Chart(canvasCancelSetor.getContext('2d'), {
        type: 'bar',
        data: { labels: topCancelSetor.map(e => e[0]), datasets: [{ label: 'Cancelamentos', data: topCancelSetor.map(e => e[1]), backgroundColor: '#DC2626' }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    } else {
      canvasCancelSetor.getContext('2d').clearRect(0, 0, canvasCancelSetor.width, canvasCancelSetor.height);
    }
  }

}

// Expor globalmente
window.carregarDashboardGestor = carregarDashboardGestor;
window.renderizarDashboardGestor = renderizarDashboardGestor;
window.preencherFiltrosDashboard = preencherFiltrosDashboard;
window.aplicarFiltrosDashboard = aplicarFiltrosDashboard;
window.limparFiltrosDashboard = limparFiltrosDashboard;
