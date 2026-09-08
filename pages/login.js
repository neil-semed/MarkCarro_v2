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
  // Só limpa a sessão se os dados salvos estiverem corrompidos (JSON
  // inválido). Erros de renderização das telas não devem apagar uma sessão
  // válida - por isso o try/catch cobre só a leitura/parse, não a chamada
  // das funções de tela.
  let salvo;
  try {
    salvo = sessionStorage.getItem('markcarro_usuario');
    if (!salvo) return;
    usuarioAtual = JSON.parse(salvo);
  } catch (e) {
    sessionStorage.removeItem('markcarro_usuario');
    return;
  }
  carregarSaudacao();
  carregarPainelPorPerfil();
}

async function processarLogin() {
  const emailInput = document.getElementById('login-email');
  const senhaInput = document.getElementById('login-senha');
  
  console.log('[DEBUG] emailInput:', emailInput);
  console.log('[DEBUG] senhaInput:', senhaInput);
  
  const email = emailInput?.value?.trim();
  const senha = senhaInput?.value;
  
  console.log('[DEBUG] email:', email);
  console.log('[DEBUG] senha:', senha ? '***' : 'vazio');
  
  if (!email || !senha) {
    Components.Toast.error('Preencha e-mail e senha');
    return;
  }
  
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

  // Esconder todos os botões de navegação do header primeiro - EXCETO o sino
  // e o menu do usuário, que não são botões "por perfil" e sim utilitários
  // fixos do header (ficam dentro de um dropdown próprio, sempre presentes).
  document.querySelectorAll('#app-principal header button[id^="btn-"]').forEach(btn => {
    if (btn.id !== 'btn-sino' && btn.id !== 'btn-usuario-menu') btn.classList.add('hidden');
  });

  // Barra de navegação inferior (mobile) - mesmo princípio: esconde tudo
  // e mostra só os itens do perfil atual.
  document.querySelectorAll('#bottom-nav [data-aba]').forEach(el => {
    if (el.dataset.aba !== 'notificacoes' && el.dataset.aba !== 'menu') el.classList.add('hidden');
  });

  if (tipo === 'admin') {
    document.getElementById('btn-painel-gestor').classList.remove('hidden');
    document.getElementById('btn-ir-agenda').classList.remove('hidden');
    document.getElementById('btn-nova-solicitacao-gestor').classList.remove('hidden');
    document.getElementById('btn-gerenciar-condutores').classList.remove('hidden');
    document.getElementById('btn-gerenciar-km').classList.remove('hidden');
    document.getElementById('btn-gerenciar-usuarios').classList.remove('hidden');
    abrirPainelGestor();
  } else if (tipo === 'condutor') {
    document.getElementById('btn-painel-dia')?.classList.remove('hidden');
    document.getElementById('btn-agenda-condutor').classList.remove('hidden');
    document.getElementById('btn-registrar-km').classList.remove('hidden');
    document.getElementById('bnav-painel-dia')?.classList.remove('hidden');
    document.getElementById('bnav-agenda-condutor')?.classList.remove('hidden');
    document.getElementById('bnav-registrar-km')?.classList.remove('hidden');
    document.querySelector('#bottom-nav [data-aba="notificacoes"]')?.classList.add('hidden');
    abrirPainelDoDia();
  } else {
    document.getElementById('btn-nova-solicitacao').classList.remove('hidden');
    document.getElementById('btn-minhas-solicitacoes').classList.remove('hidden');
    document.getElementById('bnav-nova-solicitacao')?.classList.remove('hidden');
    document.getElementById('bnav-minhas-solicitacoes')?.classList.remove('hidden');
    abrirMinhasSolicitacoes();
  }

  // "Sair" e "Alterar Senha" vivem dentro do dropdown do usuário (sem id
  // próprio, sempre presentes no DOM) - não fazem parte do conjunto de
  // botões de navegação por perfil, então não precisam ser mostrados aqui.
  // (Antes, este código tentava document.getElementById('btn-sair') e
  // 'btn-alterar-senha', que não existem no HTML atual - isso lançava um
  // erro que interrompia a função ANTES de contar notificações, e o mesmo
  // erro, capturado por restaurarSessao(), fazia a sessão ser apagada
  // sempre que a página era recarregada (F5), mesmo com login válido.)
  document.getElementById('btn-usuario-menu')?.classList.remove('hidden');
  if (tipo !== 'condutor') {
    document.getElementById('btn-sino')?.classList.remove('hidden');
  }

  atualizarContadorNotificacoes();
  setInterval(atualizarContadorNotificacoes, 60000);
}

// Guarda a última contagem conhecida pra saber quando uma notificação NOVA
// chegou (e não só continua a mesma) - é isso que dispara o som de aviso.
// Começa null de propósito: não temos som no primeiro carregamento após o
// login, só quando o número sobe durante a sessão já aberta.
let _ultimaContagemNotificacoes = null;

async function atualizarContadorNotificacoes() {
  if (!usuarioAtual || usuarioAtual.tipo === 'condutor') return;
  try {
    const n = await contarNaoLidas(usuarioAtual.email);

    if (_ultimaContagemNotificacoes !== null && n > _ultimaContagemNotificacoes) {
      tocarSomNotificacao();
    }
    _ultimaContagemNotificacoes = n;

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
      <div class="p-3 border-b border-slate-100 hover:bg-slate-50 ${n.lida ? '' : 'bg-blue-50'}" onclick="marcarNotificacaoLidaUI('${n.id}'); this.classList.remove('bg-blue-50')">
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

// Renomeada para marcarNotificacaoLidaUI: "marcarNotificacaoLida" já é o nome
// da função de API (em api.js) que faz o update no Supabase. Como este
// arquivo carrega depois de api.js, uma função de mesmo nome aqui
// sobrescrevia a de api.js - e "await marcarNotificacaoLida(id)" dentro dela
// passava a chamar a si mesma (recursão infinita / estouro de pilha) a cada
// clique numa notificação.
async function marcarNotificacaoLidaUI(id) {
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

// abrirAlterarSenha / voltarDaAlterarSenha / salvarNovaSenha: a implementação
// real e completa vive em pages/alterar-senha.js (usa supabase.auth.updateUser
// de verdade, com os IDs de campo corretos). Havia uma versão incompleta
// duplicada aqui (placeholder que nem chegava a trocar a senha, e usava IDs
// de input que não existem no HTML) - removida para não confundir: como
// alterar-senha.js carrega depois, a versão dele sempre prevalecia mesmo
// antes desta limpeza, mas manter duas implementações divergentes do mesmo
// nome de função só convida a bugs futuros.

// Expor globalmente
window.processarLogin = processarLogin;
window.fazerLogout = fazerLogout;
window.toggleUsuarioMenu = toggleUsuarioMenu;
window.toggleNotificacoes = toggleNotificacoes;
window.marcarTodasLidas = marcarTodasLidas;
window.marcarNotificacaoLidaUI = marcarNotificacaoLidaUI;