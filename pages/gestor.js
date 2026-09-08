// ============================================================
// MARKCARRO - Página: Painel do Gestor (funcionalidades avançadas)
// ============================================================

// Guarda a última lista carregada, usada pelo botão "Exportar Excel" (o
// botão já existia no HTML mas não tinha nenhuma função ligada a ele) e
// pelos filtros da tela (aplicarFiltrosGestor).
let cacheTodasSolicitacoesGestor = [];

// Registros de KM crus da última carga - guardados à parte pra que os
// filtros do Dashboard (Período/Unidade/Setor/Condutor) possam recalcular
// os gráficos de KM sem precisar buscar tudo de novo no Supabase.
let cacheRegistrosKmDashboard = [];

async function carregarPainelGestor(forcarAtualizacao = false) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!forcarAtualizacao && tbody.children.length > 1) return;

  Components.Loading.show(tbody);
  try {
    const [solicitacoes, condutores, registrosKm] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores(),
      listarTodosKM().catch(() => [])
    ]);

    cacheCondutores = condutores || [];
    cacheTodasSolicitacoesGestor = solicitacoes || [];
    cacheRegistrosKmDashboard = registrosKm || [];

    renderizarAvisoCnh('aviso-cnh-painel', cacheCondutores);

    // Transição automática Pendente -> "Em Análise": equivalente a
    // marcarEmAnalise() do sistema antigo, que era disparada quando o
    // gestor abria/expandia uma linha pela primeira vez. Como esta tela não
    // tem esse conceito de "expandir linha" (a tabela já mostra tudo de
    // uma vez), o momento equivalente aqui é o próprio carregamento do
    // Painel do Gestor: só de abrir a tela já conta como "o gestor viu".
    await marcarPendentesComoEmAnalise(cacheTodasSolicitacoesGestor);

    preencherFiltrosDashboard();
    aplicarFiltrosDashboard();
    aplicarFiltrosGestor();
  } catch (e) {
    Components.Toast.error('Erro ao carregar painel');
  }
}

// ============================================================
// Filtros do Dashboard (Período / Unidade / Setor / Condutor) - afetam só
// os KPIs e os gráficos acima; a tabela "Gerenciamento de Solicitações"
// logo abaixo tem seus próprios filtros (aplicarFiltrosGestor), que
// continuam independentes.
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
    : [...new Set(cacheTodasSolicitacoesGestor.map(s => s.unidade).filter(Boolean))].sort();
  selUnidade.innerHTML = '<option value="">Todas</option>' +
    unidades.map(u => `<option value="${u}">${u}</option>`).join('');

  const setores = [...new Set(cacheTodasSolicitacoesGestor.map(s => s.setor).filter(Boolean))].sort();
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
  let solicitacoesFiltradas = cacheTodasSolicitacoesGestor.filter(s => _dentroDoPeriodo(s.data_viagem, dias));
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
// DASHBOARD (KPIs + gráficos) - topo da tela "Dashboard" (antigo
// "Painel do Gestor"). Reúne os indicadores que existiam espalhados no
// sistema antigo em Apps Script (contagens por status, KM por condutor,
// destinos/setores mais frequentes).
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

async function marcarPendentesComoEmAnalise(lista) {
  const pendentes = lista.filter(s => (s.status || 'Pendente') === 'Pendente');
  if (!pendentes.length) return;

  try {
    await Promise.all(pendentes.map(s => atualizarSolicitacao(s.id, { status: 'Em Análise' })));
    pendentes.forEach(s => { s.status = 'Em Análise'; });
  } catch (e) {
    console.warn('Erro ao marcar solicitações como Em Análise:', e);
  }
}

// Filtros da tela (Data da Solicitação / Data da Viagem / Status) - o HTML
// já tinha esses três campos, mas nenhum estava ligado a nenhuma função:
// escolher qualquer filtro não fazia nada, e a tabela sempre mostrava tudo.
function aplicarFiltrosGestor() {
  const dataSolic = document.getElementById('filtro-gestor-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-gestor-data-viagem')?.value;
  const status = document.getElementById('filtro-gestor-status')?.value || 'TODOS';

  let filtrados = cacheTodasSolicitacoesGestor;
  if (dataSolic) {
    filtrados = filtrados.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  }
  if (dataViagem) {
    filtrados = filtrados.filter(s => s.data_viagem === dataViagem);
  }
  if (status !== 'TODOS') {
    filtrados = filtrados.filter(s => (s.status || 'Pendente') === status);
  }

  renderizarTabelaGestorCompleta(filtrados);
}

