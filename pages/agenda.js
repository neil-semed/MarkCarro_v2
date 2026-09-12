// ============================================================
// MARKCARRO - Página: Agenda de Corridas (Gestor)
// ============================================================

// cacheAgenda guarda o resultado bruto da consulta por data (usado pelo
// filtro de status, que é aplicado no cliente, e pela exportação Excel).
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

  const tbody = document.getElementById('tb-agenda-body');
  Components.Loading.show(tbody);
  try {
    const dados = await buscarSolicitacoesPorData(inicio, fim);
    cacheAgenda = dados || [];
    aplicarFiltrosAgenda();
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar agenda:', e);
    tbody.innerHTML = `<tr><td colspan="16" class="text-center text-red-500 py-8">Erro ao carregar agenda. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarTelaAgenda()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar agenda');
  }
}

// Filtro de Status - aplicado no cliente sobre o período já carregado (o
// filtro de datas continua sendo feito na consulta ao Supabase).
function aplicarFiltrosAgenda() {
  const status = document.getElementById('agenda-filtro-status')?.value || 'TODOS';
  const filtrados = status === 'TODOS'
    ? cacheAgenda
    : cacheAgenda.filter(s => (s.status || 'Pendente') === status);
  renderizarAgenda(filtrados);
}

// CORREÇÃO (item 1 do lote do admin): "limpar filtros não limpa datas" -
// esta função só resetava o filtro de Status, mantendo as datas de início/
// fim como estavam (então "limpar" nunca voltava a mostrar o período
// completo). Agora reseta também as datas (pro dia de hoje, mesmo padrão
// usado ao abrir a tela pela primeira vez) e busca de novo no servidor.
function limparFiltrosAgenda() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('agenda-filtro-status').value = 'TODOS';
  document.getElementById('agenda-data-inicio').value = hoje;
  document.getElementById('agenda-data-fim').value = hoje;
  carregarTelaAgenda();
}

function renderizarAgenda(dados) {
  const tbody = document.getElementById('tb-agenda-body');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 py-8">Nenhuma corrida no período</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map(s => `
    <tr>
      <td class="table-td">${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td class="table-td">${formatarDataBR(s.data_viagem)}</td>
      <td class="table-td">${formatarHoraBR(s.hora_saida)}</td>
      <td class="table-td">${formatarHoraBR(s.hora_retorno)}</td>
      <td class="table-td">${s.origem || ''}</td>
      <td class="table-td">${s.destino || ''}</td>
      <td class="table-td">${s.nome_ext || s.email_solicitante}</td>
      <td class="table-td">${s.unidade || ''}</td>
      <td class="table-td">${s.setor || ''}</td>
      <td class="table-td">${s.justificativa || ''}</td>
      <td class="table-td">${s.tipo_viagem || ''}</td>
      <td class="table-td">${s.qtd_pessoas ?? ''}</td>
      <td class="table-td"><span class="badge ${classeStatus(s.status)}">${s.status || 'Pendente'}</span></td>
      <td class="table-td">${s.condutor_ida || ''}</td>
      <td class="table-td">${s.condutor_volta || ''}</td>
      <td class="table-td print:hidden">
        <button class="btn-outline text-xs py-1.5 px-2.5" onclick="abrirNoDashboard('${s.data_viagem}')">Gerenciar</button>
      </td>
    </tr>
  `).join('');
}

// "Ação" da Agenda: leva pro Dashboard (Painel do Gestor) já filtrado pela
// data da viagem dessa corrida - é lá que ficam os controles de
// Confirmar/Ocupado/Cancelar e a atribuição de condutor, pra não duplicar
// essa lógica em duas telas.
//
// CORREÇÃO (revisão da tela Painel após o item 8): esta função chamava
// abrirPainelGestor(), que por sua vez chama carregarPainelGestor() SEM
// forçar atualização - a mesma causa raiz do item 8 (proteção contra
// "piscar tela" que pula o recarregamento se a tabela já tinha linhas de
// uma visita anterior). Aqui o efeito era mais sutil: o "Gerenciar" clicado
// na Agenda podia aplicar o filtro de data sobre dados DESATUALIZADOS do
// Dashboard (ex.: uma corrida confirmada em outra aba/sessão não apareceria
// ainda). Também usava setTimeout(fn, 0) como gambiarra pra "esperar" o
// carregamento, o que na prática só funcionava por coincidência de tempo -
// não havia garantia nenhuma de que os dados já tivessem chegado. Agora
// aguarda de verdade o carregamento (await) antes de aplicar o filtro, e
// sempre força atualização, igual a voltarParaPainelGestor().
async function abrirNoDashboard(dataViagem) {
  esconderTodasTelas();
  document.getElementById('tela-gestor').classList.remove('hidden');
  marcarAbaAtiva('gestor');
  await carregarPainelGestor(true);

  const campo = document.getElementById('filtro-gestor-data-viagem');
  if (campo) {
    campo.value = dataViagem;
    aplicarFiltrosGestor();
  }
}

// O sistema antigo enviava a agenda do dia por e-mail para uma lista de
// distribuição (enviarAgendaPorEmail). Como este app não tem um backend
// próprio pra disparar e-mail (decisão: notificações só pelo sino, sem
// e-mail por enquanto), o botão foi trocado por uma exportação em Excel do
// período/filtro atual - útil pra imprimir ou compartilhar manualmente.
function exportarAgendaXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  const status = document.getElementById('agenda-filtro-status')?.value || 'TODOS';
  const dados = status === 'TODOS' ? cacheAgenda : cacheAgenda.filter(s => (s.status || 'Pendente') === status);
  if (!dados.length) return Components.Toast.warning('Não há corridas no período para exportar');

  const linhas = dados.map(s => ({
    'Data Solicitação': formatarDataHoraBR(s.data_solicitacao),
    'Data Viagem': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Justificativa': s.justificativa || '',
    'Tipo': s.tipo_viagem || '',
    'Nº Passageiros': s.qtd_pessoas ?? '',
    'Status': s.status,
    'Condutor Ida': s.condutor_ida || '',
    'Condutor Volta': s.condutor_volta || ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Agenda');
  XLSX.writeFile(livro, 'MarkCarro_Agenda.xlsx');
}

// Expor globalmente
window.carregarTelaAgenda = carregarTelaAgenda;
window.aplicarFiltrosAgenda = aplicarFiltrosAgenda;
window.limparFiltrosAgenda = limparFiltrosAgenda;
window.abrirNoDashboard = abrirNoDashboard;
window.exportarAgendaXlsxUI = exportarAgendaXlsxUI;
