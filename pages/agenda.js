// ============================================================
// MARKCARRO - Página: Agenda de Corridas (Gestor)
// ============================================================

// cacheAgenda guarda o resultado bruto da consulta por data (usado pelo
// filtro de status, que é aplicado no cliente, e pela exportação Excel).
let cacheAgenda = [];

// CORREÇÃO (bug real por trás do item 1 - "limpar filtros não limpa
// datas"/tela ficando em branco): quando as datas ainda estavam vazias
// (primeira vez que a tela é aberta), esta função preenchia os campos com
// a data de hoje e RETORNAVA sem nunca buscar/mostrar nada - a tabela
// ficava só com o cabeçalho, sem nenhuma linha e sem nem a mensagem
// "Nenhuma corrida no período" (porque renderizarAgenda() nunca era
// chamada). Dava a impressão de tela quebrada/vazia toda vez que se
// abria a Agenda ou clicava em "Limpar filtros" - tinha que mexer em algum
// filtro manualmente pra "acordar" a busca. Agora preenche as datas que
// estiverem faltando e CONTINUA pra buscar de verdade, em vez de parar aí.
async function carregarTelaAgenda() {
  let inicio = document.getElementById('agenda-data-inicio').value;
  let fim = document.getElementById('agenda-data-fim').value;

  if (!inicio || !fim) {
    const hoje = new Date().toISOString().split('T')[0];
    inicio = inicio || hoje;
    fim = fim || hoje;
    document.getElementById('agenda-data-inicio').value = inicio;
    document.getElementById('agenda-data-fim').value = fim;
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

// "Ação" da Agenda: leva pra tela de Gerenciamento de Solicitações já
// filtrada pela data da viagem dessa corrida - é lá que ficam os controles
// de Confirmar/Ocupado/Cancelar e a atribuição de condutor, pra não
// duplicar essa lógica em duas telas.
//
// CORREÇÃO: o nome "abrirNoDashboard" e o destino (tela-gestor) ficaram
// desatualizados depois que "Gerenciamento de Solicitações" virou tela
// separada do Dashboard (a pedido do usuário) - mantido o mesmo nome de
// função aqui só pra não precisar mexer no onclick já presente na tabela
// da Agenda, mas agora aponta pro lugar certo. Antes também usava
// setTimeout(fn, 0) como gambiarra pra "esperar" o carregamento (sem
// garantia real de que os dados já tivessem chegado) e podia aplicar o
// filtro sobre dados desatualizados (mesma causa raiz do item 8: pulava o
// recarregamento se a tabela já tinha linhas de uma visita anterior).
// Agora aguarda de verdade (await) e sempre força atualização.
async function abrirNoDashboard(dataViagem) {
  esconderTodasTelas();
  document.getElementById('tela-gerenciamento-solicitacoes').classList.remove('hidden');
  marcarAbaAtiva('gerenciamento-solicitacoes');
  await carregarGerenciamentoSolicitacoes(true);

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
