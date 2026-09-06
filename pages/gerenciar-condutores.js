// ============================================================
// MARKCARRO - Página: Gerenciar Condutores
// ============================================================

async function carregarGerenciarCondutores() {
  Components.Loading.show(document.getElementById('tb-condutores'));
  try {
    const condutores = await listarCondutores();
    cacheCondutores = condutores || [];
    renderizarTabelaCondutores(cacheCondutores);
    preencherSelectCondutoresKm();
  } catch (e) {
    Components.Toast.error('Erro ao carregar condutores');
  }
}

function renderizarTabelaCondutores(condutores) {
  const tbody = document.getElementById('tb-condutores');
  if (!condutores.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-slate-500">Nenhum condutor</td></tr>';
    return;
  }
  
  tbody.innerHTML = condutores.map(c => `
    <tr>
      <td>${c.nome}</td>
      <td>${c.email}</td>
      <td>${c.telefone || ''}</td>
      <td>${c.categoria || ''}</td>
      <td>${c.placa || ''}</td>
      <td>${c.modelo || ''}</td>
      <td>${c.capacidade || ''}</td>
      <td>${c.cnh || ''}</td>
      <td>${formatarDataBR(c.validade_cnh) || ''}</td>
      <td><span class="badge ${c.ativo ? 'bg-success' : 'bg-danger'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <label class="form-check form-switch">
          <input class="form-check-input" type="checkbox" ${c.ver_agenda_geral ? 'checked' : ''} onchange="alternarAgendaGeral('${c.email}', this.checked)">
        </label>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editarCondutor('${c.email}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="alternarAtivoCondutor('${c.email}', ${!c.ato})">${c.ativo ? 'Bloquear' : 'Ativar'}</button>
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
  document.getElementById('btn-cancelar-edicao-condutor').classList.add('d-none');
}

async function salvarCondutorGestor() {
  const emailOriginal = document.getElementById('cond-email-original').value;
  const dados = {
    nome: document.getElementById('cond-nome').value,
    email: document.getElementById('cond-email').value,
    senha: document.getElementById('cond-senha').value,
    telefone: document.getElementById('cond-telefone').value,
    categoria: document.getElementById('cond-categoria').value,
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
      cnh: dados.cnh,
      validade_cnh: dados.validadeCnh
    };
    
    if (emailOriginal) {
      // Atualizar existente
      await atualizarPerfil(emailOriginal, perfil);
      if (dados.email !== emailOriginal) {
        // Email mudou - precisa recriar auth user (complexo)
        Components.Toast.warning('Mudança de e-mail não suportada diretamente');
      }
    } else {
      // Novo - criar no auth
      await supabaseCadastro(dados.email, dados.senha, { tipo: 'condutor', nome: dados.nome, telefone: dados.telefone });
      // Perfil será criado pelo trigger
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
  document.getElementById('cond-placa').value = c.placa || '';
  document.getElementById('cond-modelo').value = c.modelo || '';
  document.getElementById('cond-capacidade').value = c.capacidade || '';
  document.getElementById('cond-cnh').value = c.cnh || '';
  document.getElementById('cond-validade-cnh').value = c.validade_cnh || '';
  
  document.getElementById('titulo-form-condutor').textContent = 'Editar Condutor';
  document.getElementById('btn-cancelar-edicao-condutor').classList.remove('d-none');
}

async function alternarAgendaGeral(email, permitir) {
  try {
    await atualizarPerfil(email, { ver_agenda_geral: permitir });
    Components.Toast.success(permitir ? 'Agenda Geral liberada!' : 'Agenda Geral bloqueada!');
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

async function alternarAtivoCondutor(email, ativar) {
  try {
    await atualizarPerfil(email, { ativo: ativar });
    Components.Toast.success(ativar ? 'Acesso liberado!' : 'Acesso bloqueado!');
    carregarGerenciarCondutores();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// Expor globalmente
window.carregarGerenciarCondutores = carregarGerenciarCondutores;
window.salvarCondutorGestor = salvarCondutorGestor;
window.limparFormCondutor = limparFormCondutor;
window.editarCondutor = editarCondutor;
window.alternarAgendaGeral = alternarAgendaGeral;
window.alternarAtivoCondutor = alternarAtivoCondutor;