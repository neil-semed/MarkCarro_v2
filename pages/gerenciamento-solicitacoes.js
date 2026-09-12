// ============================================================
// MARKCARRO - Página: Gerenciamento de Solicitações (Gestor)
// ============================================================
// CORREÇÃO: esta tabela operacional (Confirmar/Ocupado/Cancelar/atribuir
// condutor) morava dentro da mesma tela do Dashboard (pages/gestor.js),
// um embaixo do outro - a fusão causava confusão sobre onde estava o quê
// (item 8 do lote de correções: "ao clicar no botão, volta ao painel, vai
// para dashboard - sem acesso ao painel de viagens"). A pedido do usuário,
// virou tela própria, com sua própria pílula de navegação
// (#btn-gerenciamento-solicitacoes) e busca independente da do Dashboard.

// Cache própria desta tela - guarda a última lista carregada, usada pelo
// botão "Exportar Excel" e pelos filtros da tela (aplicarFiltrosGestor).
// Independente de cacheSolicitacoesDashboard (pages/gestor.js).
let cacheTodasSolicitacoesGestor = [];

async function carregarGerenciamentoSolicitacoes(forcarAtualizacao = false) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!forcarAtualizacao && tbody.children.length > 1) return;

  Components.Loading.show(tbody);
  try {
    const [solicitacoes, condutores] = await Promise.all([
      buscarTodasSolicitacoes(),
      listarCondutores()
    ]);

    cacheCondutores = condutores || [];
    cacheTodasSolicitacoesGestor = solicitacoes || [];

    renderizarAvisoCnh('aviso-cnh-gerenciamento', cacheCondutores);

    // Transição automática Pendente -> "Em Análise": equivalente a
    // marcarEmAnalise() do sistema antigo, que era disparada quando o
    // gestor abria/expandia uma linha pela primeira vez. Como esta tela
    // não tem esse conceito de "expandir linha" (a tabela já mostra tudo
    // de uma vez), o momento equivalente aqui é o próprio carregamento
    // desta tela - só de abrir já conta como "o gestor viu".
    await marcarPendentesComoEmAnalise(cacheTodasSolicitacoesGestor);

    aplicarFiltrosGestor();
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar gerenciamento de solicitações:', e);
    tbody.innerHTML = `<tr><td colspan="16" class="text-center text-red-500 p-4">Erro ao carregar. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciamentoSolicitacoes(true)">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar solicitações');
  }
}

async function marcarPendentesComoEmAnalise(lista) {
  const pendentes = lista.filter(s => (s.status || 'Pendente') === 'Pendente');
  if (!pendentes.length) return;

  try {
    await Promise.all(pendentes.map(s => atualizarSolicitacao(s.id, { status: 'Em Análise' })));
    pendentes.forEach(s => { s.status = 'Em Análise'; });
  } catch (e) {
    console.warn('Erro ao marcar solicitações como Em Análise:', e);
  }
}

// Filtros da tela (Data da Solicitação / Data da Viagem / Status).
function aplicarFiltrosGestor() {
  const dataSolic = document.getElementById('filtro-gestor-data-solic')?.value;
  const dataViagem = document.getElementById('filtro-gestor-data-viagem')?.value;
  const status = document.getElementById('filtro-gestor-status')?.value || 'TODOS';

  let filtrados = cacheTodasSolicitacoesGestor;
  if (dataSolic) {
    filtrados = filtrados.filter(s => (s.data_solicitacao || '').slice(0, 10) === dataSolic);
  }
  if (dataViagem) {
    filtrados = filtrados.filter(s => s.data_viagem === dataViagem);
  }
  if (status !== 'TODOS') {
    filtrados = filtrados.filter(s => (s.status || 'Pendente') === status);
  }

  renderizarTabelaGestorCompleta(filtrados);
}

function limparFiltrosGestor() {
  document.getElementById('filtro-gestor-data-solic').value = '';
  document.getElementById('filtro-gestor-data-viagem').value = '';
  document.getElementById('filtro-gestor-status').value = 'TODOS';
  aplicarFiltrosGestor();
}

function exportarSolicitacoesXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheTodasSolicitacoesGestor.length) return Components.Toast.warning('Não há solicitações para exportar');

  const linhas = cacheTodasSolicitacoesGestor.map(s => ({
    'Solicitado em': formatarDataHoraBR(s.data_solicitacao),
    'Data da Viagem': formatarDataBR(s.data_viagem),
    'Saída': formatarHoraBR(s.hora_saida),
    'Retorno': formatarHoraBR(s.hora_retorno),
    'Origem': s.origem,
    'Destino': s.destino,
    'Solicitante': s.nome_ext || s.email_solicitante,
    'Unidade': s.unidade || '',
    'Setor': s.setor || '',
    'Justificativa': s.justificativa,
    'Tipo': s.tipo_viagem,
    'Qtd': s.qtd_pessoas,
    'Status': s.status,
    'Condutor Ida': s.condutor_ida || '',
    'Condutor Volta': s.condutor_volta || ''
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Solicitações');
  XLSX.writeFile(livro, 'MarkCarro_PainelGestor.xlsx');
}

function renderizarTabelaGestorCompleta(dados) {
  const tbody = document.getElementById('tb-gestor-geral');
  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-slate-500 p-4">Nenhuma solicitação</td></tr>';
    return;
  }

  const opcoesCondutor = cacheCondutores.map(c =>
    `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`
  ).join('');

  tbody.innerHTML = dados.map(s => {
    const status = s.status || 'Pendente';
    return `
    <tr data-id="${s.id}">
      <td>${formatarDataHoraBR(s.data_solicitacao)}</td>
      <td><input type="date" value="${formatarDataBR(s.data_viagem)}" class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'data_viagem', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_saida)}" class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'hora_saida', this.value)"></td>
      <td><input type="time" value="${formatarHoraBR(s.hora_retorno)}" class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'hora_retorno', this.value)"></td>
      <td><input type="text" value="${s.origem}" class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'origem', this.value)"></td>
      <td><input type="text" value="${s.destino}" class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'destino', this.value)"></td>
      <td>${s.nome_ext || s.email_solicitante}</td>
      <td>${s.unidade || ''}</td>
      <td>${s.setor || ''}</td>
      <td>${s.justificativa}</td>
      <td>${s.tipo_viagem}</td>
      <td><input type="number" value="${s.qtd_pessoas}" class="input-field text-sm py-1.5 px-2" min="1" onchange="salvarCampoGestor('${s.id}', 'qtd_pessoas', this.value)"></td>
      <td><span class="badge ${classeStatus(status)}">${status}</span></td>
      <td>
        <select class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'condutor_ida', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <select class="input-field text-sm py-1.5 px-2" onchange="salvarCampoGestor('${s.id}', 'condutor_volta', this.value)">
          <option value="">—</option>
          ${opcoesCondutor}
        </select>
      </td>
      <td>
        <div class="flex flex-wrap gap-1.5">
          ${status === 'Pendente' || status === 'Em Análise' ? `
            <button class="btn-success text-xs py-1.5 px-2.5" onclick="confirmarSolicitacaoGestor('${s.id}')">✓ Confirmar</button>
            <button class="btn-danger text-xs py-1.5 px-2.5" onclick="cancelarSolicitacaoGestor('${s.id}')">✗ Cancelar</button>
          ` : status === 'Confirmada' ? `
            <button class="btn-warning text-xs py-1.5 px-2.5" onclick="marcarOcupadoGestor('${s.id}')">Ocupado</button>
            <button class="btn-danger text-xs py-1.5 px-2.5" onclick="cancelarSolicitacaoGestor('${s.id}')">Cancelar</button>
          ` : ''}
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarSolicitacaoGestor('${s.id}')">Editar</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  // Preencher selects com valores atuais
  dados.forEach(s => {
    const row = tbody.querySelector(`tr[data-id="${s.id}"]`);
    if (row) {
      row.querySelector('select:nth-of-type(1)').value = s.condutor_ida || '';
      row.querySelector('select:nth-of-type(2)').value = s.condutor_volta || '';
    }
  });
}

