// ============================================================
// MARKCARRO - Página: Agenda (Gestor)
// ============================================================

async function carregarTelaAgenda() {
  const inicio = document.getElementById('agenda-data-inicio').value;
  const fim = document.getElementById('agenda-data-fim').value;
  
  if (!inicio || !fim) {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('agenda-data-inicio').value = hoje;
    document.getElementById('agenda-data-fim').value = hoje;
    return;
  }
  
  Components.Loading.show(document.getElementById('tb-agenda-body'));
  try {
    const dados = await buscarSolicitacoesPorData(inicio, fim);
    renderizarAgenda(dados || []);
  } catch (e) {
    Components.Toast.error('Erro ao carregar agenda');
  }
}

function renderizarAgenda(dados) {
  const tbody = document.getElementById('tb-agenda-body');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhuma corrida no período</td></tr>';
    return;
  }
  
  tbody.innerHTML = dados.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${formatarDataBR(s.data_viagem)}</td>
      <td>${formatarHoraBR(s.hora_saida)}</td>
      <td>${formatarHoraBR(s.hora_retorno)}</td>
      <td>${s.origem} → ${s.destino}</td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${s.condutor_ida || ''}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
    </tr>
  `).join('');
}

async function dispararEnvioAgendaEmail() {
  const data = document.getElementById('agenda-data-inicio').value;
  if (!data) {
    Components.Toast.error('Selecione uma data');
    return;
  }
  
  try {
    // Esta função precisaria de um endpoint backend ou edge function
    Components.Toast.warning('Funcionalidade requer Edge Function no Supabase');
  } catch (e) {
    Components.Toast.error('Erro ao enviar agenda');
  }
}

// Expor globalmente
window.carregarTelaAgenda = carregarTelaAgenda;
window.dispararEnvioAgendaEmail = dispararEnvioAgendaEmail;