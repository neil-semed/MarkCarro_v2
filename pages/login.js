// ============================================================
// MARKCARRO - Página: Login
// ============================================================

let usuarioAtual = null;

function salvarSessao() {
  try {
    sessionStorage.setItem('markcarro_usuario', JSON.stringify(usuarioAtual));
  } catch (e) {}
}

function restaurarSessao() {
  try {
    const salvo = sessionStorage.getItem('markcarro_usuario');
    if (!salvo) return;
    usuarioAtual = JSON.parse(salvo);
    carregarSaudacao();
    carregarPainelPorPerfil();
  } catch (e) {
    sessionStorage.removeItem('markcarro_usuario');
  }
}

async function processarLogin() {
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const btn = document.getElementById('btn-login');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';

  try {
    const resultado = await supabaseLogin(email, senha);

    if (resultado && resultado.user) {
      const perfil = await buscarPerfil(resultado.user.id, resultado.user.email);

      if (perfil) {
        if (!perfil.ativo) {
          Components.Toast.error('Seu perfil está inativo. Entre em contato com o administrador.');
          btn.disabled = false;
          btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1h-1"/></svg> Entrar</span>';
          return;
        }

        usuarioAtual = {
          id: perfil.id || resultado.user.id,
          nome: perfil.nome,
          email: perfil.email,
          tipo: perfil.tipo,
          telefone: perfil.telefone,
          unidade: perfil.unidade,
          setor: perfil.setor,
          placa: perfil.placa,
          modelo: perfil.modelo,
          capacidade: perfil.capacidade,
          categoria: perfil.categoria,
          cnh: perfil.cnh,
          validade_cnh: perfil.validade_cnh,
          ativo: perfil.ativo,
          ver_agenda_geral: perfil.ver_agenda_geral
        };

        salvarSessao();
        Components.Toast.success(`Bem-vindo, ${usuarioAtual.nome}!`);
        carregarSaudacao();
        carregarPainelPorPerfil();
      } else {
        Components.Toast.error('Perfil não encontrado. Complete seu cadastro ou contate o admin.');
      }
    }
  } catch (erro) {
    console.error('Erro no login:', erro);
    Components.Toast.error('Erro no login: ' + (erro.message || 'Verifique e-mail e senha.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1h-1"/></svg> Entrar</span>';
  }
}

async function fazerLogout() {
  try {
    await supabaseLogout();
  } catch (e) {
    console.warn('Erro no logout Supabase:', e);
  }
  usuarioAtual = null;
  sessionStorage.removeItem('markcarro_usuario');
  
  document.getElementById('app-principal').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
  document.getElementById('form-login').reset();
  Components.Toast.info('Você saiu do sistema.');
}

function carregarSaudacao() {
  if (!usuarioAtual) return;
  const hora = new Date().getHours();
  let saudacao = 'Boa noite';
  if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
  else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
  
  document.getElementById('usuario-nome').textContent = usuarioAtual.nome;
  document.getElementById('usuario-email').textContent = usuarioAtual.email;
  document.getElementById('usuario-perfil').textContent = usuarioAtual.tipo;
  document.getElementById('usuario-iniciais').textContent = obterIniciais(usuarioAtual.nome);
  document.getElementById('header-subtitle').textContent = `${saudacao}, ${usuarioAtual.nome.split(' ')[0]}`;
}

function carregarPainelPorPerfil() {
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('app-principal').classList.remove('hidden');
  
  const tipo = usuarioAtual?.tipo?.toLowerCase();
  
  // Esconder todos os botões primeiro
  document.querySelectorAll('#app-principal header button[id^="btn-"]').forEach(btn => btn.classList.add('hidden'));
  
  if (tipo === 'admin') {
    document.getElementById('btn-painel-gestor').classList.remove('hidden');
    document.getElementById('btn-ir-agenda').classList.remove('hidden');
    document.getElementById('btn-nova-solicitacao-gestor').classList.remove('hidden');
    document.getElementById('btn-gerenciar-condutores').classList.remove('hidden');
    document.getElementById('btn-gerenciar-km').classList.remove('hidden');
    document.getElementById('btn-gerenciar-usuarios').classList.remove('hidden');
    abrirPainelGestor();
  } else if (tipo === 'condutor') {
    document.getElementById('btn-agenda-condutor').classList.remove('hidden');
    document.getElementById('btn-registrar-km').classList.remove('hidden');
    abrirPainelDoDia();
  } else {
    document.getElementById('btn-nova-solicitacao').classList.remove('hidden');
    document.getElementById('btn-minhas-solicitacoes').classList.remove('hidden');
    abrirMinhasSolicitacoes();
  }
  
  document.getElementById('btn-sair').classList.remove('hidden');
  document.getElementById('btn-alterar-senha').classList.remove('hidden');
  
  atualizarContadorNotificacoes();
  setInterval(atualizarContadorNotificacoes, 60000);
}

async function atualizarContadorNotificacoes() {
  if (!usuarioAtual || usuarioAtual.tipo === 'condutor') return;
  try {
    const n = await contarNaoLidas(usuarioAtual.email);
    const badge = document.getElementById('badge-notificacoes');
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) {
    console.warn('Erro ao contar notificações:', e);
  }
}

function toggleUsuarioMenu() {
  document.getElementById('usuario-dropdown').classList.toggle('hidden');
}

function toggleNotificacoes() {
  const painel = document.getElementById('painel-notificacoes');
  painel.classList.toggle('hidden');
  if (!painel.classList.contains('hidden')) {
    carregarNotificacoes();
  }
}

async function carregarNotificacoes() {
  if (!usuarioAtual) return;
  const lista = document.getElementById('lista-notificacoes');
  lista.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Carregando...</div>';
  
  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    if (!notifs || notifs.length === 0) {
      lista.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Nenhuma notificação</div>';
      return;
    }
    
    lista.innerHTML = notifs.map(n => `
      <div class="p-3 border-b border-slate-100 hover:bg-slate-50 ${n.lida ? '' : 'bg-blue-50'}" onclick="marcarNotificacaoLida('${n.id}'); this.classList.remove('bg-blue-50')">
        <p class="text-sm font-medium text-slate-900 ${n.lida ? '' : 'font-semibold'}">${n.mensagem}</p>
        <p class="text-xs text-slate-500 mt-1">${formatarDataHoraBR(n.data_hora)}</p>
      </div>
    `).join('');
    
    const btnMarcarTodas = document.getElementById('btn-marcar-todas-lidas');
    if (notifs.some(n => !n.lida)) btnMarcarTodas.classList.remove('hidden');
    else btnMarcarTodas.classList.add('hidden');
  } catch (e) {
    lista.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Erro ao carregar</div>';
  }
}

async function marcarNotificacaoLida(id) {
  try {
    await marcarNotificacaoLida(id);
    atualizarContadorNotificacoes();
  } catch (e) {
    console.warn('Erro ao marcar notificação:', e);
  }
}

async function marcarTodasLidas() {
  if (!usuarioAtual) return;
  try {
    const notifs = await buscarNotificacoes(usuarioAtual.email);
    for (const n of notifs) {
      if (!n.lida) await marcarNotificacaoLida(n.id);
    }
    carregarNotificacoes();
    atualizarContadorNotificacoes();
    Components.Toast.success('Todas marcadas como lidas');
  } catch (e) {
    Components.Toast.error('Erro ao marcar todas');
  }
}

function abrirAlterarSenha() {
  document.getElementById('usuario-dropdown').classList.add('hidden');
  document.getElementById('tela-alterar-senha').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
}

function voltarDaAlterarSenha() {
  document.getElementById('tela-alterar-senha').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
}

async function salvarNovaSenha() {
  const atual = document.getElementById('senhaAtualInput').value;
  const nova = document.getElementById('senhaNovaInput').value;
  const confirm = document.getElementById('senhaNovaConfirmInput').value;
  
  if (nova !== confirm) {
    Components.Toast.error('As novas senhas não conferem');
    return;
  }
  
  if (nova.length < 6) {
    Components.Toast.error('A nova senha deve ter pelo menos 6 caracteres');
    return;
  }
  
  try {
    // Note: Supabase doesn't have a direct "change password with current password" API
    // This would need a custom function or the user to use "forgot password" flow
    // For now, we'll update via admin API or instruct user
    Components.Toast.warning('Use "Esqueci minha senha" no login ou contate o admin');
  } catch (e) {
    Components.Toast.error('Erro ao alterar senha');
  }
}

// Expor globalmente
window.processarLogin = processarLogin;
window.fazerLogout = fazerLogout;
window.toggleUsuarioMenu = toggleUsuarioMenu;
window.toggleNotificacoes = toggleNotificacoes;
window.marcarTodasLidas = marcarTodasLidas;
window.abrirAlterarSenha = abrirAlterarSenha;
window.voltarDaAlterarSenha = voltarDaAlterarSenha;
window.salvarNovaSenha = salvarNovaSenha;