async function salvarCampoGestor(id, campo, valor) {
  try {
    await atualizarSolicitacao(id, { [campo]: valor });
  } catch (e) {
    Components.Toast.error('Erro ao salvar');
  }
}

// Descreve um condutor (nome + telefone + placa/modelo) pra compor o texto
// das notificações - equivalente ao trecho de enviarMensagemConfirmacao()
// do sistema antigo que buscava os dados do condutor pra incluir no aviso,
// em vez do gestor precisar digitar isso manualmente.
function obterDescricaoCondutor(email) {
  if (!email) return null;
  const c = cacheCondutores.find(x => x.email === email);
  if (!c) return email;
  const veiculo = [c.placa, c.modelo].filter(Boolean).join(' ');
  return [c.nome, c.telefone, veiculo].filter(Boolean).join(' - ');
}

async function confirmarSolicitacaoGestor(id) {
  const row = document.querySelector(`#tb-gestor-geral tr[data-id="${id}"]`);
  const condutorIda = row.querySelector('select:nth-of-type(1)').value;
  const condutorVolta = row.querySelector('select:nth-of-type(2)').value;

  if (!condutorIda) return Components.Toast.error('Selecione condutor de ida');

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, {
      status: 'Confirmada',
      condutor_ida: condutorIda,
      condutor_volta: condutorVolta || null
    });
    Components.Toast.success('Solicitação confirmada!');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      const descIda = obterDescricaoCondutor(condutorIda);
      const descVolta = condutorVolta ? obterDescricaoCondutor(condutorVolta) : null;

      // Mensagens curtas (pedido do usuário) - os detalhes completos (com a
      // observação de tolerância de horário etc.) continuam disponíveis na
      // tela de Minhas Solicitações, a notificação é só o aviso rápido.
      let msg = `Solicitação confirmada: ${quando} (${trecho}). Condutor: ${descIda || condutorIda}.`;
      if (descVolta && condutorVolta !== condutorIda) msg += ` Volta: ${descVolta}.`;

      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'confirmacao',
        mensagem: msg,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));

      // Corrida "extra" (solicitada no mesmo dia da viagem) - avisa também
      // o(s) condutor(es) escalados, igual ao sistema antigo fazia.
      const ehExtra = (solicitacao.data_solicitacao || '').slice(0, 10) === solicitacao.data_viagem;
      if (ehExtra) {
        const msgCondutor = `Corrida extra atribuída a você para ${quando} (${trecho}).`;
        const destinatarios = [...new Set([condutorIda, condutorVolta].filter(Boolean))];
        destinatarios.forEach(email => {
          criarNotificacao({
            email_destinatario: email,
            tipo: 'corrida_extra',
            mensagem: msgCondutor,
            lida: false
          }).catch(e => console.warn('Erro ao notificar condutor:', e));
        });
      }
    }

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro ao confirmar');
  }
}

