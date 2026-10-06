// ============================================================
// MARKCARRO - Página: Agenda de Corridas (Gestor)
// ============================================================

// cacheAgenda guarda o resultado bruto da consulta por data (usado pelo
// filtro de status, que é aplicado no cliente, e pela exportação Excel).
let cacheAgenda = [];

// Logo usada nos cabeçalhos dos relatórios em PDF (Relatório PDF / Escala) -
// mesmo favicon do app/APK, embutido em base64 pra não depender de rede
// nem de CORS ao gerar o PDF (jsPDF precisa da imagem já carregada).
const LOGO_PDF_B64 = 'data:image/png;base64,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';

// Nome "limpo" do condutor pros relatórios em PDF (Relatório PDF / Escala) -
// diferente de condutorLabelAgenda() (que acrescenta capacidade/telefone pra
// exibição na tela), aqui só o nome, pra não poluir a coluna "Condutor".
function nomeCondutorAgenda(email) {
  if (!email) return '';
  const c = (cacheCondutoresParaExibicao || []).find(x => x.email === email);
  return c ? c.nome : email;
}

// Junta Condutor Ida + Condutor Volta numa única coluna "Condutor" (mesmo
// padrão da célula combinada do e-mail da Agenda): só o nome quando é o
// mesmo condutor nas duas pernas, "Fulano (ida) / Beltrano (volta)" quando
// são diferentes.
function combinarCondutoresAgenda(s) {
  const ida = s.condutor_ida ? nomeCondutorAgenda(s.condutor_ida) : '';
  const volta = s.condutor_volta ? nomeCondutorAgenda(s.condutor_volta) : '';
  if (ida && volta) return ida === volta ? ida : `${ida} (ida) / ${volta} (volta)`;
  return ida || volta || '-';
}

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

