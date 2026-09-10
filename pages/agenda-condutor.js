// ============================================================
// MARKCARRO - Página Combinada: Agenda do Condutor + Gerenciar Condutores
// ============================================================
// - Agenda do Condutor (topo): visualização de corridas com edição
// - Gerenciar Condutores (baixo): cadastro/edição de condutores
// Sem gráficos.

let cacheCondutores = [];
let cacheCooperativasCondutor = [];
let cacheLocais = [];
let solicitacaoEditandoId = null;

// ============================================================
// INICIALIZAÇÃO DA PÁGINA COMBINADA
// ============================================================
async function carregarPaginaAgendaCondutor() {
  if (!usuarioAtual) return;

  // Carrega caches compartilhados
  try {
    const [condutores, cooperativas, locais] = await Promise.all([
      listarCondutores(),
      listarCooperativasAtivas().catch(() => []),
      listarLocais().catch(() => [])
    ]);
    cacheCondutores = condutores || [];
    cacheCooperativasCondutor = cooperativas || [];
    cacheLocais = locais || [];
    preencherSelectCooperativas();
    preencherSelectCondutoresKm();
  } catch (e) {
    console.error('Erro ao carregar caches:', e);
  }

  // Carrega as duas seções
  await Promise.all([
    carregarAgendaCondutor(),
    carregarGerenciarCondutores()
  ]);
}

// ============================================================
// SEÇÃO 1: AGENDA DO CONDUTOR
// ============================================================
async function carregarAgendaCondutor() {
  const inicio = document.getElementById('agenda-condutor-data-inicio').value;
  const fim = document.getElementById('agenda-condutor-data-fim').value;
  const verTudo = !!usuarioAtual.ver_agenda_geral;

  document.getElementById('agenda-condutor-badge-geral')?.classList.toggle('hidden', !verTudo);

  Components.Loading.show(document.getElementById('tb-agenda-condutor'));
  const cards = document.getElementById('cards-agenda-condutor');
  if (cards) cards.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Carregando...</div>';

  try {
    if (verTudo && (!cacheCondutores || !cacheCondutores.length)) {
      try { cacheCondutores = await listarCondutores(); } catch (e) { /* mostra e-mail se falhar */ }
    }

    let dados;
    if (inicio && fim) {
      dados = await buscarSolicitacoesPorData(inicio, fim);
      if (!verTudo) {
        dados = (dados || []).filter(s =>
          s.condutor_ida === usuarioAtual.email || s.condutor_volta === usuarioAtual.email
        );
      }
    } else if (verTudo) {
      dados = await buscarTodasSolicitacoes();
    } else {
      dados = await buscarSolicitacoesPorCondutor(usuarioAtual.email);
    }
    renderizarAgendaCondutor(dados || [], verTudo);
  } catch (e) {
    console.error('Erro ao carregar agenda do condutor:', e);
    document.getElementById('tb-agenda-condutor').innerHTML = `<tr><td colspan="10" class="text-center text-red-500 py-8">Erro ao carregar agenda. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarAgendaCondutor()">Tentar de novo</button></td></tr>`;
    if (cards) cards.innerHTML = '<div class="text-center text-red-500 py-8 text-sm">Erro ao carregar agenda.</div>';
    Components.Toast.error('Erro ao carregar agenda');
  }
}

function _nomeCondutor(email) {
  if (!email) return '';
  const c = cacheCondutores.find(x => x.email === email);
  return c?.nome || email;
}

function _tipoCurto(categoria) {
  return categoria === 'Motoboy' ? 'Doc' : 'Mot';
}

function _primeiroNome(nomeCompleto) {
  if (!nomeCompleto) return '';
  return nomeCompleto.split(' ')[0];
}