async function marcarOcupadoGestor(id) {
  if (!confirm('Marcar como OCUPADO? O solicitante será notificado.')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Ocupado' });
    Components.Toast.success('Marcado como Ocupado');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'ocupado',
        mensagem: `Sem veículo disponível para ${quando} (${trecho}). Entre em contato para reagendar.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

async function cancelarSolicitacaoGestor(id) {
  if (!confirm('Cancelar esta solicitação?')) return;

  const solicitacao = cacheTodasSolicitacoesGestor.find(s => String(s.id) === String(id));

  try {
    await atualizarSolicitacao(id, { status: 'Cancelada' });
    Components.Toast.success('Cancelada');

    if (solicitacao) {
      const trecho = `${solicitacao.origem} → ${solicitacao.destino}`;
      const quando = `${formatarDataBR(solicitacao.data_viagem)} às ${formatarHoraBR(solicitacao.hora_saida)}`;
      criarNotificacao({
        email_destinatario: solicitacao.email_solicitante,
        tipo: 'cancelamento_gestor',
        mensagem: `Solicitação de ${quando} (${trecho}) cancelada pela gestão.`,
        lida: false
      }).catch(e => console.warn('Erro ao notificar solicitante:', e));
    }

    carregarGerenciamentoSolicitacoes(true);
  } catch (e) {
    Components.Toast.error('Erro');
  }
}

function editarSolicitacaoGestor(id) {
  // A edição é inline na tabela
  Components.Toast.info('Edite diretamente na tabela');
}

// Expor globalmente
window.carregarGerenciamentoSolicitacoes = carregarGerenciamentoSolicitacoes;
window.exportarSolicitacoesXlsxUI = exportarSolicitacoesXlsxUI;
window.confirmarSolicitacaoGestor = confirmarSolicitacaoGestor;
window.marcarOcupadoGestor = marcarOcupadoGestor;
window.cancelarSolicitacaoGestor = cancelarSolicitacaoGestor;
window.editarSolicitacaoGestor = editarSolicitacaoGestor;
window.salvarCampoGestor = salvarCampoGestor;
window.aplicarFiltrosGestor = aplicarFiltrosGestor;
window.limparFiltrosGestor = limparFiltrosGestor;