// PEDIDO DO USUÁRIO: "crie a opção de mandar e-mail da agenda de corridas
// do dia selecionado, para uma lista de e-mails editáveis... o envio de
// e-mail deve ser automático". Diferente da exportação em Excel/PDF (só
// baixa um arquivo no navegador de quem clicou), este botão chama a Edge
// Function enviar-agenda-email (ver enviarAgendaPorEmail() em api.js), que
// dispara de verdade um e-mail (via Brevo) pra lista de Destinatários
// cadastrada em Gerenciar Usuários.
//
// Usa o mesmo período (Data Inicial/Data Final) já filtrado na tela - se o
// admin deixar um período de vários dias, envia o período inteiro num
// e-mail só (decisão do usuário, não um e-mail por dia).
async function enviarAgendaEmailUI() {
  const inicio = document.getElementById('agenda-data-inicio').value;
  const fim = document.getElementById('agenda-data-fim').value || inicio;

  if (!inicio) {
    return Components.Toast.warning('Selecione ao menos a Data Inicial pra enviar o relatório por e-mail.');
  }

  const periodoTexto = inicio === fim
    ? formatarDataBR(inicio)
    : `${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;
  // CORREÇÃO URGENTE ("não está mandando para todos os emails
  // cadastrados"): o texto dizia "ativos" porque o envio excluía quem
  // estava Bloqueado - agora manda pra todos os cadastrados, então o
  // texto não fala mais só em "ativos".
  if (!confirm(`Enviar por e-mail a Agenda de Corridas de ${periodoTexto} pra todos os destinatários cadastrados em Gerenciar Usuários?`)) return;

  const btn = document.getElementById('btn-enviar-agenda-email');
  const textoOriginal = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Enviando...'; }

  try {
    const resultado = await enviarAgendaPorEmail(inicio, fim);
    Components.Toast.success(`E-mail enviado! ${resultado.corridas} corrida(s) para ${resultado.enviados} destinatário(s).`);
  } catch (e) {
    console.error('Erro ao enviar Agenda por e-mail:', e);
    Components.Toast.error('Erro ao enviar: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

// O sistema antigo enviava a agenda do dia por e-mail para uma lista de
// distribuição (enviarAgendaPorEmail) - HISTÓRICO: até esta versão, o app
// não tinha backend próprio pra disparar e-mail e o botão ficava só na
// exportação em Excel abaixo. Agora o envio automático de verdade existe
// (ver enviarAgendaEmailUI() acima) - a exportação em Excel continua útil
// pra baixar/compartilhar manualmente, então foi mantida do lado do botão
// novo, não substituída.
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

// CORREÇÃO (pedido do usuário: "criar um relatório de verdade, pois está
// exibindo a página ao clicar no botão imprimir"): o botão "Imprimir"
// chamava window.print() na tela viva do app - saía com menu/filtro/botão
// da interface junto, ilegível. Agora gera um PDF de verdade (jsPDF +
// AutoTable).
// PEDIDO DO USUÁRIO (restyle + botão novo "Escala"): layout dos relatórios
// em PDF (Relatório PDF e Escala) refeito pra seguir o mesmo visual do
// e-mail da Agenda de Corridas (cabeçalho com logo, sem faixa azul de
// fundo, linha azul fina de destaque, caixa Período/Corridas, tabela com
// cabeçalho amarelo) - esboço em HTML aprovado pelo usuário antes desta
// implementação. _gerarRelatorioAgendaPDF() é o gerador compartilhado pelos
// dois botões; só muda o conjunto de linhas e se a coluna Data aparece.
function _gerarRelatorioAgendaPDF(dados, opcoes) {
  const { comData, rotulo, nomeArquivo, mensagemSucesso } = opcoes;
  const inicio = document.getElementById('agenda-data-inicio')?.value;
  const fim = document.getElementById('agenda-data-fim')?.value;
  const periodo = (inicio || fim)
    ? `${inicio ? formatarDataBR(inicio) : '…'} a ${fim ? formatarDataBR(fim) : '…'}`
    : 'Todas as datas';
  _gerarRelatorioTabelaPDF(dados.map(s => ({
    data: formatarDataBR(s.data_viagem),
    saida: formatarHoraBR(s.hora_saida),
    retorno: formatarHoraBR(s.hora_retorno),
    origem: s.origem,
    destino: s.destino,
    solicitante: s.nome_ext || s.email_solicitante,
    celular: s.telefone_ext,
    extra: s.qtd_pessoas,
    condutor: combinarCondutoresAgenda(s),
    status: s.status,
  })), {
    titulo: 'MarkCarro | Agenda de Corridas', rotulo, periodo, comData, nomeArquivo, mensagemSucesso,
    rotuloQtd: 'CORRIDAS', rotuloExtra: 'PASS', rotuloCondutor: 'CONDUTOR',
  });
}

// Gerador de PDF em tabela compartilhado (Agenda de Corridas, Escala e
// Motoboy - Documentos). Cada linha: {data, saida, retorno, origem, destino,
// solicitante, celular, extra, condutor, status}. Colunas curtas (data,
// horário, celular, quantidade, status) ocupam só o tamanho do conteúdo; a
// sobra é dividida entre Origem, Destino, Solicitante e Condutor, que
// quebram linha. Setinha desenhada (a fonte do PDF não tem "→") dentro da
// própria célula de horário, entre saída e retorno.
function _gerarRelatorioTabelaPDF(linhas, opc) {
  const PAD = 1.2, FS = 7, LH = 3.1, ARW = 5, GAP = 1.6;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const L = doc.internal.pageSize.getWidth(), DISP = L - 20;
  const larg = (str, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(FS); return doc.getTextWidth(String(str)); };

  doc.addImage(LOGO_PDF_B64, 'PNG', 10, 4, 9, 9);
  doc.setTextColor(15, 23, 42); doc.setFontSize(12.5); doc.setFont('helvetica', 'bold');
  doc.text(opc.titulo, 22, 9);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(CONFIG.ORGAO || 'SEMED Nova Lima', 22, 13.5);
  doc.setFontSize(9); doc.text(opc.rotulo, L - 10, 9, { align: 'right' });
  doc.setFillColor(250, 204, 21); doc.rect(10, 16, L - 20, 0.8, 'F'); doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: 20, margin: { left: 10, right: 10 }, tableWidth: 'wrap',
    body: [['PERÍODO', opc.periodo, opc.rotuloQtd, String(linhas.length)]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { fillColor: [219, 234, 254], fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 80 },
      2: { fillColor: [219, 234, 254], fontStyle: 'bold', cellWidth: 25 },
      3: { cellWidth: 20 },
    },
  });

  const v = f => linhas.map(f);
  const cols = [];
  if (opc.comData) cols.push({ h: 'DATA', t: 'txt', d: v(r => r.data || '-') });
  cols.push({ h: 'HORÁRIO', t: 'par', d: v(r => [r.saida || '-', r.retorno || '-']) });
  cols.push({ h: 'ORIGEM', t: 'txt', flex: true, d: v(r => r.origem || '-') });
  cols.push({ h: 'DESTINO', t: 'txt', flex: true, d: v(r => r.destino || '-') });
  cols.push({ h: 'SOLICITANTE', t: 'txt', flex: true, d: v(r => r.solicitante || '-') });
  cols.push({ h: 'CELULAR', t: 'txt', d: v(r => r.celular || '-') });
  cols.push({ h: opc.rotuloExtra, t: 'txt', center: true, d: v(r => String(r.extra ?? '')) });
  cols.push({ h: opc.rotuloCondutor, t: 'txt', flex: true, d: v(r => r.condutor || '-') });
  cols.push({ h: 'STATUS', t: 'txt', d: v(r => r.status || 'Pendente') });

  cols.forEach(c => {
    if (c.t === 'par') {
      const m = Math.max(...c.d.flat().map(x => larg(x)), 0);
      c.w = Math.max(2 * m + ARW + 2 * GAP + 2 * PAD + 0.4, larg(c.h, true) + 2 * PAD + 0.6);
      c.min = c.w;
    } else {
      const m = Math.max(...c.d.map(x => larg(x)), larg(c.h, true));
      c.w = Math.min(m, c.flex ? 70 : m) + 2 * PAD + 0.6;
      c.min = c.flex ? Math.min(c.w, 26) : c.w;
    }
  });
  let tot = cols.reduce((a, c) => a + c.w, 0);
  const flex = cols.filter(c => c.flex);
  if (tot > DISP) {
    const soma = flex.reduce((a, c) => a + c.w, 0), alvo = DISP - (tot - soma);
    flex.forEach(c => { c.w = Math.max(c.min, c.w * alvo / soma); });
  }
  tot = cols.reduce((a, c) => a + c.w, 0);
  if (tot < DISP && flex.length) flex.forEach(c => { c.w += (DISP - tot) / flex.length; });

  const desenharSeta = (x, cy) => {
    doc.setDrawColor(71, 85, 105); doc.setFillColor(71, 85, 105); doc.setLineWidth(0.25);
    doc.line(x + 0.6, cy, x + ARW - 1.8, cy);
    doc.triangle(x + ARW - 0.6, cy, x + ARW - 2.2, cy - 0.95, x + ARW - 2.2, cy + 0.95, 'F');
  };
  const desenharPar = (cell, a, b) => {
    const half = (cell.width - 2 * PAD - ARW - 2 * GAP) / 2;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(FS); doc.setTextColor(0, 0, 0);
    const y = cell.y + cell.height / 2 + LH * 0.28;
    doc.text(String(a), cell.x + PAD, y);
    doc.text(String(b), cell.x + PAD + half + 2 * GAP + ARW, y);
    desenharSeta(cell.x + PAD + half + GAP, cell.y + cell.height / 2);
  };

  const columnStyles = {};
  cols.forEach((c, i) => { columnStyles[i] = { cellWidth: c.w, halign: c.center ? 'center' : 'left' }; });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: 10, right: 10 },
    head: [cols.map(c => c.h)],
    body: linhas.map((r, i) => cols.map(c => (c.t === 'par' ? '' : c.d[i]))),
    theme: 'grid',
    styles: { fontSize: FS, cellPadding: PAD, valign: 'middle', textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.15, overflow: 'linebreak' },
    headStyles: { fillColor: [250, 204, 21], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left', fontSize: FS },
    columnStyles,
    rowPageBreak: 'avoid',
    didDrawCell: (d) => {
      const c = cols[d.column.index];
      if (d.section === 'body' && c.t === 'par' && d.row.index >= 0 && c.d[d.row.index]) desenharPar(d.cell, ...c.d[d.row.index]);
    },
  });

  const paginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${paginas}`, 14, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(opc.nomeArquivo);
  Components.Toast.success(opc.mensagemSucesso);
}
window._gerarRelatorioTabelaPDF = _gerarRelatorioTabelaPDF;

