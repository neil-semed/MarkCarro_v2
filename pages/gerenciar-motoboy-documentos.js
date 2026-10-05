// ============================================================
// MARKCARRO - Página: Motoboy - Documentos (Admin/Gestor)
// ============================================================
// PEDIDO DO USUÁRIO: "crie uma tela para gerenciar os pedidos de motoboy -
// documentos... com as mesmas atribuições" de Gerenciamento de Solicitações
// (confirmar/marcar ocupado/cancelar/reverter/editar inline) - mesmo padrão
// daquela tela (pages/gerenciamento-solicitacoes.js), só filtrada pra
// Tipo = Motoboy e com uma única coluna de condutor ("Motoboy", em vez de
// Ida/Volta separados - uma entrega normalmente tem 1 entregador só).
// Reaproveita funções genéricas já existentes em gerenciamento-
// solicitacoes.js (obterDescricaoCondutor, _notificarConfirmacao) - mesmo
// escopo global de sempre neste app (scripts clássicos, sem módulos).

let cacheTodasMotoboy = [];
let edicoesPendentesMotoboy = {};

async function carregarGerenciarMotoboyDocumentos(forcarAtualizacao = false) {
  const tbody = document.getElementById('tb-motoboy-geral');
  Components.Loading.show(tbody);
  try {
    const [solicitacoes, condutores] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores()
    ]);

    cacheCondutores = condutores || [];
    cacheTodasMotoboy = (solicitacoes || []).filter(s => s.tipo_viagem === 'Motoboy');

    // Mesma transição automática Pendente -> "Em Análise" de Gerenciamento
    // de Solicitações - pulada pra quem só tem Consulta nesta tela (Perfis
    // de Acesso).
    if (usuarioPodeEditarTela('gerenciar-motoboy-documentos')) {
      await marcarPendentesComoEmAnalise(cacheTodasMotoboy);
    }

    aplicarFiltrosMotoboy();
    aplicarModoConsultaTela('gerenciar-motoboy-documentos', null);
  } catch (e) {
    console.error('Erro ao carregar Motoboy - Documentos:', e);
    tbody.innerHTML = `<tr><td colspan="14" class="text-center text-red-500 p-4">Erro ao carregar. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarMotoboyDocumentos(true)">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar pedidos de Motoboy');
  }
}

function aplicarFiltrosMotoboy() {
  const dataSolic = document.getElementById('filtro-motoboy-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-motoboy-data-viagem')?.value;
  const status = document.getElementById('filtro-motoboy-status')?.value || 'TODOS';

  let filtrados = cacheTodasMotoboy;
  if (dataSolic) filtrados = filtrados.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  if (dataViagem) filtrados = filtrados.filter(s => s.data_viagem === dataViagem);
  if (status !== 'TODOS') filtrados = filtrados.filter(s => (s.status || 'Pendente') === status);

  filtrados = ordenarPorDataEHoraSaida(filtrados.slice());
  renderizarTabelaMotoboyCompleta(filtrados);
}

function filtrarMotoboyHoje() {
  const campo = document.getElementById('filtro-motoboy-data-viagem');
  if (!campo) return;
  const hoje = new Date();
  const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  campo.value = hojeISO;
  aplicarFiltrosMotoboy();
}

function limparFiltrosMotoboy() {
  document.getElementById('filtro-motoboy-data-solic').value = '';
  document.getElementById('filtro-motoboy-data-viagem').value = '';
  document.getElementById('filtro-motoboy-status').value = 'TODOS';
  aplicarFiltrosMotoboy();
}

function exportarMotoboyXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheTodasMotoboy.length) return Components.Toast.warning('Não há pedidos de Motoboy para exportar');

  const linhas = cacheTodasMotoboy.map(s => ({
    'Solicitado em': formatarDataHoraBR(s.data_solicitacao),
    'Data da Entrega': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Justificativa': s.justificativa,
    'Nº Documentos': s.qtd_pessoas,
    'Status': s.status,
    'Motoboy': s.condutor_ida || ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Motoboy');
  XLSX.writeFile(livro, 'MarkCarro_MotoboyDocumentos.xlsx');
}

// Relatório PDF de Motoboy - Documentos: mesmo desenho do PDF da Agenda,
// só com pedidos de Motoboy (respeita os filtros da tela).
function exportarMotoboyPDF() {
  if (typeof window.jspdf === 'undefined') return Components.Toast.error('Biblioteca de geração de PDF não carregada');
  const dataSolic = document.getElementById('filtro-motoboy-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-motoboy-data-viagem')?.value;
  const status = document.getElementById('filtro-motoboy-status')?.value || 'TODOS';
  let dados = cacheTodasMotoboy.slice();
  if (dataSolic) dados = dados.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  if (dataViagem) dados = dados.filter(s => s.data_viagem === dataViagem);
  if (status !== 'TODOS') dados = dados.filter(s => (s.status || 'Pendente') === status);
  dados = ordenarPorDataEHoraSaida(dados);
  if (!dados.length) return Components.Toast.warning('Não há pedidos de Motoboy para gerar o relatório');

  _gerarRelatorioTabelaPDF(dados.map(s => ({
    data: formatarDataBR(s.data_viagem),
    saida: formatarHoraBR(s.hora_saida),
    retorno: formatarHoraBR(s.hora_retorno),
    origem: s.origem,
    destino: s.destino,
    solicitante: s.nome_ext || s.email_solicitante,
    celular: s.telefone_ext,
    extra: s.qtd_pessoas,
    condutor: s.condutor_ida || '',
    status: s.status,
  })), {
    titulo: 'MarkCarro | Motoboy - Documentos',
    rotulo: 'Relatório Geral',
    periodo: dataViagem ? formatarDataBR(dataViagem) : 'Todas as datas',
    comData: true,
    rotuloQtd: 'ENTREGAS', rotuloExtra: 'Nº DOC.', rotuloCondutor: 'MOTOBOY',
    nomeArquivo: `markcarro-motoboy-${Date.now()}.pdf`,
    mensagemSucesso: 'Relatório de Motoboy gerado com sucesso!',
  });
}

function marcarCampoAlteradoMotoboy(id, campo, valor) {
  if (!edicoesPendentesMotoboy[id]) edicoesPendentesMotoboy[id] = {};
  edicoesPendentesMotoboy[id][campo] = valor;

  const row = document.querySelector(`#tb-motoboy-geral tr[data-id="${id}"]`);
  if (row) row.style.background = '#fffbeb';
  document.getElementById(`btn-salvar-motoboy-${id}`)?.classList.remove('hidden');
}

