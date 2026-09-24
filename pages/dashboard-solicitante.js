// ============================================================
// MARKCARRO - Página: Dashboard do Solicitante
// ============================================================
// Tela nova, pedida pelo usuário pra virar a tela inicial do perfil
// Solicitante (era Minhas Solicitações antes): mostra os dados PRÓPRIOS do
// solicitante (cartões + gráfico de status) e, embaixo, um resumo do SETOR
// dele (unidade+setor, incluindo colegas) - só de forma agregada (cartões +
// gráfico), nunca lista as solicitações do setor uma a uma.
//
// O bloco "Meu setor" depende da policy de RLS adicionada em
// supabase_rls_dashboard_solicitante.sql. Sem ela, buscarSolicitacoesPorSetor
// simplesmente volta só as próprias solicitações do usuário (o Postgres
// filtra antes mesmo do JS rodar) - os cartões do setor não vão dar erro,
// só vão mostrar os mesmos números da seção "Meus dados".

let cacheDashSolMeuPeriodo = [];
let cacheDashSolSetorPeriodo = [];
const _chartsDashSol = { meu: null, setor: null };

function abrirDashboardSolicitante() {
  esconderTodasTelas();
  document.getElementById('tela-dashboard-solicitante').classList.remove('hidden');
  marcarAbaAtiva('dashboard-solicitante');
  carregarDashboardSolicitante();
}

async function carregarDashboardSolicitante() {
  if (!usuarioAtual) return;

  // PEDIDO DO USUÁRIO ("retirar unidade e setor da tela"): o rótulo que
  // mostrava "Setor: X · Unidade: Y" (elemento "dashsol-setor-label") foi
  // removido do HTML - os valores em si continuam usados só internamente,
  // pra buscar os dados agregados do setor logo abaixo.
  const unidade = usuarioAtual.unidade || '';
  const setor = usuarioAtual.setor || '';

  try {
    const [minhas, doSetor] = await Promise.all([
      buscarSolicitacoesPorEmail(usuarioAtual.email),
      (unidade && setor) ? buscarSolicitacoesPorSetor(unidade, setor).catch(() => []) : Promise.resolve([])
    ]);
    cacheDashSolMeuPeriodo = minhas || [];
    // "Meu setor" inclui as próprias solicitações também (elas são do
    // setor); não precisa somar às "minhas" separadamente.
    cacheDashSolSetorPeriodo = doSetor || [];
    aplicarFiltroDashboardSolicitante();
  } catch (e) {
    console.error('Erro ao carregar Dashboard do Solicitante:', e);
    Components.Toast.error('Erro ao carregar o dashboard');
  }
}

function aplicarFiltroDashboardSolicitante() {
  const dias = Number(document.getElementById('dashsol-filtro-periodo')?.value ?? 0);
  const minhasFiltradas = cacheDashSolMeuPeriodo.filter(s => _dentroDoPeriodoDashSol(s.data_viagem, dias));
  const setorFiltrado = cacheDashSolSetorPeriodo.filter(s => _dentroDoPeriodoDashSol(s.data_viagem, dias));

  _renderizarBlocoDashSol(minhasFiltradas, {
    total: 'dashsol-meu-total',
    pendentes: 'dashsol-meu-pendentes',
    aprovadas: 'dashsol-meu-aprovadas',
    ocupadas: 'dashsol-meu-ocupadas',
    canceladas: 'dashsol-meu-canceladas'
  }, 'dashsol-meu-status-canvas', 'meu');

  _renderizarBlocoDashSol(setorFiltrado, {
    total: 'dashsol-setor-total',
    pendentes: 'dashsol-setor-pendentes',
    aprovadas: 'dashsol-setor-aprovadas',
    ocupadas: 'dashsol-setor-ocupadas',
    canceladas: 'dashsol-setor-canceladas'
  }, 'dashsol-setor-status-canvas', 'setor');
}

// Mesma regra de período usada no Dashboard do Gestor (0 = "Tudo").
function _dentroDoPeriodoDashSol(dataStr, dias) {
  if (dias === 0) return true;
  if (!dataStr) return false;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const d = new Date(dataStr);
  const diffDias = (hoje - d) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= dias;
}

// Mesmo agrupamento de status usado no Dashboard do Gestor (Pendente/Em
// Análise = pendentes; Confirmada = aprovadas; Cancelada/Desprezado =
// canceladas), pra manter os números comparáveis entre as duas telas.
// PEDIDO DO USUÁRIO ("colocar card para Ocupadas, conforme o registro de
// status"): "Ocupado" tinha o próprio status no banco mas era só somado
// dentro de "Canceladas" aqui - agora sai de lá e ganha contagem/cartão
// próprios (idsKpi.ocupadas).
function _renderizarBlocoDashSol(dados, idsKpi, idCanvas, chaveChart) {
  const total = dados.length;
  const pendentes = dados.filter(s => ['Pendente', 'Em Análise'].includes(s.status || 'Pendente')).length;
  const aprovadas = dados.filter(s => s.status === 'Confirmada').length;
  const ocupadas = dados.filter(s => s.status === 'Ocupado').length;
  const canceladas = dados.filter(s => ['Cancelada', 'Desprezado'].includes(s.status)).length;

  const elTotal = document.getElementById(idsKpi.total);
  if (elTotal) elTotal.textContent = total;
  const elPend = document.getElementById(idsKpi.pendentes);
  if (elPend) elPend.textContent = pendentes;
  const elApr = document.getElementById(idsKpi.aprovadas);
  if (elApr) elApr.textContent = aprovadas;
  const elOcup = document.getElementById(idsKpi.ocupadas);
  if (elOcup) elOcup.textContent = ocupadas;
  const elCanc = document.getElementById(idsKpi.canceladas);
  if (elCanc) elCanc.textContent = canceladas;

  const canvas = document.getElementById(idCanvas);
  if (!canvas || typeof Chart === 'undefined') return;

  const contagem = {};
  dados.forEach(s => { const st = s.status || 'Pendente'; contagem[st] = (contagem[st] || 0) + 1; });
  const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  const labels = entradas.map(e => e[0]);
  const valores = entradas.map(e => e[1]);

  if (_chartsDashSol[chaveChart]) {
    _chartsDashSol[chaveChart].destroy();
    _chartsDashSol[chaveChart] = null;
  }
  if (!labels.length) return;

  const paleta = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59'];
  _chartsDashSol[chaveChart] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Quantidade', data: valores, backgroundColor: labels.map((_, i) => paleta[i % paleta.length]) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

window.abrirDashboardSolicitante = abrirDashboardSolicitante;
window.carregarDashboardSolicitante = carregarDashboardSolicitante;
window.aplicarFiltroDashboardSolicitante = aplicarFiltroDashboardSolicitante;
