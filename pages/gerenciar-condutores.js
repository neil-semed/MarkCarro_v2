// ============================================================
// MARKCARRO - Página: Gerenciar Condutores
// ============================================================

// Cooperativas ativas, pro dropdown do formulário e pra mostrar o nome
// (não só o id) na tabela e na exportação - carregada junto com os
// condutores toda vez que a tela abre.
let cacheCooperativasCondutor = [];

async function carregarGerenciarCondutores() {
  const tbody = document.getElementById('tb-condutores');
  Components.Loading.show(tbody);
  try {
    const [condutores, cooperativas] = await Promise.all([
      listarCondutores(),
      listarCooperativasAtivas().catch(() => [])
    ]);
    cacheCondutores = condutores || [];
    cacheCooperativasCondutor = cooperativas || [];
    preencherSelectCooperativas();
    renderizarTabelaCondutores(cacheCondutores);
    renderizarAvisoCnh('aviso-cnh-condutores', cacheCondutores);
    preencherSelectCondutoresKm();
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar condutores:', e);
    tbody.innerHTML = `<tr><td colspan="13" class="text-center text-red-500 py-8">Erro ao carregar condutores. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarCondutores()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar condutores');
  }
}

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
    // Atualizar perfil
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
      // Atualizar existente - por e-mail (não temos o UUID em mãos aqui)
      await atualizarPerfilPorEmail(emailOriginal, perfil);
      if (dados.email !== emailOriginal) {
        // Email mudou - precisa recriar auth user (complexo)
        Components.Toast.warning('Mudança de e-mail não suportada diretamente');
      }
    } else {
      // Novo - cria a conta de autenticação. O gatilho no banco cria a
      // linha em profiles usando só tipo/nome/email (não tem como o
      // gatilho conhecer placa, modelo, categoria, CNH etc.), então
      // completamos o resto do perfil com um UPDATE logo em seguida -
      // antes esses campos preenchidos no formulário eram simplesmente
      // descartados quando o condutor era novo (só funcionavam ao editar
      // um condutor já existente).
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

// Expor globalmente
window.carregarGerenciarCondutores = carregarGerenciarCondutores;
window.exportarCondutoresXlsxUI = exportarCondutoresXlsxUI;
window.salvarCondutorGestor = salvarCondutorGestor;
window.limparFormCondutor = limparFormCondutor;
window.editarCondutor = editarCondutor;
window.alternarAgendaGeral = alternarAgendaGeral;
window.alternarAtivoCondutor = alternarAtivoCondutor;