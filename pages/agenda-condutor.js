// ============================================================
// MARKCARRO - Página: Agenda do Condutor
// ============================================================

async function carregarAgendaCondutor() {
  if (!usuarioAtual) return;

  const inicio = document.getElementById('agenda-condutor-data-inicio').value;
  const fim = document.getElementById('agenda-condutor-data-fim').value;

  Components.Loading.show(document.getElementById('tb-agenda-condutor'));
  const cards = document.getElementById('cards-agenda-condutor');
  if (cards) cards.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando...</div>';

  try {
    let dados;
    if (inicio && fim) {
      dados = await buscarSolicitacoesPorData(inicio, fim);
      dados = (dados || []).filter(s =>
        s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
      );
    } else {
      dados = await buscarSolicitacoesPorCondutor(usuarioAtual.email);
    }
    renderizarAgendaCondutor(dados || []);
  } catch (e) {
    Components.Toast.error('Erro ao carregar agenda');
  }
}

function papelDoCondutor(s) {
  return s.condutor_ida === usuarioAtual.email && s.condutor_volta === usuarioAtual.email
    ? 'Ida e Volta'
    : s.condutor_ida === usuarioAtual.email ? 'Ida' : 'Volta';
}

function renderizarAgendaCondutor(dados) {
  const tbody = document.getElementById('tb-agenda-condutor');
  const cards = document.getElementById('cards-agenda-condutor');

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma corrida</td></tr>';
    if (cards) cards.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Nenhuma corrida encontrada.</div>';
    return;
  }

  tbody.innerHTML = dados.map(s => `
    <tr>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)}</td>
      <td>${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${papelDoCondutor(s)}</td>
      <td>${s.justificativa || ''}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
    </tr>
  `).join('');

  if (cards) {
    cards.innerHTML = dados.map(s => `
      <div class="card p-4 mb-3">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <p class="font-bold text-slate-900">${formatarDataBR(s.data_viagem)}</p>
            <p class="text-xs text-slate-500">${formatarHoraBR(s.hora_saida)} - ${formatarHoraBR(s.hora_retorno)} · ${papelDoCondutor(s)}</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <p class="text-sm text-slate-800 mb-1 break-words">${s.origem} <span class="text-slate-400">→</span> ${s.destino}</p>
        <p class="text-xs text-slate-500">👤 ${s.nome_ext || s.email_solicitante}</p>
      </div>
    `).join('');
  }
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data-inicio').value = '';
  document.getElementById('agenda-condutor-data-fim').value = '';
  carregarAgendaCondutor();
}

// Expor globalmente
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;
