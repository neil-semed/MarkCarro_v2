// ============================================================
// MARKCARRO - Página: Dashboard do Condutor
// ============================================================
// Pedido do usuário ("app do motorista: criar dashboard, conforme o
// anexo"). O modelo enviado (app "Bora Lá - Excursões") tem um dashboard
// fleet-wide, pensado pro Admin acompanhar vários motoristas/unidades ao
// mesmo tempo (cartões de Pendentes/Aprovadas/Desaprovadas, gráficos por
// mês e por unidade). Isso não se aplica ao Condutor do MarkCarro, que só
// enxerga as PRÓPRIAS corridas - adaptado aqui pro mesmo padrão de
// "escopo próprio" já usado no Dashboard do Solicitante
// (pages/dashboard-solicitante.js): cartões + gráfico de status, e mais
// dois blocos específicos do condutor (Km rodado, vindo do Registro de
// Km, e a lista de Próximas Viagens dos 3 próximos dias).

let cacheDashCondViagens = [];
let cacheDashCondKm = [];
const _chartsDashCond = { status: null, km: null, mes: null, unidade: null };

// Início (segunda-feira) e fim (domingo) da semana ATUAL - usado pelo
// cartão "Acumulado da Semana" (pedido do usuário). getDay() no
// JavaScript: 0=domingo...6=sábado - o cálculo abaixo sempre volta pra
// segunda-feira mais recente (inclusive hoje, se hoje já for segunda).
function _limitesSemanaAtual() {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=domingo
  const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() + diffSegunda);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  const iso = d => d.toISOString().split('T')[0];
  return { inicio: iso(segunda), fim: iso(domingo) };
}

function abrirDashboardCondutor() {
  esconderTodasTelas();
  document.getElementById('tela-dashboard-condutor').classList.remove('hidden');
  marcarAbaAtiva('dashboard-condutor');
  carregarDashboardCondutor();
}

async function carregarDashboardCondutor() {
  if (!usuarioAtual) return;
  try {
    const hojeISO = new Date().toISOString().split('T')[0];
    const [viagens, km] = await Promise.all([
      buscarSolicitacoesPorCondutor(usuarioAtual.email),
      buscarKM_porPeriodo(usuarioAtual.email, '2020-01-01', hojeISO).catch(() => [])
    ]);
    cacheDashCondViagens = viagens || [];
    cacheDashCondKm = km || [];
    aplicarFiltroDashboardCondutor();
  } catch (e) {
    console.error('Erro ao carregar Dashboard do Condutor:', e);
    Components.Toast.error('Erro ao carregar o dashboard');
  }
}

// "Viagens Hoje" e "Próximas Viagens" são sempre relativos a AGORA -
// diferente do filtro de período do select (que só afeta os cartões
// agregados e os gráficos, igual ao Dashboard do Solicitante).
function _renderizarHojeEProximasDashCond() {
  const hojeISO = new Date().toISOString().split('T')[0];
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const limiteISO = limite.toISOString().split('T')[0];

  // PEDIDO DO USUÁRIO: "Viagens do Dia"/"Passageiros do Dia" contam só
  // viagens já CONFIRMADAS (aprovadas) - antes "hoje" contava qualquer
  // status que não fosse Cancelada/Desprezado, incluindo Pendente/Em
  // Análise (viagem que pode nem sair, ainda sem condutor de verdade).
  const aprovada = s => (s.status || 'Pendente') === 'Confirmada';

  const hoje = cacheDashCondViagens.filter(s => s.data_viagem === hojeISO && aprovada(s));
  const elHoje = document.getElementById('dashcond-hoje');
  if (elHoje) elHoje.textContent = hoje.length;

  const passageirosDia = hoje.reduce((soma, s) => soma + (Number(s.qtd_pessoas) || 0), 0);
  const elPassageirosDia = document.getElementById('dashcond-passageiros-dia');
  if (elPassageirosDia) elPassageirosDia.textContent = passageirosDia;

  // PEDIDO DO USUÁRIO: "Acumulado da Semana" - viagens aprovadas dentro da
  // semana atual (segunda a domingo), independente do filtro de período.
  const { inicio: inicioSemana, fim: fimSemana } = _limitesSemanaAtual();
  const semana = cacheDashCondViagens.filter(s =>
    s.data_viagem >= inicioSemana && s.data_viagem <= fimSemana && aprovada(s)
  );
  const elSemana = document.getElementById('dashcond-semana');
  if (elSemana) elSemana.textContent = semana.length;

  renderizarViagensHojeDashCond(hoje);

  // "Próximas Viagens" (3 dias) continua mostrando qualquer status que não
  // seja Cancelada/Desprezado (diferente do cartão/lista "Hoje", que agora
  // só conta Confirmada) - faz sentido o motorista ver com antecedência
  // até uma corrida ainda Pendente, pra já ficar de olho.
  const ativa = s => !['Cancelada', 'Desprezado'].includes(s.status);
  const proximas = cacheDashCondViagens
    .filter(s => s.data_viagem > hojeISO && s.data_viagem <= limiteISO && ativa(s))
    .sort((a, b) => (a.data_viagem + (a.hora_saida || '')).localeCompare(b.data_viagem + (b.hora_saida || '')));
  const elProximas = document.getElementById('dashcond-proximas');
  if (elProximas) elProximas.textContent = proximas.length;

  const lista = document.getElementById('dashcond-proximas-lista');
  if (!lista) return;
  if (!proximas.length) {
    lista.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Nenhuma viagem nos próximos 3 dias.</p>';
    return;
  }
  lista.innerHTML = proximas.map(s => {
    const papel = mesmoEmail(s.condutor_ida, usuarioAtual.email) && mesmoEmail(s.condutor_volta, usuarioAtual.email)
      ? 'Ida e Volta'
      : mesmoEmail(s.condutor_ida, usuarioAtual.email) ? 'Ida' : 'Volta';
    return `
      <div class="trip-card ${classeCorBordaViagem(s.status)}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
            <p class="text-xs text-slate-500 mt-0.5">${formatarDataBR(s.data_viagem)}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <span class="trip-tag mt-2 inline-block">${papel}</span>
        <div class="trip-route">
          <div class="trip-route-point origem"><span class="trip-route-label">Origem</span>${s.origem || '—'}</div>
          <div class="trip-route-point destino"><span class="trip-route-label">Destino</span>${s.destino || '—'}</div>
        </div>
      </div>`;
  }).join('');
}