function handleSelectLocalMotoboy(selectEl, id, campo) {
  const inputOutro = selectEl.nextElementSibling;
  if (selectEl.value === 'Outro') {
    inputOutro?.classList.remove('hidden');
    inputOutro?.focus();
    return;
  }
  inputOutro?.classList.add('hidden');
  marcarCampoAlteradoMotoboy(id, campo, selectEl.value);
}

async function salvarEdicoesLinhaMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const alteracoes = edicoesPendentesMotoboy[id];
  if (!alteracoes || !Object.keys(alteracoes).length) return Components.Toast.info('Nenhuma alteração para salvar.');

  const btn = document.getElementById(`btn-salvar-motoboy-${id}`);
  const textoOriginal = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

  try {
    await atualizarSolicitacao(id, alteracoes);

    const item = cacheTodasMotoboy.find(s => s.id === id);
    if (item) Object.assign(item, alteracoes);

    delete edicoesPendentesMotoboy[id];
    Components.Toast.success('Alterações salvas!');

    const row = document.querySelector(`#tb-motoboy-geral tr[data-id="${id}"]`);
    if (row) row.style.background = '';
  } catch (e) {
    console.error('Erro ao salvar alterações do pedido de Motoboy', id, e);
    Components.Toast.error('Erro ao salvar: ' + (e?.message || 'motivo desconhecido'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

function renderizarTabelaMotoboyCompleta(dados) {
  const tbody = document.getElementById('tb-motoboy-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="13" class="text-center text-slate-500 p-4">Nenhum pedido de Motoboy</td></tr>';
    return;
  }

  // Só entregadores Categoria = Motoboy entram no dropdown de atribuição -
  // evita escalar por engano um condutor de Categoria = Motorista pra uma
  // entrega de documentos.
  const opcoesMotoboy = cacheCondutores
    .filter(c => c.categoria === 'Motoboy')
    .map(c => `<option value="${c.email}">${c.nome}</option>`)
    .join('');

  tbody.innerHTML = dados.map(s => {
    const status = s.status || 'Pendente';
    const nomeCurto = primeiroNomeGestor(s.nome_ext) || s.email_solicitante;
    const pend = edicoesPendentesMotoboy[s.id] || {};
    const v = { ...s, ...pend };
    const temPendencia = Object.keys(pend).length > 0;
    return `
    <tr data-id="${s.id}" ${temPendencia ? 'style="background:#fffbeb"' : ''}>
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td><input type="date" value="${v.data_viagem || ''}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'data_viagem', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(v.hora_saida)}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'hora_saida', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(v.hora_retorno)}" class="input-field text-sm py-1.5 px-2" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'hora_retorno', this.value)"></td>
      <td style="min-width:240px">
        <p class="text-xs text-slate-600 whitespace-normal break-words mb-1">${escGestor(v.origem) || '—'}</p>
        <select class="input-field text-sm py-2 px-2 w-full" onchange="handleSelectLocalMotoboy(this, '${s.id}', 'origem')">
          ${gerarOpcoesLocaisGestor(v.origem)}
        </select>
        <input type="text" value="${escGestor(v.origem)}" placeholder="Digite o local" class="input-field text-sm py-1.5 px-2 mt-1 hidden" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'origem', this.value)">
      </td>
      <td style="min-width:240px">
        <p class="text-xs text-slate-600 whitespace-normal break-words mb-1">${escGestor(v.destino) || '—'}</p>
        <select class="input-field text-sm py-2 px-2 w-full" onchange="handleSelectLocalMotoboy(this, '${s.id}', 'destino')">
          ${gerarOpcoesLocaisGestor(v.destino)}
        </select>
        <input type="text" value="${escGestor(v.destino)}" placeholder="Digite o local" class="input-field text-sm py-1.5 px-2 mt-1 hidden" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'destino', this.value)">
      </td>
      <td style="max-width:90px; white-space:normal; overflow-wrap:break-word;" title="${escGestor(s.nome_ext || s.email_solicitante)}">${nomeCurto}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <td style="min-width:160px">
        <textarea rows="2" class="input-field text-sm py-1.5 px-2" style="min-width:150px" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'justificativa', this.value)">${escGestor(v.justificativa)}</textarea>
      </td>
      <td style="min-width:80px"><input type="number" value="${v.qtd_pessoas}" class="input-field text-sm py-1.5 px-2" min="1" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'qtd_pessoas', this.value)"></td>
      <td><span class="badge ${classeStatus(status)}">${status}</span></td>
      <td style="min-width:330px">
        <select class="input-field text-sm py-1.5 px-2 w-full mb-1 select-motoboy" onchange="marcarCampoAlteradoMotoboy('${s.id}', 'condutor_ida', this.value)">
          <option value="">— Motoboy —</option>
          ${opcoesMotoboy}
        </select>
        <div class="flex gap-0.5">
          <button id="btn-salvar-motoboy-${s.id}" class="btn-acao-claro btn-acao-azul flex-1" onclick="salvarEdicoesLinhaMotoboy('${s.id}')">Salvar</button>
          ${status === 'Pendente' || status === 'Em Análise' ? `
            <button class="btn-acao-claro btn-acao-verde flex-1" onclick="confirmarMotoboy('${s.id}')">Confirmar</button>
            <button class="btn-acao-claro btn-acao-vermelho flex-1" onclick="cancelarMotoboy('${s.id}')">Cancelar</button>
            <button class="btn-acao-claro btn-acao-amarelo flex-1" onclick="marcarOcupadoMotoboy('${s.id}')">Ocupado</button>
          ` : `
            ${status !== 'Cancelada' && status !== 'Desprezado' ? `<button class="btn-acao-claro btn-acao-vermelho flex-1" onclick="cancelarMotoboy('${s.id}')">Cancelar</button>` : ''}
            <button class="btn-acao-claro btn-acao-azul flex-1" onclick="reverterStatusMotoboy('${s.id}')">Reverter</button>
            ${status !== 'Ocupado' && status !== 'Desprezado' ? `<button class="btn-acao-claro btn-acao-amarelo flex-1" onclick="marcarOcupadoMotoboy('${s.id}')">Ocupado</button>` : ''}
          `}
          <button class="btn-acao-claro btn-acao-vermelho flex-1" onclick="excluirMotoboy('${s.id}')">Excluir</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  dados.forEach(s => {
    const row = tbody.querySelector(`tr[data-id="${s.id}"]`);
    if (row) {
      const pend = edicoesPendentesMotoboy[s.id] || {};
      const selMotoboy = row.querySelector('.select-motoboy');
      if (selMotoboy) selMotoboy.value = ('condutor_ida' in pend) ? pend.condutor_ida : (s.condutor_ida || '');
    }
  });
}

async function confirmarMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const row = document.querySelector(`#tb-motoboy-geral tr[data-id="${id}"]`);
  const condutorMotoboy = row.querySelector('.select-motoboy').value;

  if (!condutorMotoboy) return Components.Toast.error('Selecione o Motoboy responsável');

  const solicitacao = cacheTodasMotoboy.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Confirmada', condutor_ida: condutorMotoboy });
    Components.Toast.success('Pedido de Motoboy confirmado!');
    if (solicitacao) _notificarConfirmacao(solicitacao, condutorMotoboy, null);
    carregarGerenciarMotoboyDocumentos(true);
  } catch (e) {
    Components.Toast.error('Erro ao confirmar');
  }
}

// PEDIDO DO USUÁRIO ("mesmas atribuições" de Gerenciamento de Solicitações):
// mesmo "Confirmar geral" daquela tela - confirma de uma vez todos os
// pedidos de Motoboy com entregador já atribuído, em qualquer status não
// final (Pendente ou Em Análise).
async function confirmarGeralMotoboy() {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const alvos = cacheTodasMotoboy.filter(s => {
    const status = s.status || 'Pendente';
    return !!s.condutor_ida && (status === 'Pendente' || status === 'Em Análise');
  });

  if (!alvos.length) {
    Components.Toast.info('Nenhum pedido de Motoboy com entregador atribuído aguardando confirmação.');
    return;
  }
  if (!confirm(`Confirmar ${alvos.length} pedido(s) de Motoboy com entregador já atribuído?`)) return;

  let sucesso = 0, falha = 0;
  for (const s of alvos) {
    try {
      await atualizarSolicitacao(s.id, { status: 'Confirmada', condutor_ida: s.condutor_ida });
      s.status = 'Confirmada';
      sucesso++;
      _notificarConfirmacao(s, s.condutor_ida, null);
    } catch (e) {
      console.error('Erro ao confirmar em lote o pedido de Motoboy', s.id, e);
      falha++;
    }
  }

  if (falha) Components.Toast.warning(`${sucesso} confirmado(s), ${falha} com erro.`);
  else Components.Toast.success(`${sucesso} pedido(s) de Motoboy confirmado(s)!`);

  aplicarFiltrosMotoboy();
}

async function marcarOcupadoMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  if (!confirm('Marcar como OCUPADO? O solicitante será notificado.')) return;

  const solicitacao = cacheTodasMotoboy.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Ocupado' });
    Components.Toast.success('Marcado como Ocupado');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'ocupado',
        mensagem: `Sem motoboy disponível para ${quando} (${trecho}). Entre em contato para reagendar.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciarMotoboyDocumentos(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function cancelarMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  if (!confirm('Cancelar este pedido de Motoboy?')) return;

  const solicitacao = cacheTodasMotoboy.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Cancelada' });
    Components.Toast.success('Cancelado');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'cancelamento_gestor',
        mensagem: `Pedido de Motoboy de ${quando} (${trecho}) cancelado pela gestão.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciarMotoboyDocumentos(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function reverterStatusMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const solicitacao = cacheTodasMotoboy.find(s => String(s.id) === String(id));
  const statusAtual = solicitacao?.status || '';
  if (!confirm(`Reverter este pedido de "${statusAtual}" para "Em Análise"?`)) return;

  try {
    await atualizarSolicitacao(id, { status: 'Em Análise' });
    Components.Toast.success('Status revertido para Em Análise.');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'revertido',
        mensagem: `Seu pedido de Motoboy de ${quando} (${trecho}) voltou a ser analisado pela gestão.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciarMotoboyDocumentos(true);
  } catch (e) {
    console.error('Erro ao reverter status do pedido de Motoboy', id, e);
    Components.Toast.error('Erro ao reverter: ' + (e?.message || 'motivo desconhecido'));
  }
}

// Exclui definitivamente o pedido (mesma ação de Gerenciar Solicitações).
async function excluirMotoboy(id) {
  if (!usuarioPodeEditarTela('gerenciar-motoboy-documentos')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const solicitacao = cacheTodasMotoboy.find(s => String(s.id) === String(id));
  const trecho = solicitacao ? ` (${solicitacao.origem} → ${solicitacao.destino})` : '';
  if (!confirm(`Excluir definitivamente este pedido de Motoboy${trecho}? Essa ação NÃO pode ser desfeita.`)) return;

  try {
    await excluirSolicitacao(id);
    Components.Toast.success('Pedido excluído.');
    carregarGerenciarMotoboyDocumentos(true);
  } catch (e) {
    console.error('Erro ao excluir pedido de Motoboy:', e);
    Components.Toast.error('Erro ao excluir: ' + (e?.message || 'motivo desconhecido'));
  }
}

// Expor globalmente
window.excluirMotoboy = excluirMotoboy;
window.carregarGerenciarMotoboyDocumentos = carregarGerenciarMotoboyDocumentos;
window.aplicarFiltrosMotoboy = aplicarFiltrosMotoboy;
window.filtrarMotoboyHoje = filtrarMotoboyHoje;
window.limparFiltrosMotoboy = limparFiltrosMotoboy;
window.exportarMotoboyXlsxUI = exportarMotoboyXlsxUI;
window.exportarMotoboyPDF = exportarMotoboyPDF;
window.marcarCampoAlteradoMotoboy = marcarCampoAlteradoMotoboy;
window.handleSelectLocalMotoboy = handleSelectLocalMotoboy;
window.salvarEdicoesLinhaMotoboy = salvarEdicoesLinhaMotoboy;
window.confirmarMotoboy = confirmarMotoboy;
window.confirmarGeralMotoboy = confirmarGeralMotoboy;
window.marcarOcupadoMotoboy = marcarOcupadoMotoboy;
window.cancelarMotoboy = cancelarMotoboy;
window.reverterStatusMotoboy = reverterStatusMotoboy;
