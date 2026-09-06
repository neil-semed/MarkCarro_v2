// ============================================================
// MARKCARRO - Página: Agenda do Condutor
// ============================================================

async function carregarAgendaCondutor() {
  if (!usuarioAtual) return;
  
  const inicio = document.getElementById('agenda-condutor-data-inicio').value;
  const fim = document.getElementById('agenda-condutor-data-fim').value;
  
  Components.Loading.show(document.getElementById('tb-agenda-condutor'));
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

function renderizarAgendaCondutor(dados) {
  const tbody = document.getElementById('tb-agenda-condutor');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-500 py-8">Nenhuma corrida</td></tr>';
    return;
  }
  
  tbody.innerHTML = dados.map(s => {
    const papel = s.condutor_ida === usuarioAtual.email && s.condutor_volta === usuarioAtual.email ? 'Ida e Volta' :
                  s.condutor_ida === usuarioAtual.email ? 'Ida' : 'Volta';
    return `
    <tr>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)}</td>
      <td>${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${papel}</td>
      <td>${s.justificativa}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
    </tr>
    `;
  }).join('');
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data-inicio').value = '';
  document.getElementById('agenda-condutor-data-fim').value = '';
  carregarAgendaCondutor();
}

// Expor globalmente
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;