// PEDIDO DO USUÁRIO: "apresentar viagens adicionadas do dia (somente
// aprovadas). Exemplo: viagem criada hoje para hoje mesmo, foi atribuída ao
// motorista Sérgio - aparece aqui, com destaque de cor e ícone de atenção."
// "hoje" já vem filtrado (só Confirmada, data_viagem = hoje) por quem
// chama esta função. Aqui só falta identificar quais dessas foram criadas
// no MESMO dia da viagem (corrida de última hora, mesmo conceito de "extra"
// já usado em gerenciamento-solicitacoes.js pra notificar o condutor) e
// destacar essas visualmente, pra ele não passar batido por uma atribuição
// recente.
function renderizarViagensHojeDashCond(hoje) {
  const lista = document.getElementById('dashcond-hoje-lista');
  if (!lista) return;

  if (!hoje.length) {
    lista.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Nenhuma viagem aprovada para hoje.</p>';
    return;
  }

  const ordenadas = hoje.slice().sort((a, b) => (a.hora_saida || '').localeCompare(b.hora_saida || ''));

  lista.innerHTML = ordenadas.map(s => {
    const ehUltimaHora = (s.data_solicitacao || '').slice(0, 10) === s.data_viagem;
    const papel = mesmoEmail(s.condutor_ida, usuarioAtual.email) && mesmoEmail(s.condutor_volta, usuarioAtual.email)
      ? 'Ida e Volta'
      : mesmoEmail(s.condutor_ida, usuarioAtual.email) ? 'Ida' : 'Volta';
    return `
      <div class="trip-card ${ehUltimaHora ? '' : classeCorBordaViagem(s.status)}" ${ehUltimaHora ? 'style="border-left-color:#FF914D; background:#fff7ed;"' : ''}>
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="trip-time">${formatarHoraBR(s.hora_saida)}${s.hora_retorno ? ` <span class="text-slate-300">–</span> ${formatarHoraBR(s.hora_retorno)}` : ''}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        ${ehUltimaHora ? `<div class="trip-meta-row" style="color:#c2410c;"><span aria-hidden="true">⚠️</span><span class="font-semibold">Atribuição de última hora - agendada hoje para hoje</span></div>` : ''}
        <span class="trip-tag mt-2 inline-block">${papel}</span>
        <div class="trip-route">
          <div class="trip-route-point origem"><span class="trip-route-label">Origem</span>${s.origem || '—'}</div>
          <div class="trip-route-point destino"><span class="trip-route-label">Destino</span>${s.destino || '—'}</div>
        </div>
      </div>`;
  }).join('');
}

// Mesma regra de período (0 = "Tudo") usada no Dashboard do Gestor e no
// Dashboard do Solicitante, pra manter os números comparáveis entre telas.
function _dentroDoPeriodoDashCond(dataStr, dias) {
  if (dias === 0) return true;
  if (!dataStr) return false;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const d = new Date(dataStr);
  const diffDias = (hoje - d) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= dias;
}