function _formatarDataHoraSolicitacao(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function renderizarAgendaCondutor(dados, verTudo) {
  const tbody = document.getElementById('tb-agenda-condutor');
  const cards = document.getElementById('cards-agenda-condutor');

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-slate-500 py-8">Nenhuma corrida</td></tr>';
    if (cards) cards.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">Nenhuma corrida encontrada.</div>';
    return;
  }

  // Desktop: Tabela
  tbody.innerHTML = dados.map(s => {
    const solicitanteNome = s.nome_ext || _nomeCondutor(s.email_solicitante);
    const primeiroNome = _primeiroNome(solicitanteNome);
    const setorUnidade = [s.setor, s.unidade].filter(Boolean).join('<br class="hidden sm:block">');
    const tipoCurto = _tipoCurto(s.tipo_viagem); // ou buscar do condutor
    const condutorIdaNome = _nomeCondutor(s.condutor_ida);
    const condutorVoltaNome = _nomeCondutor(s.condutor_volta);

    return `
    <tr data-id="${s.id}">
      <td class="whitespace-nowrap">${_formatarDataHoraSolicitacao(s.data_solicitacao)}</td>
      <td>${primeiroNome}</td>
      <td class="whitespace-normal">${setorUnidade || '—'}</td>
      <td class="whitespace-nowrap text-center">${tipoCurto}</td>
      <td class="whitespace-nowrap text-center">${s.qtd_pessoas || 1}</td>
      <td>${condutorIdaNome || '—'}</td>
      <td>${condutorVoltaNome || '—'}</td>
      <td class="max-w-xs whitespace-normal break-words">${s.justificativa || '—'}</td>
      <td><span class="badge ${classeStatus(s.status)}">${s.status}</span></td>
      <td>
        <button class="btn-outline text-xs py-1 px-2" onclick="abrirModalEditarAgenda('${s.id}')" title="Editar">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
      </td>
    </tr>
  `}).join('');

  // Mobile: Cards
  if (cards) {
    cards.innerHTML = dados.map(s => {
      const solicitanteNome = s.nome_ext || _nomeCondutor(s.email_solicitante);
      const primeiroNome = _primeiroNome(solicitanteNome);
      const condutorIdaNome = _nomeCondutor(s.condutor_ida);
      const condutorVoltaNome = _nomeCondutor(s.condutor_volta);
      const tipoCurto = _tipoCurto(s.tipo_viagem);

      return `
      <div class="card p-4 mb-3" data-id="${s.id}">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <p class="font-bold text-slate-900">${_formatarDataHoraSolicitacao(s.data_solicitacao)}</p>
            <p class="text-xs text-slate-500">${primeiroNome} · ${tipoCurto} · ${s.qtd_pessoas || 1} pass</p>
          </div>
          <span class="badge ${classeStatus(s.status)} shrink-0">${s.status}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-2">
          <div><span class="text-slate-400">Setor/Unid:</span> ${s.setor || '—'} / ${s.unidade || '—'}</div>
          <div><span class="text-slate-400">Origem→Dest:</span> ${s.origem} → ${s.destino}</div>
          <div class="col-span-2"><span class="text-slate-400">Ida:</span> ${condutorIdaNome || '—'}</div>
          <div class="col-span-2"><span class="text-slate-400">Volta:</span> ${condutorVoltaNome || '—'}</div>
        </div>
        <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded break-words"><span class="font-medium">Justificativa:</span> ${s.justificativa || '—'}</p>
        <div class="mt-2 text-right">
          <button class="btn-outline text-xs py-1 px-2" onclick="abrirModalEditarAgenda('${s.id}')">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Editar
          </button>
        </div>
      </div>
    `}).join('');
  }
}

function limparFiltroAgendaCondutor() {
  document.getElementById('agenda-condutor-data-inicio').value = '';
  document.getElementById('agenda-condutor-data-fim').value = '';
  carregarAgendaCondutor();
}

// ============================================================
// MODAL EDIÇÃO DE AGENDA (SOLICITAÇÃO)
// ============================================================
function abrirModalEditarAgenda(id) {
  const s = (arguments[1] && typeof arguments[1] === 'object') ? arguments[1] :
    (typeof buscarSolicitacaoPorId === 'function' ? null : null);

  // Busca a solicitação no DOM (já renderizada) ou recarrega
  const row = document.querySelector(`#tb-agenda-condutor tr[data-id="${id}"]`);
  if (!row) return Components.Toast.error('Corrida não encontrada na visualização atual');

  // Para editar, precisamos dos dados completos. Vamos buscar via API.
  // Simplificação: assumimos que os dados estão no cache ou buscamos.
  // Melhor: buscar da API para ter dados frescos.
  buscarSolicitacaoPorId(id).then(solicitacao => {
    if (!solicitacao) return Components.Toast.error('Não foi possível carregar a solicitação');
    preencherModalEditarAgenda(solicitacao);
  }).catch(() => Components.Toast.error('Erro ao carregar dados para edição'));
}

