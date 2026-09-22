// ============================================================
// MARKCARRO - Página: Agenda Combinada (MarkCarro + Bora Lá)
// ============================================================
// Só Admin. Mostra, agrupado por data e horário, as vans já escaladas nos
// 2 sistemas (mesma frota, dois apps de solicitação diferentes) - só
// LEITURA, não altera nada em nenhum dos dois; serve pra o gestor
// perceber visualmente se uma mesma placa está escalada nos dois lados no
// mesmo dia/horário, antes de confirmar uma corrida nova.
//
// Cruzamento pra saber "é a mesma van" continua sendo pela PLACA
// (profiles.placa/vehicles.plate) - pedido explícito do usuário. O nome
// do motorista (PEDIDO DO USUÁRIO: "tem que trazer o nome do motorista")
// é só informativo aqui, não é usado pra casar MarkCarro com Bora Lá.

let cacheAgendaCombinada = [];

async function carregarAgendaCombinada() {
  const inicio = document.getElementById('agenda-comb-data-inicio').value;
  const fim = document.getElementById('agenda-comb-data-fim').value;
  const tbody = document.getElementById('tb-agenda-combinada');
  Components.Loading.show(tbody);

  try {
    if (!cacheCondutoresParaExibicao || !cacheCondutoresParaExibicao.length) {
      try { cacheCondutoresParaExibicao = await listarCondutoresParaExibicao(); } catch (e) { /* mostra sem nome se falhar */ }
    }

    const [solicitacoesMc, boraLaResultado] = await Promise.allSettled([
      (inicio && fim) ? buscarSolicitacoesPorData(inicio, fim) : buscarTodasSolicitacoes(),
      (async () => {
        // Sem período definido, limita aos próximos 30 dias (a Edge
        // Function do Bora Lá recusa período maior que 90 dias).
        const hoje = new Date();
        const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const daqui30 = new Date(hoje.getTime() + 30 * 86400000 - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        return buscarAgendaBoraLa(inicio || hojeISO, fim || daqui30);
      })()
    ]);

    const linhas = [];

    if (solicitacoesMc.status === 'fulfilled') {
      (solicitacoesMc.value || [])
        .filter(s => s.status === 'Confirmada' && (s.condutor_ida || s.condutor_volta))
        .forEach(s => {
          // Uma linha por CONDUTOR escalado (não por placa) - se o mesmo
          // condutor faz ida e volta, entra 1 vez só; assim a placa e o
          // nome do motorista sempre casam certinho na mesma linha.
          const emails = [];
          if (s.condutor_ida) emails.push(s.condutor_ida);
          if (s.condutor_volta && s.condutor_volta !== s.condutor_ida) emails.push(s.condutor_volta);
          if (!emails.length) emails.push(null);

          emails.forEach(email => {
            const c = email ? (cacheCondutoresParaExibicao || []).find(x => x.email === email) : null;
            linhas.push({
              sistema: 'markcarro',
              placa: c?.placa || null,
              motorista: c?.nome || email,
              data_viagem: s.data_viagem,
              hora_saida: s.hora_saida,
              hora_retorno: s.hora_retorno,
              detalhe: `${s.origem || ''} → ${s.destino || ''}`,
              status: s.status
            });
          });
        });
    } else {
      console.error('Erro ao carregar solicitações do MarkCarro:', solicitacoesMc.reason);
    }

    let erroBoraLa = null;
    if (boraLaResultado.status === 'fulfilled') {
      linhas.push(...(boraLaResultado.value || []));
    } else {
      erroBoraLa = boraLaResultado.reason;
      console.error('Erro ao carregar agenda do Bora Lá:', erroBoraLa);
    }

    cacheAgendaCombinada = linhas;
    popularFiltroMotoristaAgendaCombinada(linhas);
    renderizarAgendaCombinada(linhas, erroBoraLa);
  } catch (e) {
    console.error('Erro ao carregar agenda combinada:', e);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">Erro ao carregar agenda combinada. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarAgendaCombinada()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar agenda combinada');
  }
}

// PEDIDO DO USUÁRIO ("botão Hoje - filtro pela data"): mesmo padrão já
// usado na Agenda de Corridas (pages/agenda.js) - preenche Data Inicial e
// Final com hoje e recarrega.
function filtrarAgendaCombinadaHoje() {
  const hoje = new Date();
  const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById('agenda-comb-data-inicio').value = hojeISO;
  document.getElementById('agenda-comb-data-fim').value = hojeISO;
  carregarAgendaCombinada();
}

// PEDIDO DO USUÁRIO ("colocar filtro por motorista"): opções vêm só dos
// nomes realmente presentes no período carregado (mesmo padrão dos
// dropdowns de Motorista/Origem/Destino da Agenda do Condutor).
function popularFiltroMotoristaAgendaCombinada(linhas) {
  const sel = document.getElementById('agenda-comb-filtro-motorista');
  if (!sel) return;
  const valorAtual = sel.value;
  const nomes = Array.from(new Set(linhas.map(l => l.motorista).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = '<option value="">Todos os motoristas</option>' +
    nomes.map(n => `<option value="${n}">${n}</option>`).join('');
  if (nomes.includes(valorAtual)) sel.value = valorAtual;
}

function renderizarAgendaCombinada(dados, erroBoraLa) {
  const tbody = document.getElementById('tb-agenda-combinada');
  const avisoBoraLa = document.getElementById('aviso-bora-la-indisponivel');
  if (avisoBoraLa) avisoBoraLa.classList.toggle('hidden', !erroBoraLa);

  const filtroPlaca = (document.getElementById('agenda-comb-filtro-placa')?.value || '').trim().toUpperCase();
  const filtroMotorista = document.getElementById('agenda-comb-filtro-motorista')?.value || '';

  let filtrados = dados.slice();
  if (filtroPlaca) filtrados = filtrados.filter(l => (l.placa || '').toUpperCase().includes(filtroPlaca));
  if (filtroMotorista) filtrados = filtrados.filter(l => l.motorista === filtroMotorista);

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-8">Nenhuma van escalada no período</td></tr>';
    return;
  }

  // PEDIDO DO USUÁRIO: linha a linha (sem agrupar por cabeçalho), com Data
  // e Horário como colunas próprias - volta ao formato original da tela,
  // só que agora com a coluna Motorista.
  filtrados.sort((a, b) => `${a.data_viagem || ''} ${a.hora_saida || ''}`.localeCompare(`${b.data_viagem || ''} ${b.hora_saida || ''}`));

  tbody.innerHTML = filtrados.map(l => `
    <tr class="${!l.placa ? 'bg-amber-50' : ''}">
      <td class="table-td">${formatarDataBR(l.data_viagem)}</td>
      <td class="table-td">${formatarHoraBR(l.hora_saida)}${l.hora_retorno ? ' - ' + formatarHoraBR(l.hora_retorno) : ''}</td>
      <td class="table-td font-semibold">${l.placa || '<span class="text-amber-600">sem placa</span>'}</td>
      <td class="table-td">${l.motorista || '<span class="text-slate-400">—</span>'}</td>
      <td class="table-td">
        <span class="badge ${l.sistema === 'markcarro' ? 'badge-confirmada' : 'badge-em-analise'}">
          ${l.sistema === 'markcarro' ? 'MarkCarro' : 'Bora Lá'}
        </span>
      </td>
      <td class="table-td">${l.detalhe || ''}</td>
      <td class="table-td">${l.status || ''}</td>
    </tr>
  `).join('');
}

function aplicarFiltrosAgendaCombinada() {
  renderizarAgendaCombinada(cacheAgendaCombinada);
}

function limparFiltrosAgendaCombinada() {
  document.getElementById('agenda-comb-data-inicio').value = '';
  document.getElementById('agenda-comb-data-fim').value = '';
  document.getElementById('agenda-comb-filtro-placa').value = '';
  const selMotorista = document.getElementById('agenda-comb-filtro-motorista');
  if (selMotorista) selMotorista.value = '';
  carregarAgendaCombinada();
}

window.carregarAgendaCombinada = carregarAgendaCombinada;
window.aplicarFiltrosAgendaCombinada = aplicarFiltrosAgendaCombinada;
window.limparFiltrosAgendaCombinada = limparFiltrosAgendaCombinada;
window.filtrarAgendaCombinadaHoje = filtrarAgendaCombinadaHoje;
