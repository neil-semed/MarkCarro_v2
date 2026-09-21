// ============================================================
// MARKCARRO - Página: Agenda Combinada (MarkCarro + Bora Lá)
// ============================================================
// Só Admin. Mostra, lado a lado, as vans já ocupadas no período nos 2
// sistemas (mesma frota, dois apps de solicitação diferentes) - só
// LEITURA, não altera nada em nenhum dos dois; serve pra o gestor
// perceber visualmente se uma mesma placa está escalada nos dois lados no
// mesmo dia/horário, antes de confirmar uma corrida nova.
//
// Cruzamento é pela PLACA (profiles.placa, do condutor do MarkCarro, e
// vehicles.plate, do Bora Lá) - não pelo motorista, porque o pedido do
// usuário foi "a placa do veículo" como chave (2 pessoas podem dirigir a
// mesma van em dias diferentes, mas a van é sempre a mesma).

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
          const placaIda = placaDoCondutor(s.condutor_ida);
          const placaVolta = placaDoCondutor(s.condutor_volta);
          const placas = [...new Set([placaIda, placaVolta].filter(Boolean))];
          if (!placas.length) placas.push(null);
          placas.forEach(placa => linhas.push({
            sistema: 'markcarro',
            placa,
            data_viagem: s.data_viagem,
            hora_saida: s.hora_saida,
            hora_retorno: s.hora_retorno,
            detalhe: `${s.origem || ''} → ${s.destino || ''}`,
            status: s.status
          }));
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
    renderizarAgendaCombinada(linhas, erroBoraLa);
  } catch (e) {
    console.error('Erro ao carregar agenda combinada:', e);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">Erro ao carregar agenda combinada. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarAgendaCombinada()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar agenda combinada');
  }
}

// Mesma lógica de condutorLabelAgenda (pages/agenda.js), mas devolve só a
// placa cadastrada pro condutor daquele e-mail.
function placaDoCondutor(email) {
  if (!email) return null;
  const c = (cacheCondutoresParaExibicao || []).find(x => x.email === email);
  return c?.placa || null;
}

function renderizarAgendaCombinada(dados, erroBoraLa) {
  const tbody = document.getElementById('tb-agenda-combinada');
  const avisoBoraLa = document.getElementById('aviso-bora-la-indisponivel');
  if (avisoBoraLa) avisoBoraLa.classList.toggle('hidden', !erroBoraLa);

  const filtroPlaca = (document.getElementById('agenda-comb-filtro-placa')?.value || '').trim().toUpperCase();
  let filtrados = filtroPlaca
    ? dados.filter(l => (l.placa || '').toUpperCase().includes(filtroPlaca))
    : dados.slice();

  filtrados.sort((a, b) => {
    const da = `${a.data_viagem || ''} ${a.hora_saida || ''}`;
    const db = `${b.data_viagem || ''} ${b.hora_saida || ''}`;
    return da.localeCompare(db);
  });

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 py-8">Nenhuma van ocupada no período</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(l => `
    <tr class="${!l.placa ? 'bg-amber-50' : ''}">
      <td class="table-td">${formatarDataBR(l.data_viagem)}</td>
      <td class="table-td">${formatarHoraBR(l.hora_saida)}${l.hora_retorno ? ' - ' + formatarHoraBR(l.hora_retorno) : ''}</td>
      <td class="table-td font-semibold">${l.placa || '<span class="text-amber-600">sem placa cadastrada</span>'}</td>
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
  carregarAgendaCombinada();
}

window.carregarAgendaCombinada = carregarAgendaCombinada;
window.aplicarFiltrosAgendaCombinada = aplicarFiltrosAgendaCombinada;
window.limparFiltrosAgendaCombinada = limparFiltrosAgendaCombinada;
