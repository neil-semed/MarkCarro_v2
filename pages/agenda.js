// ============================================================
// MARKCARRO - Página: Agenda de Corridas (Gestor)
// ============================================================

// cacheAgenda guarda o resultado bruto da consulta por data (usado pelo
// filtro de status, que é aplicado no cliente, e pela exportação Excel).
let cacheAgenda = [];

// CORREÇÃO (item 1 do novo lote do admin - "continua com data inicial e
// final travadas, botão limpar datas não funciona"): a versão anterior,
// quando as datas estavam vazias, sempre travava os campos no dia de HOJE
// e buscava só aquele único dia - "Limpar filtros" fazia a mesma coisa, ou
// seja, nunca "limpava" de verdade: só trocava um período qualquer pelo
// filtro (quase sempre vazio) de "hoje", dando a impressão de datas presas/
// filtro que não funciona. Gerenciamento de Solicitações (tela irmã desta)
// já mostra TUDO por padrão, sem exigir data nenhuma - agora Agenda segue
// o mesmo padrão: sem as duas datas preenchidas, busca TODAS as corridas
// em vez de forçar "hoje".
async function carregarTelaAgenda() {
  const inicio = document.getElementById('agenda-data-inicio').value;
  const fim = document.getElementById('agenda-data-fim').value;

  const tbody = document.getElementById('tb-agenda-body');
  Components.Loading.show(tbody);
  try {
    // Condutores (nome + capacidade do veículo) - carregado uma vez só e
    // reaproveitado (mesmo padrão de agenda-condutor.js), pra poder mostrar
    // "Sérgio - 6 lugares" em vez do e-mail cru nas colunas de condutor.
    // CORREÇÃO (pedido do usuário, 5ª vez): listarCondutoresParaExibicao()
    // em vez de listarCondutores() - esta tabela é só de EXIBIÇÃO das
    // corridas já confirmadas, não atribui motorista a nada aqui, então
    // não pode perder o nome de um condutor desativado depois. Ver
    // comentário completo em api.js.
    if (!cacheCondutoresParaExibicao || !cacheCondutoresParaExibicao.length) {
      try { cacheCondutoresParaExibicao = await listarCondutoresParaExibicao(); } catch (e) { /* mostra e-mail se falhar */ }
    }
    const dados = (inicio && fim)
      ? await buscarSolicitacoesPorData(inicio, fim)
      : await buscarTodasSolicitacoes();
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
  let filtrados = status === 'TODOS'
    ? cacheAgenda.slice()
    : cacheAgenda.filter(s => (s.status || 'Pendente') === status);
  // PEDIDO DO USUÁRIO: ordem crescente, 1º por Data da Viagem, 2º por
  // Horário de Saída (mesma regra e mesma função de Gerenciar Solicitações,
  // ver pages/gerenciamento-solicitacoes.js).
  filtrados = ordenarPorDataEHoraSaida(filtrados);
  renderizarAgenda(filtrados);
}

// "Limpar filtros" agora realmente limpa: esvazia as datas e o Status
// (em vez de travar num período fixo) e busca TUDO de novo, mesmo padrão
// do "Limpar filtros" de Gerenciar Solicitações.
// PEDIDO DO USUÁRIO: botão "Hoje" ao lado do filtro de Data Final - já que
// esta tela filtra por um PERÍODO (Data Inicial + Data Final), "filtrar
// pela data daquele dia" preenche as duas com hoje (período de 1 dia só),
// em vez de só travar o fim do período e deixar o início como estava.
function filtrarAgendaHoje() {
  const hoje = new Date();
  const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById('agenda-data-inicio').value = hojeISO;
  document.getElementById('agenda-data-fim').value = hojeISO;
  carregarTelaAgenda();
}

function limparFiltrosAgenda() {
  document.getElementById('agenda-filtro-status').value = 'TODOS';
  document.getElementById('agenda-data-inicio').value = '';
  document.getElementById('agenda-data-fim').value = '';
  carregarTelaAgenda();
}

// Mostra "Nome - N lugares" em vez do e-mail cru do condutor (pedido do
// usuário, ex: "Sérgio - 6 lugares") - cai pro e-mail só se o condutor não
// for encontrado em cacheCondutores (cadastro removido/renomeado etc.).
function condutorLabelAgenda(email) {
  if (!email) return '';
  const c = (cacheCondutoresParaExibicao || []).find(x => x.email === email);
  if (!c) return email;
  let texto = c.capacidade ? `${c.nome} - ${c.capacidade} ${c.capacidade == 1 ? 'lugar' : 'lugares'}` : c.nome;
  // CORREÇÃO (pedido do usuário: "apresentar nome e telefone do motorista"):
  // acrescenta o telefone do condutor, quando cadastrado.
  if (c.telefone) texto += ` · ${c.telefone}`;
  return texto;
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
      <td class="table-td">${condutorLabelAgenda(s.condutor_ida)}</td>
      <td class="table-td">${condutorLabelAgenda(s.condutor_volta)}</td>
      <td class="table-td print:hidden">
        <button class="btn-outline text-xs py-1.5 px-2.5" onclick="abrirNoDashboard('${s.id}', '${s.data_viagem}')">Gerenciar</button>
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
//
// CORREÇÃO (pedido do usuário: "se clicar em Gerenciar, abrir a solicitação
// específica, dar opção de modificação e salvamento"): filtrar só pela data
// da viagem pode deixar várias corridas visíveis no mesmo dia - agora
// recebe também o ID da solicitação clicada na Agenda, rola a tela até a
// linha exata e destaca ela por alguns segundos. A edição em si já é
// inline em cada campo da tabela (salva sozinho ao sair do campo) - só
// faltava apontar pra linha certa em vez de deixar o gestor procurar.
async function abrirNoDashboard(idSolicitacao, dataViagem) {
  esconderTodasTelas();
  document.getElementById('tela-gerenciamento-solicitacoes').classList.remove('hidden');
  marcarAbaAtiva('gerenciamento-solicitacoes');
  await carregarGerenciamentoSolicitacoes(true);

  const campo = document.getElementById('filtro-gestor-data-viagem');
  if (campo) {
    campo.value = dataViagem;
    aplicarFiltrosGestor();
  }

  requestAnimationFrame(() => {
    const linha = document.querySelector(`#tb-gestor-geral tr[data-id="${idSolicitacao}"]`);
    if (!linha) return;
    linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
    linha.classList.add('linha-destacada-gerenciar');
    setTimeout(() => linha.classList.remove('linha-destacada-gerenciar'), 2500);
  });
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
    'Condutor Ida': condutorLabelAgenda(s.condutor_ida),
    'Condutor Volta': condutorLabelAgenda(s.condutor_volta)
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
window.filtrarAgendaHoje = filtrarAgendaHoje;
window.abrirNoDashboard = abrirNoDashboard;
window.exportarAgendaXlsxUI = exportarAgendaXlsxUI;