function limparFiltrosGestor() {
  document.getElementById('filtro-gestor-data-solic').value = '';
  document.getElementById('filtro-gestor-data-viagem').value = '';
  document.getElementById('filtro-gestor-status').value = 'TODOS';
  aplicarFiltrosGestor();
}

function exportarSolicitacoesXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheTodasSolicitacoesGestor.length) return Components.Toast.warning('Não há solicitações para exportar');

  const linhas = cacheTodasSolicitacoesGestor.map(s => ({
    'Solicitado em': formatarDataHoraBR(s.data_solicitacao),
    'Data da Viagem': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Justificativa': s.justificativa,
    'Tipo': s.tipo_viagem,
    'Qtd': s.qtd_pessoas,
    'Status': s.status,
    'Condutor Ida': s.condutor_ida || '',
    'Condutor Volta': s.condutor_volta || ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Solicitações');
  XLSX.writeFile(livro, 'MarkCarro_PainelGestor.xlsx');
}

function renderizarTabelaGestorCompleta(dados) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhuma solicitação</td></tr>';
    return;
  }
  
  const opcoesCondutor = cacheCondutores.map(c => 
    `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`
  ).join('');
  
  tbody.innerHTML = dados.map(s => {
    const status = s.status || 'Pendente';
    return `
    <tr data-id="${s.id}">
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td><input type="date" value="${formatarDataBR(s.data_viagem)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'data_viagem', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_saida)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'hora_saida', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_retorno)}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'hora_retorno', this.value)"></td>
      <td><input type="text" value="${s.origem}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'origem', this.value)"></td>
      <td><input type="text" value="${s.destino}" class="form-control form-control-sm" onchange="salvarCampoGestor('${s.id}', 'destino', this.value)"></td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <td>${s.justificativa}</td>
      <td>${s.tipo_viagem}</td>
      <td><input type="number" value="${s.qtd_pessoas}" class="form-control form-control-sm" min="1" onchange="salvarCampoGestor('${s.id}', 'qtd_pessoas', this.value)"></td>
      <td><span class="badge ${classeStatus(status)}">${status}</span></td>
      <td>
        <select class="form-select form-select-sm" onchange="salvarCampoGestor('${s.id}', 'condutor_ida', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" onchange="salvarCampoGestor('${s.id}', 'condutor_volta', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <div class="btn-group btn-group-sm">
          ${status === 'Pendente' || status === 'Em Análise' ? `
            <button class="btn btn-success" onclick="confirmarSolicitacaoGestor('${s.id}')">✓ Confirmar</button>
            <button class="btn btn-danger" onclick="cancelarSolicitacaoGestor('${s.id}')">✗ Cancelar</button>
          ` : status === 'Confirmada' ? `
            <button class="btn btn-warning" onclick="marcarOcupadoGestor('${s.id}')">Ocupado</button>
            <button class="btn btn-danger" onclick="cancelarSolicitacaoGestor('${s.id}')">Cancelar</button>
          ` : ''}
          <button class="btn btn-outline" onclick="editarSolicitacaoGestor('${s.id}')">Editar</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
  
  // Preencher selects com valores atuais
  dados.forEach(s => {
    const row = tbody.querySelector(`tr[data-id="${s.id}"]`);
    if (row) {
      row.querySelector('select:nth-of-type(1)').value = s.condutor_ida || '';
      row.querySelector('select:nth-of-type(2)').value = s.condutor_volta || '';
    }
  });
}

async function salvarCampoGestor(id, campo, valor) {
  try {
    await atualizarSolicitacao(id, { [campo]: valor });
  } catch (e) {
    Components.Toast.error('Erro ao salvar');
  }
}

// Descreve um condutor (nome + telefone + placa/modelo) pra compor o texto
// das notificações - equivalente ao trecho de enviarMensagemConfirmacao()
// do sistema antigo que buscava os dados do condutor pra incluir no aviso,
// em vez do gestor precisar digitar isso manualmente.
function obterDescricaoCondutor(email) {
  if (!email) return null;
  const c = cacheCondutores.find(x => x.email === email);
  if (!c) return email;
  const veiculo = [c.placa, c.modelo].filter(Boolean).join(' ');
  return [c.nome, c.telefone, veiculo].filter(Boolean).join(' - ');
}

async function confirmarSolicitacaoGestor(id) {
  const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
  const condutorIda = row.querySelector('select:nth-of-type(1)').value;
  const condutorVolta = row.querySelector('select:nth-of-type(2)').value;

  if (!condutorIda) return Components.Toast.error('Selecione condutor de ida');

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, {
      status: 'Confirmada',
      condutor_ida: condutorIda,
      condutor_volta: condutorVolta || null
    });
    Components.Toast.success('Solicitação confirmada!');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      const descIda = obterDescricaoCondutor(condutorIda);
      const descVolta = condutorVolta ? obterDescricaoCondutor(condutorVolta) : null;

      let msg = `Sua viagem de ${quando} (${trecho}) foi confirmada. Condutor: ${descIda || condutorIda}.`;
      if (descVolta && condutorVolta !== condutorIda) msg += ` Condutor de volta: ${descVolta}.`;
      msg += ' Tolerância de 5 minutos no horário de embarque.';

      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'confirmacao',
        mensagem: msg,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));

      // Corrida "extra" (solicitada no mesmo dia da viagem) - avisa também
      // o(s) condutor(es) escalados, igual ao sistema antigo fazia.
      const ehExtra = (solicitacao.data_solicitacao || '').slice(0, 10) === solicitacao.data_viagem;
      if (ehExtra) {
        const msgCondutor = `Corrida extra atribuída a você para ${quando} (${trecho}).`;
        const destinatarios = [...new Set([condutorIda, condutorVolta].filter(Boolean))];
        destinatarios.forEach(email => {
          criarNotificacao({
            email_destinatario: email,
            tipo: 'corrida_extra',
            mensagem: msgCondutor,
            lida: false
          }).catch(e => console.warn('Erro ao notificar condutor:', e));
        });
      }
    }

    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro ao confirmar');
  }
}

async function marcarOcupadoGestor(id) {
  if (!confirm('Marcar como OCUPADO? O solicitante será notificado.')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Ocupado' });
    Components.Toast.success('Marcado como Ocupado');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'ocupado',
        mensagem: `Pedimos desculpas: não há veículo disponível para sua viagem de ${quando} (${trecho}). Por favor, entre em contato para reagendar.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function cancelarSolicitacaoGestor(id) {
  if (!confirm('Cancelar esta solicitação?')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Cancelada' });
    Components.Toast.success('Cancelada');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'cancelamento_gestor',
        mensagem: `Sua solicitação de ${quando} (${trecho}) foi cancelada pela gestão.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarPainelGestor(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

function editarSolicitacaoGestor(id) {
  // A edição é inline na tabela
  Components.Toast.info('Edite diretamente na tabela');
}

// Expor globalmente
window.carregarPainelGestor = carregarPainelGestor;
window.exportarSolicitacoesXlsxUI = exportarSolicitacoesXlsxUI;
window.confirmarSolicitacaoGestor = confirmarSolicitacaoGestor;
window.marcarOcupadoGestor = marcarOcupadoGestor;
window.cancelarSolicitacaoGestor = cancelarSolicitacaoGestor;
window.editarSolicitacaoGestor = editarSolicitacaoGestor;
window.salvarCampoGestor = salvarCampoGestor;
window.aplicarFiltrosGestor = aplicarFiltrosGestor;
window.limparFiltrosGestor = limparFiltrosGestor;
window.renderizarDashboardGestor = renderizarDashboardGestor;
window.preencherFiltrosDashboard = preencherFiltrosDashboard;
window.aplicarFiltrosDashboard = aplicarFiltrosDashboard;
window.limparFiltrosDashboard = limparFiltrosDashboard;