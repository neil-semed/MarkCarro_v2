// ============================================================
// MARKCARRO - Página: Gerenciar Usuários (Solicitantes + Administradores)
// ============================================================

// Cache local dos solicitantes carregados, usado por editarUsuario() pra
// preencher o formulário sem precisar buscar de novo. Antes não existia
// (só era lido, nunca escrito) - editarUsuario() sempre operava numa lista
// vazia e o botão "Editar" não preenchia nada.
let cacheUsuarios = [];

// PEDIDO DO USUÁRIO ("o admin poderá criar e atribuir menus conforme
// definir"): até aqui só dava pra criar Solicitante nesta tela - não
// existia NENHUM jeito, pelo próprio app, de criar um Admin com um
// Perfil de Acesso restrito (ver pages/gerenciar-perfis-acesso.js). O
// bloco "Usuários Administrativos" abaixo cobre isso, lado a lado com o
// cadastro de Solicitantes que já existia (mesma tela/pílula de menu -
// não é uma tela nova, só uma seção nova aqui dentro).
let cacheUsuariosAdmin = [];
let cachePerfisAcessoParaUsuarios = [];

async function carregarGerenciarUsuarios() {
  const tbody = document.getElementById('tb-usuarios');
  Components.Loading.show(tbody);
  preencherDropdownUnidadeUsuario();
  aplicarModoConsultaTela('gerenciar-usuarios', ['form-usuario', 'form-usuario-admin']);
  try {
    const usuarios = await listarUsuarios();
    cacheUsuarios = (usuarios || []).filter(u => u.tipo === 'solicitante');
    renderizarTabelaUsuarios(cacheUsuarios);

    cacheUsuariosAdmin = (usuarios || []).filter(u => u.tipo === 'admin');
    await _preencherDropdownPerfisAcessoUsuarios();
    renderizarTabelaUsuariosAdmin(cacheUsuariosAdmin);
  } catch (e) {
    // Sem isso, um erro aqui deixava a tabela travada no spinner de
    // "Carregando..." pra sempre (nada reescrevia o tbody depois do catch).
    //
    // CORREÇÃO ("app não carrega unidade nem setor, sem isso não cria
    // usuário semed" / "tenta criar usuário, nem carrega do supabase"):
    // esta mensagem de erro era genérica demais pra diagnosticar - nunca
    // mostrava o erro REAL do Supabase (RLS, coluna, permissão etc.), só
    // "Erro ao carregar usuários" sempre igual, e sem acesso ao console do
    // usuário não dava pra saber a causa. Agora mostra o erro de verdade
    // (e.message), direto na tela.
    console.error('Erro ao carregar usuários:', e);
    const detalhe = (e && e.message) ? e.message : 'motivo desconhecido';
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">Erro ao carregar usuários: ${detalhe} <button class="btn-outline text-xs py-1.5 px-2.5 ml-2" onclick="carregarGerenciarUsuarios()">Tentar de novo</button></td></tr>`;
    Components.Toast.error('Erro ao carregar usuários: ' + detalhe);
    const tbodyAdmin = document.getElementById('tb-usuarios-admin');
    if (tbodyAdmin) tbodyAdmin.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-8">Erro ao carregar administradores: ${detalhe}</td></tr>`;
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
  // form.reset() volta o <select> de Unidade pra primeira opção, mas não
  // esvazia sozinho o de Setor (ele fica com as opções da última Unidade
  // escolhida) - repõe o texto de espera igual ao carregamento inicial.
  const selSetor = document.getElementById('usuario-setor');
  if (selSetor) selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
}

// Preenche o <select> de Unidade do formulário "Novo/Editar Solicitante" a
// partir de cacheUnidades (a mesma lista global carregada uma vez em
// carregarDropdownsApoio(), em app.js - reaproveitada aqui em vez de
// buscar de novo no Supabase).
function preencherDropdownUnidadeUsuario() {
  const sel = document.getElementById('usuario-unidade');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Selecione a Unidade...</option>' +
    (cacheUnidades || []).map(u => `<option value="${u}">${u}</option>`).join('');
  if (atual && (cacheUnidades || []).includes(atual)) sel.value = atual;
}

// Carrega os Setores da Unidade escolhida no <select> de Setor - mesmo
// padrão de carregarSetoresCadastro() (pages/cadastro.js), reaproveitando
// a mesma consulta listarSetoresPorUnidade().
async function carregarSetoresUsuario(setorSelecionado) {
  const unidade = document.getElementById('usuario-unidade').value;
  const selSetor = document.getElementById('usuario-setor');
  if (!selSetor) return;

  if (!unidade) {
    selSetor.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
    return;
  }

  try {
    const dados = await listarSetoresPorUnidade(unidade);
    selSetor.innerHTML = '<option value="">Selecione o Setor...</option>' +
      (dados || []).map(s => `<option value="${s.setor}">${s.setor}</option>`).join('');
    if (setorSelecionado) selSetor.value = setorSelecionado;
  } catch (e) {
    console.error('Erro ao carregar setores:', e);
    selSetor.innerHTML = '<option value="">Erro ao carregar</option>';
  }
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
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');

  const emailOriginal = document.getElementById('usuario-email-original').value;
  const dados = {
    nome: document.getElementById('uform-nome').value,
    // Mesma normalização de e-mail feita em gerenciar-condutores.js (ver
    // comentário lá) - evita mismatch de caixa entre o e-mail salvo aqui e
    // o que o Supabase Auth guarda (sempre minúsculo).
    email: document.getElementById('uform-email').value.trim().toLowerCase(),
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
      // CORREÇÃO ("não cria usuário mesmo" - 5ª tentativa, abordagem
      // diferente, mesma de gerenciar-condutores.js): usa o id do usuário
      // recém-criado e admin_upsert_perfil() (RPC no banco, ver
      // supabase_fix_criar_usuario_rpc.sql) pra gravar o perfil inteiro de
      // uma vez, sem depender do gatilho do banco nem de esperar/tentar de
      // novo por e-mail.
      const { user } = await criarUsuarioComoAdmin(dados.email, dados.senha, { tipo: 'solicitante', nome: dados.nome });
      await adminUpsertPerfil(user.id, Object.assign({ tipo: 'solicitante', email: dados.email }, perfil));
      // CORREÇÃO (6ª tentativa - "continua sem criar usuário"): ver
      // comentário completo em gerenciar-condutores.js/api.js
      // (adminConfirmarEmail) e supabase_fix_signup_definitivo.sql.
      try { await adminConfirmarEmail(user.id); } catch (e) { console.error('Erro ao confirmar e-mail (não bloqueia o cadastro):', e); }
    }

    Components.Toast.success(emailOriginal ? 'Usuário atualizado!' : 'Usuário cadastrado!');
    limparFormUsuario();
    carregarGerenciarUsuarios();
  } catch (e) {
    // CORREÇÃO (bug "não salva novo solicitante", 4ª tentativa): sem isso,
    // se o Supabase recusasse a criação (ex.: gatilho handle_new_user()
    // falhando no banco), o toast mostrava só "Erro: " + uma mensagem às
    // vezes vazia/genérica - e a mensagem REAL de erro do Supabase nunca
    // ficava registrada em lugar nenhum pra investigar depois. Ver
    // supabase_fix_criacao_usuarios_admin.sql para a correção do gatilho.
    console.error('Erro ao salvar solicitante (Gerenciar Usuários):', e);
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function editarUsuario(email) {
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const u = cacheUsuarios.find(x => x.email === email);
  if (!u) return;

  document.getElementById('usuario-email-original').value = u.email;
  document.getElementById('uform-nome').value = u.nome;
  document.getElementById('uform-email').value = u.email;
  document.getElementById('usuario-senha').value = '';
  document.getElementById('usuario-telefone').value = u.telefone || '';

  preencherDropdownUnidadeUsuario();
  document.getElementById('usuario-unidade').value = u.unidade || '';
  // Setor depende de uma segunda consulta (por Unidade) - só dá pra marcar
  // o valor salvo depois que as opções chegarem, por isso o await aqui
  // (antes, com os dois como texto livre, isso não era um problema).
  await carregarSetoresUsuario(u.setor || '');

  document.getElementById('titulo-form-usuario').textContent = 'Editar Solicitante';
  document.getElementById('btn-cancelar-edicao-usuario').classList.remove('hidden');
  document.getElementById('form-usuario').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function alternarAtivoUsuario(email, ativar) {
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  try {
    await atualizarPerfilPorEmail(email, { ativo: ativar });
    Components.Toast.success(ativar ? 'Acesso liberado!' : 'Acesso bloqueado!');
    carregarGerenciarUsuarios();
  } catch (e) {
    Components.Toast.error('Erro ao alterar');
  }
}

// ============================================================
// Usuários Administrativos (novo bloco, mesma tela)
// ============================================================

// Select "Perfil de acesso" do formulário de Admin - "" = acesso total
// (sem restrição), igual a todo admin cadastrado antes desta função
// existir. Perfis bloqueados aparecem marcados, mas continuam
// selecionáveis (o próprio bloqueio já os torna "sem tela nenhuma" pra
// quem estiver com eles atribuídos - ver aplicarRestricaoPerfilAcessoAdmin,
// pages/login.js).
async function _preencherDropdownPerfisAcessoUsuarios() {
  const sel = document.getElementById('usuario-admin-perfil-acesso');
  if (!sel) return;
  try {
    cachePerfisAcessoParaUsuarios = await listarPerfisAcesso() || [];
  } catch (e) {
    console.error('Erro ao carregar perfis de acesso para Usuários Administrativos:', e);
    cachePerfisAcessoParaUsuarios = [];
  }
  const atual = sel.value;
  sel.innerHTML = '<option value="">Acesso total (sem restrição)</option>' +
    cachePerfisAcessoParaUsuarios.map(p => `<option value="${p.id}">${p.nome}${p.bloqueado ? ' (bloqueado)' : ''}</option>`).join('');
  if (atual) sel.value = atual;
}

function _nomePerfilAcessoUsuarios(perfilAcessoId) {
  if (!perfilAcessoId) return 'Acesso total';
  const p = cachePerfisAcessoParaUsuarios.find(x => String(x.id) === String(perfilAcessoId));
  if (!p) return 'Perfil removido';
  return p.nome + (p.bloqueado ? ' (bloqueado)' : '');
}

function renderizarTabelaUsuariosAdmin(usuarios) {
  const tbody = document.getElementById('tb-usuarios-admin');
  if (!tbody) return;
  if (!usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">Nenhum administrador cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td class="table-td">${u.nome}</td>
      <td class="table-td">${u.email}</td>
      <td class="table-td text-xs">${_nomePerfilAcessoUsuarios(u.perfil_acesso_id)}</td>
      <td class="table-td"><span class="badge ${u.ativo ? 'badge-confirmada' : 'badge-cancelada'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td class="table-td">
        <div class="flex gap-2">
          <button class="btn-outline text-xs py-1.5 px-2.5" onclick="editarUsuarioAdmin('${u.email}')">Editar</button>
          <button class="${u.ativo ? 'btn-danger' : 'btn-success'} text-xs py-1.5 px-2.5" ${u.email === usuarioAtual?.email ? 'disabled title="Você não pode bloquear seu próprio acesso"' : ''} onclick="alternarAtivoUsuarioAdmin('${u.email}', ${!u.ativo})">${u.ativo ? 'Bloquear' : 'Ativar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function limparFormUsuarioAdmin() {
  document.getElementById('form-usuario-admin').reset();
  document.getElementById('usuario-admin-email-original').value = '';
  document.getElementById('titulo-form-usuario-admin').textContent = 'Novo Admin';
  document.getElementById('btn-cancelar-edicao-usuario-admin').classList.add('hidden');
}

async function salvarUsuarioAdmin() {
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');

  const emailOriginal = document.getElementById('usuario-admin-email-original').value;
  const dados = {
    nome: document.getElementById('uform-admin-nome').value,
    email: document.getElementById('uform-admin-email').value.trim().toLowerCase(),
    senha: document.getElementById('usuario-admin-senha').value,
    perfil_acesso_id: document.getElementById('usuario-admin-perfil-acesso').value || null
  };

  if (!dados.nome || !dados.email) return Components.Toast.error('Nome e e-mail são obrigatórios');
  if (!emailOriginal && !dados.senha) return Components.Toast.error('Defina uma senha para novo administrador');

  try {
    if (emailOriginal) {
      await atualizarPerfilPorEmail(emailOriginal, { nome: dados.nome, perfil_acesso_id: dados.perfil_acesso_id });
    } else {
      const { user } = await criarUsuarioComoAdmin(dados.email, dados.senha, { tipo: 'admin', nome: dados.nome });
      await adminUpsertPerfil(user.id, { tipo: 'admin', email: dados.email, nome: dados.nome, perfil_acesso_id: dados.perfil_acesso_id });
      try { await adminConfirmarEmail(user.id); } catch (e) { console.error('Erro ao confirmar e-mail (não bloqueia o cadastro):', e); }
    }

    Components.Toast.success(emailOriginal ? 'Administrador atualizado!' : 'Administrador cadastrado!');
    limparFormUsuarioAdmin();
    carregarGerenciarUsuarios();
  } catch (e) {
    console.error('Erro ao salvar administrador:', e);
    Components.Toast.error('Erro: ' + e.message);
  }
}

async function editarUsuarioAdmin(email) {
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  const u = cacheUsuariosAdmin.find(x => x.email === email);
  if (!u) return;

  document.getElementById('usuario-admin-email-original').value = u.email;
  document.getElementById('uform-admin-nome').value = u.nome;
  document.getElementById('uform-admin-email').value = u.email;
  document.getElementById('usuario-admin-senha').value = '';
  await _preencherDropdownPerfisAcessoUsuarios();
  document.getElementById('usuario-admin-perfil-acesso').value = u.perfil_acesso_id || '';

  document.getElementById('titulo-form-usuario-admin').textContent = 'Editar Admin';
  document.getElementById('btn-cancelar-edicao-usuario-admin').classList.remove('hidden');
  document.getElementById('form-usuario-admin').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function alternarAtivoUsuarioAdmin(email, ativar) {
  if (!usuarioPodeEditarTela('gerenciar-usuarios')) return Components.Toast.error('Seu perfil de acesso só permite consulta nesta tela.');
  if (email === usuarioAtual?.email) return Components.Toast.error('Você não pode bloquear seu próprio acesso.');
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
window.preencherDropdownUnidadeUsuario = preencherDropdownUnidadeUsuario;
window.carregarSetoresUsuario = carregarSetoresUsuario;
window.salvarUsuarioGestor = salvarUsuarioGestor;
window.limparFormUsuario = limparFormUsuario;
window.editarUsuario = editarUsuario;
window.alternarAtivoUsuario = alternarAtivoUsuario;
window.limparFormUsuarioAdmin = limparFormUsuarioAdmin;
window.salvarUsuarioAdmin = salvarUsuarioAdmin;
window.editarUsuarioAdmin = editarUsuarioAdmin;
window.alternarAtivoUsuarioAdmin = alternarAtivoUsuarioAdmin;
