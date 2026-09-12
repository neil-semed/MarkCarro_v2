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
// ============================================================

let _chartsDashboard = {};
const _PALETA_DASHBOARD = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59', '#B8452A', '#37A057'];

function _destruirChart(chave) {
  if (_chartsDashboard[chave]) {
    _chartsDashboard[chave].destroy();
    _chartsDashboard[chave] = null;
  }
}

function renderizarDashboardGestor(solicitacoes, registrosKm) {
  if (typeof Chart === 'undefined') return;

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
  }

  // ---- Solicitações por Status (Pareto: barra + % acumulado) ----
  const canvasStatus = document.getElementById('dash-status-canvas');
  if (canvasStatus) {
    const contagem = {};
    solicitacoes.forEach(s => { const st = s.status || 'Pendente'; contagem[st] = (contagem[st] || 0) + 1; });
    const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    const labels = entradas.map(e => e[0]);
    const valores = entradas.map(e => e[1]);
    const totalStatus = valores.reduce((s, v) => s + v, 0);
    let acumulado = 0;
    const percentuais = valores.map(v => { acumulado += v; return totalStatus > 0 ? Math.round((acumulado / totalStatus) * 100) : 0; });

    _destruirChart('status');
    if (labels.length) {
      _chartsDashboard.status = new Chart(canvasStatus.getContext('2d'), {
        data: {
          labels,
          datasets: [
            { type: 'bar', label: 'Quantidade', data: valores, backgroundColor: '#044AAA', yAxisID: 'yQtd' },
            { type: 'line', label: '% Acumulado', data: percentuais, borderColor: '#D85736', backgroundColor: '#D85736', yAxisID: 'yPct', tension: 0.2 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            yQtd: { type: 'linear', position: 'left', beginAtZero: true, ticks: { precision: 0 } },
            yPct: { type: 'linear', position: 'right', beginAtZero: true, max: 100, grid: { drawOnChartArea: false } }
          }
        }
      });
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

  const canvasKmCondutor = document.getElementById('dash-km-condutor-canvas');
  if (canvasKmCondutor) {
    const entradasKm = Object.entries(kmPorCondutor).sort((a, b) => b[1] - a[1]).slice(0, 10);
    _destruirChart('kmCondutor');
    if (entradasKm.length) {
      _chartsDashboard.kmCondutor = new Chart(canvasKmCondutor.getContext('2d'), {
        type: 'bar',
        data: {
          labels: entradasKm.map(e => nomeCondutor(e[0])),
          datasets: [{ label: 'KM rodado', data: entradasKm.map(e => Math.round(e[1])), backgroundColor: '#044AAA' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }
  }

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

  // ---- Solicitações por setor ----
  const canvasSetores = document.getElementById('dash-setores-canvas');
  if (canvasSetores) {
    const contagemSetores = {};
    solicitacoes.forEach(s => { const setor = s.setor || 'Sem setor'; contagemSetores[setor] = (contagemSetores[setor] || 0) + 1; });
    const topSetores = Object.entries(contagemSetores).sort((a, b) => b[1] - a[1]).slice(0, 12);

    _destruirChart('setores');
    if (topSetores.length) {
      _chartsDashboard.setores = new Chart(canvasSetores.getContext('2d'), {
        type: 'bar',
        data: { labels: topSetores.map(e => e[0]), datasets: [{ label: 'Solicitações', data: topSetores.map(e => e[1]), backgroundColor: '#FF914D' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    }
  }
}

// Expor globalmente
window.carregarDashboardGestor = carregarDashboardGestor;
window.renderizarDashboardGestor = renderizarDashboardGestor;
window.preencherFiltrosDashboard = preencherFiltrosDashboard;
window.aplicarFiltrosDashboard = aplicarFiltrosDashboard;
window.limparFiltrosDashboard = limparFiltrosDashboard;