async function buscarSolicitacaoPorId(id) {
  _checarClient();
  const { data, error } = await _sb
    .from('solicitacoes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

function preencherModalEditarAgenda(s) {
  solicitacaoEditandoId = s.id;

  // Preenche selects de locais
  const optionsLocais = cacheLocais.map(l => `<option value="${l.nome}">${l.nome}</option>`).join('');
  const outroOption = '<option value="__OUTRO__">Outro (digitar)</option>';

  document.getElementById('edit-agenda-id').value = s.id;
  document.getElementById('edit-agenda-data-viagem').value = s.data_viagem || '';
  document.getElementById('edit-agenda-hora-saida').value = s.hora_saida || '';
  document.getElementById('edit-agenda-hora-retorno').value = s.hora_retorno || '';

  const selOrigem = document.getElementById('edit-agenda-origem');
  selOrigem.innerHTML = `<option value="">Selecione...</option>${optionsLocais}${outroOption}`;
  selOrigem.value = s.origem || '';
  alternarCampoOutro('edit-agenda-origem', 'edit-agenda-origem-outro');

  const selDestino = document.getElementById('edit-agenda-destino');
  selDestino.innerHTML = `<option value="">Selecione...</option>${optionsLocais}${outroOption}`;
  selDestino.value = s.destino || '';
  alternarCampoOutro('edit-agenda-destino', 'edit-agenda-destino-outro');

  if (s.origem && !cacheLocais.some(l => l.nome === s.origem)) {
    document.getElementById('edit-agenda-origem-outro').value = s.origem;
    document.getElementById('edit-agenda-origem-outro').classList.remove('hidden');
  }
  if (s.destino && !cacheLocais.some(l => l.nome === s.destino)) {
    document.getElementById('edit-agenda-destino-outro').value = s.destino;
    document.getElementById('edit-agenda-destino-outro').classList.remove('hidden');
  }

  document.getElementById('edit-agenda-justificativa').value = s.justificativa || '';
  document.getElementById('edit-agenda-tipo').value = s.tipo_viagem || 'Comum';
  document.getElementById('edit-agenda-qtd-pessoas').value = s.qtd_pessoas || 1;

  // Condutores
  const optionsCondutores = cacheCondutores.map(c => `<option value="${c.email}">${c.nome} (${_tipoCurto(c.categoria)})</option>`).join('');
  document.getElementById('edit-agenda-condutor-ida').innerHTML = `<option value="">Nenhum</option>${optionsCondutores}`;
  document.getElementById('edit-agenda-condutor-ida').value = s.condutor_ida || '';
  document.getElementById('edit-agenda-condutor-volta').innerHTML = `<option value="">Nenhum</option>${optionsCondutores}`;
  document.getElementById('edit-agenda-condutor-volta').value = s.condutor_volta || '';

  document.getElementById('modal-editar-agenda').classList.remove('hidden');
  document.getElementById('modal-editar-agenda-backdrop').classList.remove('hidden');
}

function fecharModalEditarAgenda() {
  document.getElementById('modal-editar-agenda').classList.add('hidden');
  document.getElementById('modal-editar-agenda-backdrop').classList.add('hidden');
  solicitacaoEditandoId = null;
}

function alternarCampoOutro(selectId, inputOutroId) {
  const sel = document.getElementById(selectId);
  const inp = document.getElementById(inputOutroId);
  if (sel.value === '__OUTRO__') {
    inp.classList.remove('hidden');
    inp.required = true;
  } else {
    inp.classList.add('hidden');
    inp.required = false;
    inp.value = '';
  }
}

async function salvarEdicaoAgenda() {
  const id = document.getElementById('edit-agenda-id').value;
  if (!id) return;

  const origemSel = document.getElementById('edit-agenda-origem').value;
  const destinoSel = document.getElementById('edit-agenda-destino').value;

  const dados = {
    data_viagem: document.getElementById('edit-agenda-data-viagem').value || null,
    hora_saida: document.getElementById('edit-agenda-hora-saida').value || null,
    hora_retorno: document.getElementById('edit-agenda-hora-retorno').value || null,
    origem: origemSel === '__OUTRO__' ? document.getElementById('edit-agenda-origem-outro').value.trim() : origemSel,
    destino: destinoSel === '__OUTRO__' ? document.getElementById('edit-agenda-destino-outro').value.trim() : destinoSel,
    justificativa: document.getElementById('edit-agenda-justificativa').value.trim() || null,
    tipo_viagem: document.getElementById('edit-agenda-tipo').value || 'Comum',
    qtd_pessoas: parseInt(document.getElementById('edit-agenda-qtd-pessoas').value) || 1,
    condutor_ida: document.getElementById('edit-agenda-condutor-ida').value || null,
    condutor_volta: document.getElementById('edit-agenda-condutor-volta').value || null
  };

  if (!dados.origem || !dados.destino) return Components.Toast.error('Origem e Destino são obrigatórios');
  if (!dados.data_viagem) return Components.Toast.error('Data da viagem é obrigatória');
  if (!dados.hora_saida) return Components.Toast.error('Hora de saída é obrigatória');

  try {
    await atualizarSolicitacao(id, dados);
    Components.Toast.success('Corrida atualizada!');
    fecharModalEditarAgenda();
    carregarAgendaCondutor();
  } catch (e) {
    Components.Toast.error('Erro ao salvar: ' + e.message);
  }
}

// ============================================================
// SEÇÃO 2: GERENCIAR CONDUTORES
// ============================================================
function preencherSelectCooperativas() {
  const select = document.getElementById('cond-cooperativa');
  if (!select) return;
  const valorAtual = select.value;
  select.innerHTML = '<option value="">Nenhuma / Selecione...</option>';
  cacheCooperativasCondutor.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
  select.value = valorAtual;
}

function descreverCooperativa(cooperativaId) {
  if (!cooperativaId) return '';
  const c = cacheCooperativasCondutor.find(x => String(x.id) === String(cooperativaId));
  return c ? c.nome : '';
}

async function carregarGerenciarCondutores() {
  const tbody = document.getElementById('tb-condutores');
  Components.Loading.show(tbody);
  try {
    const condutores = await listarCondutores();
    cacheCondutores = condutores || [];
    renderizarTabelaCondutores(cacheCondutores);
    renderizarAvisoCnh('aviso-cnh-condutores', cacheCondutores);
    preencherSelectCondutoresKm();
  } catch (e) {
    console.error('Erro ao carregar condutores:', e);
    tbody.innerHTML = `<tr><td colspan="13" class="text-center text-red-500 py-8">Erro ao carregar condutores. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarCondutores()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar condutores');
  }
}

function renderizarTabelaCondutores(condutores) {
  const tbody = document.getElementById('tb-condutores');
  if (!condutores.length) {
    tbody.innerHTML = '<tr><td colspan="13" class="text-center text-slate-500">Nenhum condutor</td></tr>';
    return;
  }

  tbody.innerHTML = condutores.map(c => `
    <tr>
      <td>${c.nome}</td>
      <td>${c.email}</td>
      <td>${c.telefone || ''}</td>
      <td>${c.categoria || ''}</td>
      <td>${descreverCooperativa(c.cooperativa_id)}</td>
      <td>${c.placa || ''}</td>
      <td>${c.modelo || ''}</td>
      <td>${c.capacidade || ''}</td>
      <td>${c.cnh || ''}</td>
      <td>${formatarDataBR(c.validade_cnh) || ''}</td>
      <td><span class="badge ${c.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <input type="checkbox" class="w-5 h-5 accent-mc-azul cursor-pointer" ${c.ver_agenda_geral ? 'checked' : ''} onchange="alternarAgendaGeral('${c.email}', this.checked)" aria-label="Ver Agenda Geral">
      </td>
      <td>
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarCondutor('${c.email}')">Editar</button>
          <button class="${c.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoCondutor('${c.email}', ${!c.ativo})">${c.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function preencherSelectCondutoresKm() {
  const select = document.getElementById('km-gestor-condutor');
  if (!select) return;
  select.innerHTML = '<option value="">Selecione...</option>';
  cacheCondutores.forEach(c => {
    select.innerHTML += `<option value="${c.email}">${c.nome} (${c.capacidade || ''})</option>`;
  });
}

function limparFormCondutor() {
  document.getElementById('form-condutor').reset();
  document.getElementById('cond-email-original').value = '';
  document.getElementById('titulo-form-condutor').textContent = 'Novo Condutor';
  document.getElementById('btn-cancelar-edicao-condutor').classList.add('hidden');
}

async function salvarCondutorGestor() {
  const emailOriginal = document.getElementById('cond-email-original').value;
  const dados = {
    nome: document.getElementById('cond-nome').value,
    email: document.getElementById('cond-email').value,
    senha: document.getElementById('cond-senha').value,
    telefone: document.getElementById('cond-telefone').value,
    categoria: document.getElementById('cond-categoria').value,
    cooperativaId: document.getElementById('cond-cooperativa').value,
    placa: document.getElementById('cond-placa').value,
    modelo: document.getElementById('cond-modelo').value,
    capacidade: document.getElementById('cond-capacidade').value,
    cnh: document.getElementById('cond-cnh').value,
    validadeCnh: document.getElementById('cond-validade-cnh').value
  };

  if (!dados.nome || !dados.email) return Components.Toast.error('Nome e e-mail são obrigatórios');
  if (!emailOriginal && !dados.senha) return Components.Toast.error('Defina uma senha para novo condutor');

  try {
    const perfil = {
      nome: dados.nome,
      telefone: dados.telefone,
      placa: dados.placa,
      modelo: dados.modelo,
      capacidade: dados.capacidade ? parseInt(dados.capacidade) : null,
      categoria: dados.categoria,
      cooperativa_id: dados.cooperativaId ? parseInt(dados.cooperativaId) : null,
      cnh: dados.cnh,
      validade_cnh: dados.validadeCnh
    };

    if (emailOriginal) {
      await atualizarPerfilPorEmail(emailOriginal, perfil);
      if (dados.email !== emailOriginal) {
        Components.Toast.warning('Mudança de e-mail não suportada diretamente');
      }
    } else {
      await criarUsuarioComoAdmin(dados.email, dados.senha, { tipo: 'condutor', nome: dados.nome });
      await atualizarPerfilPorEmail(dados.email, perfil);
    }

    Components.Toast.success(emailOriginal ? 'Condutor atualizado!' : 'Condutor cadastrado!');
    limparFormCondutor();
    carregarGerenciarCondutores();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

function editarCondutor(email) {
  const c = cacheCondutores.find(x => x.email === email);
  if (!c) return;

  document.getElementById('cond-email-original').value = c.email;
  document.getElementById('cond-nome').value = c.nome;
  document.getElementById('cond-email').value = c.email;
  document.getElementById('cond-senha').value = '';
  document.getElementById('cond-telefone').value = c.telefone || '';
  document.getElementById('cond-categoria').value = c.categoria || 'Motorista';
  document.getElementById('cond-cooperativa').value = c.cooperativa_id || '';
  document.getElementById('cond-placa').value = c.placa || '';
  document.getElementById('cond-modelo').value = c.modelo || '';
  document.getElementById('cond-capacidade').value = c.capacidade || '';
  document.getElementById('cond-cnh').value = c.cnh || '';
  document.getElementById('cond-validade-cnh').value = c.validade_cnh || '';

  document.getElementById('titulo-form-condutor').textContent = 'Editar Condutor';
  document.getElementById('btn-cancelar-edicao-condutor').classList.remove('hidden');
}

async function alternarAgendaGeral(email, permitir) {
  try {
    await atualizarPerfilPorEmail(email, { ver_agenda_geral: permitir });
    Components.Toast.success(permitir ? 'Agenda Geral liberada!' : 'Agenda Geral bloqueada!');
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

async function alternarAtivoCondutor(email, ativar) {
  try {
    await atualizarPerfilPorEmail(email, { ativo: ativar });
    Components.Toast.success(ativar ? 'Acesso liberado!' : 'Acesso bloqueado!');
    carregarGerenciarCondutores();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

function exportarCondutoresXlsxUI() {
  if (typeof XLSX === 'undefined') return Components.Toast.error('Biblioteca de exportação não carregada');
  if (!cacheCondutores.length) return Components.Toast.warning('Não há condutores para exportar');

  const linhas = cacheCondutores.map(c => ({
    'Nome': c.nome,
    'E-mail': c.email,
    'Telefone': c.telefone || '',
    'Categoria': c.categoria || '',
    'Cooperativa': descreverCooperativa(c.cooperativa_id),
    'Placa': c.placa || '',
    'Modelo': c.modelo || '',
    'Capacidade': c.capacidade || '',
    'CNH': c.cnh || '',
    'Validade CNH': formatarDataBR(c.validade_cnh) || '',
    'Status': c.ativo ? 'Ativo' : 'Inativo'
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Condutores');
  XLSX.writeFile(livro, 'MarkCarro_Condutores.xlsx');
}

// ============================================================
// EXPORTAÇÕES GLOBAIS
// ============================================================
window.carregarPaginaAgendaCondutor = carregarPaginaAgendaCondutor;
window.carregarAgendaCondutor = carregarAgendaCondutor;
window.limparFiltroAgendaCondutor = limparFiltroAgendaCondutor;
window.abrirModalEditarAgenda = abrirModalEditarAgenda;
window.fecharModalEditarAgenda = fecharModalEditarAgenda;
window.alternarCampoOutro = alternarCampoOutro;
window.salvarEdicaoAgenda = salvarEdicaoAgenda;
window.carregarGerenciarCondutores = carregarGerenciarCondutores;
window.exportarCondutoresXlsxUI = exportarCondutoresXlsxUI;
window.salvarCondutorGestor = salvarCondutorGestor;
window.limparFormCondutor = limparFormCondutor;
window.editarCondutor = editarCondutor;
window.alternarAgendaGeral = alternarAgendaGeral;
window.alternarAtivoCondutor = alternarAtivoCondutor;
