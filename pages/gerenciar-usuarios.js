// ============================================================
// MARKCARRO - Página: Gerenciar Usuários (Solicitantes)
// ============================================================

async function carregarGerenciarUsuarios() {
  Components.Loading.show(document.getElementById('tb-usuarios'));
  try {
    const usuarios = await listarUsuarios();
    const solicitantes = (usuarios || []).filter(u => u.tipo === 'solicitante');
    renderizarTabelaUsuarios(solicitantes);
  } catch (e) {
    Components.Toast.error('Erro ao carregar usuários');
  }
}

function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById('tb-usuarios');
  if (!usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500">Nenhum solicitante</td></tr>';
    return;
  }
  
  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.telefone || ''}</td>
      <td>${u.unidade || ''}</td>
      <td>${u.setor || ''}</td>
      <td><span class="badge ${u.ativo ? 'bg-success' : 'bg-danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editarUsuario('${u.email}')">Editar</button>
      </td>
      <td>
        <button class="btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-success'}" onclick="alternarAtivoUsuario('${u.email}', ${!u.ativo})">
          ${u.ativo ? 'Bloquear' : 'Ativar'}
        </button>
      </td>
    </tr>
  `).join('');
}

function limparFormUsuario() {
  document.getElementById('form-usuario').reset();
  document.getElementById('usuario-email-original').value = '';
  document.getElementById('titulo-form-usuario').textContent = 'Novo Solicitante';
  document.getElementById('btn-cancelar-edicao-usuario').classList.add('d-none');
}

async function salvarUsuarioGestor() {
  const emailOriginal = document.getElementById('usuario-email-original').value;
  const dados = {
    nome: document.getElementById('usuario-nome').value,
    email: document.getElementById('usuario-email').value,
    senha: document.getElementById('usuario-senha').value,
    telefone: document.getElementById('usuario-telefone').value,
    unidade: document.getElementById('usuario-unidade').value,
    setor: document.getElementById('usuario-setor').value
  };
  
  if (!dados.nome || !dados.email) return Components.Toast.error('Nome e e-mail são obrigatórios');
  if (!emailOriginal && !dados.senha) return Components.Toast.error('Defina uma senha para novo usuário');
  
  try {
    const perfil = {
      nome: dados.nome,
      telefone: dados.telefone,
      unidade: dados.unidade,
      setor: dados.setor
    };
    
    if (emailOriginal) {
      await atualizarPerfil(emailOriginal, perfil);
    } else {
      await supabaseCadastro(dados.email, dados.senha, { tipo: 'solicitante', nome: dados.nome, telefone: dados.telefone, unidade: dados.unidade, setor: dados.setor });
    }
    
    Components.Toast.success(emailOriginal ? 'Usuário atualizado!' : 'Usuário cadastrado!');
    limparFormUsuario();
    carregarGerenciarUsuarios();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

function editarUsuario(email) {
  const usuarios = cacheUsuarios || [];
  const u = usuarios.find(x => x.email === email);
  if (!u) return;
  
  document.getElementById('usuario-email-original').value = u.email;
  document.getElementById('usuario-nome').value = u.nome;
  document.getElementById('usuario-email').value = u.email;
  document.getElementById('usuario-senha').value = '';
  document.getElementById('usuario-telefone').value = u.telefone || '';
  document.getElementById('usuario-unidade').value = u.unidade || '';
  document.getElementById('usuario-setor').value = u.setor || '';
  
  document.getElementById('titulo-form-usuario').textContent = 'Editar Solicitante';
  document.getElementById('btn-cancelar-edicao-usuario').classList.remove('d-none');
}

async function alternarAtivoUsuario(email, ativar) {
  try {
    await atualizarPerfil(email, { ativo: ativar });
    Components.Toast.success(ativar ? 'Acesso liberado!' : 'Acesso bloqueado!');
    carregarGerenciarUsuarios();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// Expor globalmente
window.carregarGerenciarUsuarios = carregarGerenciarUsuarios;
window.salvarUsuarioGestor = salvarUsuarioGestor;
window.limparFormUsuario = limparFormUsuario;
window.editarUsuario = editarUsuario;
window.alternarAtivoUsuario = alternarAtivoUsuario;