function aplicarFiltroDashboardCondutor() {
  _renderizarHojeEProximasDashCond();

  const dias = Number(document.getElementById('dashcond-filtro-periodo')?.value ?? 30);

  const viagensPeriodo = cacheDashCondViagens.filter(s => _dentroDoPeriodoDashCond(s.data_viagem, dias));
  const confirmadas = viagensPeriodo.filter(s => s.status === 'Confirmada');
  const canceladas = viagensPeriodo.filter(s => ['Cancelada', 'Desprezado'].includes(s.status));

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dashcond-confirmadas', confirmadas.length);
  set('dashcond-canceladas', canceladas.length);

  // Km rodado no período (só registros com KM final já lançado).
  const kmPeriodo = (cacheDashCondKm || []).filter(r =>
    _dentroDoPeriodoDashCond(r.data, dias) && r.km_final != null && r.km_final !== ''
  );
  const kmTotal = kmPeriodo.reduce((soma, r) => soma + (Number(r.km_final) - Number(r.km_inicial)), 0);
  set('dashcond-km', Math.round(kmTotal).toLocaleString('pt-BR'));

  _renderizarGraficoStatusDashCond(viagensPeriodo);
  _renderizarGraficoKmDashCond(kmPeriodo);
  _renderizarGraficoMesDashCond(viagensPeriodo);
  _renderizarGraficoUnidadeDashCond(viagensPeriodo);
}

// PEDIDO DO USUÁRIO: "Gráfico de viagens por mês" - conta viagens (dentro
// do período selecionado no topo) agrupadas por mês/ano de data_viagem.
function _renderizarGraficoMesDashCond(viagens) {
  const canvas = document.getElementById('dashcond-mes-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const porMes = {};
  viagens.forEach(s => {
    if (!s.data_viagem) return;
    const chave = s.data_viagem.slice(0, 7); // "YYYY-MM"
    porMes[chave] = (porMes[chave] || 0) + 1;
  });
  const meses = Object.keys(porMes).sort();

  if (_chartsDashCond.mes) { _chartsDashCond.mes.destroy(); _chartsDashCond.mes = null; }
  if (!meses.length) return;

  const rotulo = m => {
    const [ano, mes] = m.split('-');
    return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  _chartsDashCond.mes = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: meses.map(rotulo),
      datasets: [{ label: 'Viagens', data: meses.map(m => porMes[m]), backgroundColor: '#044AAA' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

// PEDIDO DO USUÁRIO: "Gráfico de viagens por unidade" - conta viagens
// (dentro do período selecionado) agrupadas pela Unidade de quem solicitou
// (mesmo campo "unidade" usado em Gerenciar Solicitações/Agenda).
function _renderizarGraficoUnidadeDashCond(viagens) {
  const canvas = document.getElementById('dashcond-unidade-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const porUnidade = {};
  viagens.forEach(s => {
    const chave = s.unidade || 'Sem unidade';
    porUnidade[chave] = (porUnidade[chave] || 0) + 1;
  });
  const entradas = Object.entries(porUnidade).sort((a, b) => b[1] - a[1]);

  if (_chartsDashCond.unidade) { _chartsDashCond.unidade.destroy(); _chartsDashCond.unidade = null; }
  if (!entradas.length) return;

  const paleta = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59'];
  _chartsDashCond.unidade = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: entradas.map(e => e[0]),
      datasets: [{ label: 'Viagens', data: entradas.map(e => e[1]), backgroundColor: entradas.map((_, i) => paleta[i % paleta.length]) }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function _renderizarGraficoStatusDashCond(viagens) {
  const canvas = document.getElementById('dashcond-status-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const contagem = {};
  viagens.forEach(s => { const st = s.status || 'Pendente'; contagem[st] = (contagem[st] || 0) + 1; });
  const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

  if (_chartsDashCond.status) { _chartsDashCond.status.destroy(); _chartsDashCond.status = null; }
  if (!entradas.length) return;

  const paleta = ['#044AAA', '#46BE6B', '#D85736', '#FF914D', '#1D5C63', '#FFDE59'];
  _chartsDashCond.status = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: entradas.map(e => e[0]),
      datasets: [{ label: 'Quantidade', data: entradas.map(e => e[1]), backgroundColor: entradas.map((_, i) => paleta[i % paleta.length]) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function _renderizarGraficoKmDashCond(registros) {
  const canvas = document.getElementById('dashcond-km-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const porDia = {};
  registros.forEach(r => {
    porDia[r.data] = (porDia[r.data] || 0) + (Number(r.km_final) - Number(r.km_inicial));
  });
  const dias = Object.keys(porDia).sort();

  if (_chartsDashCond.km) { _chartsDashCond.km.destroy(); _chartsDashCond.km = null; }
  if (!dias.length) return;

  _chartsDashCond.km = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: dias.map(formatarDataBR),
      datasets: [{ label: 'Km rodado', data: dias.map(d => Math.round(porDia[d])), borderColor: '#044AAA', backgroundColor: '#044AAA', tension: 0.2, fill: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

// Expor globalmente
window.abrirDashboardCondutor = abrirDashboardCondutor;
window.carregarDashboardCondutor = carregarDashboardCondutor;
window.aplicarFiltroDashboardCondutor = aplicarFiltroDashboardCondutor;