// Reaproveita o mesmo filtro de Status já aplicado na tela (mesmo padrão de
// exportarAgendaXlsxUI).
function exportarAgendaPDF() {
  if (typeof window.jspdf === 'undefined') return Components.Toast.error('Biblioteca de geração de PDF não carregada');
  const status = document.getElementById('agenda-filtro-status')?.value || 'TODOS';
  const dados = ordenarPorDataEHoraSaida(
    (status === 'TODOS' ? cacheAgenda.slice() : cacheAgenda.filter(s => (s.status || 'Pendente') === status))
      .filter(s => s.tipo_viagem !== 'Motoboy')
  );
  if (!dados.length) return Components.Toast.warning('Não há corridas no período para gerar o relatório');

  _gerarRelatorioAgendaPDF(dados, {
    comData: true,
    rotulo: 'Relatório Geral',
    nomeArquivo: `markcarro-agenda-${Date.now()}.pdf`,
    mensagemSucesso: 'Relatório em PDF gerado com sucesso!',
  });
}

// PEDIDO DO USUÁRIO (botão novo "Escala"): mesma geração do "Gerar
// Relatório PDF", mas só com corridas que já têm motorista atribuído (ida
// e/ou volta) - sem coluna Data, com coluna Celular do solicitante.
function exportarEscalaPDF() {
  if (typeof window.jspdf === 'undefined') return Components.Toast.error('Biblioteca de geração de PDF não carregada');
  const status = document.getElementById('agenda-filtro-status')?.value || 'TODOS';
  const dados = ordenarPorDataEHoraSaida(
    (status === 'TODOS' ? cacheAgenda.slice() : cacheAgenda.filter(s => (s.status || 'Pendente') === status))
      .filter(s => s.condutor_ida || s.condutor_volta)
  );
  if (!dados.length) return Components.Toast.warning('Não há corridas com condutor atribuído no período para gerar a escala');

  _gerarRelatorioAgendaPDF(dados, {
    comData: false,
    rotulo: 'Escala',
    nomeArquivo: `markcarro-escala-${Date.now()}.pdf`,
    mensagemSucesso: 'Escala em PDF gerada com sucesso!',
  });
}

// Expor globalmente
window.exportarAgendaPDF = exportarAgendaPDF;
window.exportarEscalaPDF = exportarEscalaPDF;
window.carregarTelaAgenda = carregarTelaAgenda;
window.aplicarFiltrosAgenda = aplicarFiltrosAgenda;
window.limparFiltrosAgenda = limparFiltrosAgenda;
window.filtrarAgendaHoje = filtrarAgendaHoje;
window.abrirNoDashboard = abrirNoDashboard;
window.exportarAgendaXlsxUI = exportarAgendaXlsxUI;
window.enviarAgendaEmailUI = enviarAgendaEmailUI;
