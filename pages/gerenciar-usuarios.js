// ============================================================
// MARKCARRO - Página: Gerenciar Usuários (Solicitantes)
// ============================================================

// Cache local dos solicitantes carregados, usado por editarUsuario() pra
// preencher o formulário sem precisar buscar de novo. Antes não existia
// (só era lido, nunca escrito) - editarUsuario() sempre operava numa lista
// vazia e o botão "Editar" não preenchia nada.
let cacheUsuarios = [];

async function carregarGerenciarUsuarios() {
  const tbody = document.getElementById('tb-usuarios');
  Components.Loading.show(tbody);
  try {
    const usuarios = await listarUsuarios();
    cacheUsuarios = (usuarios || []).filter(u => u.tipo === 'solicitante');
    renderizarTabelaUsuarios(cacheUsuarios);
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    console.error('Erro ao carregar usuários:', e);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">Erro ao carregar usuários. <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarUsuarios()">Tentar de novo</button></td></tr>`;
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
      <td><span class="badge ${u.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarUsuario('${u.email}')">Editar</button>
      </td>
      <td>
        <button class="${u.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" onclick="alternarAtivoUsuario('${u.email}', ${!u.ativo})">
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
  document.getElementById('btn-cancelar-edicao-usuario').classList.add('hidden');
}

// Os campos deste formulário usavam os ids "usuario-nome"/"usuario-email" -
// só que esses MESMOS ids já existiam no header (o nome/e-mail do usuário
// logado, no menu de conta). document.getElementById() sempre pega o
// PRIMEIRO elemento com aquele id no documento - como o header vem antes
// desta tela no HTML, salvarUsuarioGestor() e editarUsuario() sempre
// acabavam lendo/escrevendo no <span>/<p> do header (que nem têm ".value")
// em vez do <input> do formulário. Resultado: salvar sempre mandava
// nome/e-mail vazios, e "Editar" nunca preenchia o formulário. Renomeado
// pra "uform-nome"/"uform-email", únicos no documento.
async function salvarUsuarioGestor() {
  const emailOriginal = document.getElementById('usuario-email-original').value;
  const dados = {
    nome: document.getElementById('uform-nome').value,
    email: document.getElementById('uform-email').value,
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
      // atualizarPerfilPorEmail: aqui só temos o e-mail, não o UUID de
      // profiles.id (atualizarPerfil filtra por id e nunca bateria).
      await atualizarPerfilPorEmail(emailOriginal, perfil);
    } else {
      // Novo - cria a conta de autenticação com criarUsuarioComoAdmin
      // (mantém a sessão do gestor - signUp() normal trocaria a sessão
      // ativa pela do usuário recém-criado) e completa telefone/unidade/
      // setor com um UPDATE, já que o gatilho do banco só grava
      // tipo/nome/email na criação.
      await criarUsuarioComoAdmin(dados.email, dados.senha, { tipo: 'solicitante', nome: dados.nome });
      await atualizarPerfilPorEmail(dados.email, perfil);
    }
    
    Components.Toast.success(emailOriginal ? 'Usuário atualizado!' : 'Usuário cadastrado!');
    limparFormUsuario();
    carregarGerenciarUsuarios();
  } catch (e) {
    Components.Toast.error('Erro: ' + e.message);
  }
}

function editarUsuario(email) {
  const u = cacheUsuarios.find(x => x.email === email);
  if (!u) return;
  
  document.getElementById('usuario-email-original').value = u.email;
  document.getElementById('uform-nome').value = u.nome;
  document.getElementById('uform-email').value = u.email;
  document.getElementById('usuario-senha').value = '';
  document.getElementById('usuario-telefone').value = u.telefone || '';
  document.getElementById('usuario-unidade').value = u.unidade || '';
  document.getElementById('usuario-setor').value = u.setor || '';
  
  document.getElementById('titulo-form-usuario').textContent = 'Editar Solicitante';
  document.getElementById('btn-cancelar-edicao-usuario').classList.remove('hidden');
}

async function alternarAtivoUsuario(email, ativar) {
  try {
    await atualizarPerfilPorEmail(email, { ativo: ativar });
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