// ============================================================
// MARKCARRO - Página: Agenda (Gestor)
// ============================================================

// Cache da última consulta, usado por exportarAgendaXlsxUI().
let cacheAgenda = [];

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
    cacheAgenda = dados || [];
    renderizarAgenda(cacheAgenda);
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

// O sistema antigo enviava a agenda do dia por e-mail para uma lista de
// distribuição (enviarAgendaPorEmail). Como este app não tem um backend
// próprio pra disparar e-mail (decisão: notificações só pelo sino, sem
// e-mail por enquanto), o botão foi trocado por uma exportação em Excel do
// período filtrado - útil pra imprimir ou compartilhar manualmente.
function exportarAgendaXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheAgenda.length) return Components.Toast.warning('Não há corridas no período para exportar');

  const linhas = cacheAgenda.map(s => ({
    'Data': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Condutor Ida': s.condutor_ida || '',
    'Condutor Volta': s.condutor_volta || '',
    'Status': s.status
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Agenda');
  XLSX.writeFile(livro, 'MarkCarro_Agenda.xlsx');
}

// Expor globalmente
window.carregarTelaAgenda = carregarTelaAgenda;
window.exportarAgendaXlsxUI = exportarAgendaXlsxUI;