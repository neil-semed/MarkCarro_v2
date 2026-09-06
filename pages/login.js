// ============================================================
// MARKCARRO - MAIN APP
// Inicialização e controle principal da aplicação
// ============================================================
 
// Fallback global para Components.Toast (garante que existe antes de qualquer script)
if (typeof window.Components === 'undefined') window.Components = {};
if (typeof window.Components.Toast === 'undefined') {
  window.Components.Toast = {
    container: null,
    init() {
      if (!this.container) {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
          this.container = document.createElement('div');
          this.container.id = 'toast-container';
          this.container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2';
          document.body.appendChild(this.container);
        }
      }
    },
    show(message, type = 'info', duration = 4000) {
      this.init();
      const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-amber-600',
        info: 'bg-blue-600'
      };
      const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2-2m-2 2l2-2"/></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      };
      const toast = document.createElement('div');
      toast.className = `toast ${colors[type] || colors.info} animate-slide-up flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-md`;
      toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="flex-1 text-sm">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `;
      this.container.appendChild(toast);
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = 'slideUp 0.3s ease-in reverse';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    },
    success(message, duration) { this.show(message, 'success', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); },
    info(message, duration) { this.show(message, 'info', duration); }
  };
}
 
// Função utilitária para timeout
function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}
 
const App = {
  initialized: false,
  initTimeout: 10000, // 10s timeout para inicialização
 
  async init() {
    if (this.initialized) return;
 
    // Garante que a tela de login apareça RÁPIDO (fallback visual imediato)
    this.mostrarLogin();
 
    try {
      // Inicializa Supabase COM TIMEOUT
      await withTimeout(window.supabaseApi.init(), 8000, 'Timeout ao inicializar Supabase');
 
      // Verifica se há sessão ativa COM TIMEOUT
      const sessionPromise = window.supabaseApi.client.auth.getSession();
      const { data: { session } } = await withTimeout(window.supabaseApi.client.auth.getSession(), 5000, 'Timeout ao buscar sessão');
 
      if (session) {
        // Já logado - carrega perfil e mostra app
        await withTimeout(window.supabaseApi.loadUserProfile(session.user.id), 5000, 'Timeout ao carregar perfil');
        this.mostrarTelaAposLogin();
      } else {
        // Não logado - mostra tela de login
        this.mostrarLogin();
      }
 
      this.initialized = true;
      console.log('MarkCarro inicializado');
    } catch (error) {
      console.error('Erro ao inicializar:', error);
      // SEMPRE mostra login em caso de erro
      this.mostrarLogin();
    }
  },
 
  mostrarLogin() {
    this.esconderTodasTelas();
    document.getElementById('tela-login')?.classList.remove('hidden');
    document.getElementById('tela-cadastro')?.classList.add('hidden');
    document.getElementById('app-principal')?.classList.add('hidden');
  },
 
  mostrarCadastro() {
    this.esconderTelasAutenticadas();
    document.getElementById('tela-cadastro')?.classList.remove('hidden');
    document.getElementById('tela-login')?.classList.add('hidden');
    if (window.CadastroPage?.init) CadastroPage.init();
  },
 
  mostrarTelaAposLogin() {
    const perfil = API.getUsuario();
    if (!perfil) {
      this.mostrarLogin();
      return;
    }
 
    this.esconderTodasTelas();
    document.getElementById('app-principal')?.classList.remove('hidden');
 
    // Atualiza header
    this.atualizarHeader(perfil);
 
    // Configura botões do header baseado no perfil
    this.configurarHeaderPorPerfil(perfil);
 
    // Carrega tela inicial baseada no perfil
    this.carregarTelaInicial(perfil);
 
    // Inicializa notificações
    this.inicializarNotificacoes();
  },
 
  atualizarHeader(perfil) {
    const saudacao = this.getSaudacao();
    const saudacaoEl = document.getElementById('txt-saudacao');
    const subtituloEl = document.getElementById('txt-subtitulo');
    const nomeEl = document.getElementById('usuario-nome');
    const emailEl = document.getElementById('usuario-email');
    const perfilEl = document.getElementById('usuario-perfil');
    const iniciaisEl = document.getElementById('usuario-iniciais');
 
    if (saudacaoEl) saudacaoEl.textContent = `${saudacao}, ${perfil.nome}`;
    if (subtituloEl) subtituloEl.textContent = `Perfil: ${perfil.tipo?.charAt(0).toUpperCase() + perfil.tipo?.slice(1)}`;
    if (nomeEl) nomeEl.textContent = perfil.nome;
    if (emailEl) emailEl.textContent = perfil.email;
    if (perfilEl) perfilEl.textContent = perfil.tipo;
    if (iniciaisEl) iniciaisEl.textContent = Utils.iniciais(perfil.nome);
  },
 
  getSaudacao() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  },
 
  configurarHeaderPorPerfil(perfil) {
    const tipo = perfil.tipo?.toLowerCase();
    const isGestor = ['gestor', 'admin'].includes(tipo);
    const isCondutor = tipo === 'condutor';
    const isSolicitante = tipo === 'solicitante';
 
    // Botões do header
    const botoes = {
      'btn-painel-gestor': isGestor,
      'btn-ir-agenda': isGestor,
      'btn-nova-solicitacao-gestor': isGestor,
      'btn-gerenciar-condutores': isGestor,
      'btn-gerenciar-km': isGestor,
      'btn-gerenciar-usuarios': isGestor,
      'btn-nova-solicitacao': isSolicitante,
      'btn-minhas-solicitacoes': isSolicitante,
      'btn-agenda-condutor': isCondutor,
      'btn-registrar-km': isCondutor
    };
 
    Object.entries(botoes).forEach(([id, show]) => {
      const btn = document.getElementById(id);
      if (btn) {
        if (show) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
      }
    });
 
    // Botões comuns
    ['btn-sair', 'btn-sino', 'btn-alterar-senha'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('hidden');
    });
  },
 
  carregarTelaInicial(perfil) {
    const tipo = perfil.tipo?.toLowerCase();
 
    this.esconderTelasConteudo();
 
    if (['gestor', 'admin'].includes(tipo)) {
      document.getElementById('tela-gestor')?.classList.remove('hidden');
      if (window.GestorPage?.init) GestorPage.init();
    } else if (tipo === 'condutor') {
      document.getElementById('tela-agenda-condutor')?.classList.remove('hidden');
      if (window.AgendaCondutorPage?.init) AgendaCondutorPage.init();
    } else {
      document.getElementById('tela-nova-solicitacao')?.classList.remove('hidden');
      document.getElementById('tela-minhas-solicitacoes')?.classList.remove('hidden');
      if (window.NovaSolicitacaoPage?.init) NovaSolicitacaoPage.init();
      if (window.MinhasSolicitacoesPage?.init) MinhasSolicitacoesPage.init();
    }
  },
 
  esconderTodasTelas() {
    // Esconde a tela de loading inicial (spinner "Carregando MarkCarro...")
    // assim que qualquer tela real vai ser exibida.
    document.getElementById('loading-screen')?.remove();
 
    const telas = [
      'tela-login',
      'tela-cadastro',
      'tela-nova-solicitacao',
      'tela-minhas-solicitacoes',
      'tela-gestor',
      'tela-agenda',
      'tela-agenda-condutor',
      'tela-registro-km',
      'tela-gerenciar-condutores',
      'tela-gerenciar-km',
      'tela-gerenciar-usuarios',
      'tela-alterar-senha'
    ];
 
    telas.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
 
    document.getElementById('tela-alterar-senha')?.setAttribute('hidden', 'true');
  },
 
  esconderTelasAutenticadas() {
    const telas = [
      'tela-nova-solicitacao',
      'tela-minhas-solicitacoes',
      'tela-gestor',
      'tela-agenda',
      'tela-agenda-condutor',
      'tela-registro-km',
      'tela-gerenciar-condutores',
      'tela-gerenciar-km',
      'tela-gerenciar-usuarios'
    ];
 
    telas.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
 
    document.getElementById('tela-alterar-senha')?.setAttribute('hidden', 'true');
  },
 
  esconderTelasConteudo() {
    const telas = [
      'tela-nova-solicitacao',
      'tela-minhas-solicitacoes',
      'tela-gestor',
      'tela-agenda',
      'tela-agenda-condutor',
      'tela-registro-km',
      'tela-gerenciar-condutores',
      'tela-gerenciar-km',
      'tela-gerenciar-usuarios'
    ];
 
    telas.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  },
 
  // Navegação entre telas
  abrirNovaSolicitacao() {
    this.esconderTelasConteudo();
    document.getElementById('tela-nova-solicitacao')?.classList.remove('hidden');
    document.getElementById('tela-minhas-solicitacoes')?.classList.remove('hidden');
    if (window.NovaSolicitacaoPage?.init) NovaSolicitacaoPage.init();
  },
 
  abrirNovaSolicitacaoGestor() {
    this.esconderTelasConteudo();
    document.getElementById('tela-nova-solicitacao').classList.remove('hidden');
    if (window.NovaSolicitacaoPage?.init) NovaSolicitacaoPage.init();
  },
 
  abrirMinhasSolicitacoes() {
    this.esconderTelasConteudo();
    document.getElementById('tela-minhas-solicitacoes')?.classList.remove('hidden');
    if (window.MinhasSolicitacoesPage?.init) MinhasSolicitacoesPage.init();
  },
 
  abrirPainelGestor() {
    this.esconderTelasConteudo();
    document.getElementById('tela-gestor')?.classList.remove('hidden');
    if (window.GestorPage?.init) GestorPage.init();
  },
 
  abrirAgenda() {
    this.esconderTelasConteudo();
    document.getElementById('tela-agenda')?.classList.remove('hidden');
    if (window.AgendaPage?.init) AgendaPage.init();
  },
 
  abrirAgendaCondutor() {
    this.esconderTelasConteudo();
    document.getElementById('tela-agenda-condutor')?.classList.remove('hidden');
    if (window.AgendaCondutorPage?.init) AgendaCondutorPage.init();
  },
 
  abrirRegistroKm() {
    this.esconderTelasConteudo();
    document.getElementById('tela-registro-km')?.classList.remove('hidden');
    if (window.RegistroKmPage?.init) RegistroKmPage.init();
  },
 
  abrirGerenciarCondutores() {
    this.esconderTelasConteudo();
    document.getElementById('tela-gerenciar-condutores')?.classList.remove('hidden');
    if (window.GerenciarCondutoresPage?.init) GerenciarCondutoresPage.init();
  },
 
  abrirGerenciarKm() {
    this.esconderTelasConteudo();
    document.getElementById('tela-gerenciar-km')?.classList.remove('hidden');
    if (window.GerenciarKmPage?.init) GerenciarKmPage.init();
  },
 
  abrirGerenciarUsuarios() {
    this.esconderTelasConteudo();
    document.getElementById('tela-gerenciar-usuarios')?.classList.remove('hidden');
    if (window.GerenciarUsuariosPage?.init) GerenciarUsuariosPage.init();
  },
 
  abrirAlterarSenha() {
    this.esconderTelasConteudo();
    document.getElementById('tela-alterar-senha')?.removeAttribute('hidden');
    if (window.AlterarSenhaPage?.init) AlterarSenhaPage.init();
  },
 
  async fazerLogout() {
    try {
      await API.logout();
      Components.Toast.success('Logout realizado');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
 
    this.mostrarLogin();
  },
 
  // Notificações
  inicializarNotificacoes() {
    this.atualizarBadgeNotificacoes();
    // Atualiza a cada 30 segundos
    setInterval(() => this.atualizarBadgeNotificacoes(), 30000);
  },
 
  async atualizarBadgeNotificacoes() {
    try {
      const result = await API.contarNaoLidas();
      if (result.success) {
        const badge = document.getElementById('badge-notificacoes');
        if (badge) {
          if (result.count > 0) {
            badge.textContent = result.count > 99 ? '99+' : result.count;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar badge:', error);
    }
  },
 
  async toggleNotificacoes() {
    const painel = document.getElementById('painel-notificacoes');
    if (!painel) return;
 
    const isOpen = !painel.classList.contains('hidden');
 
    if (isOpen) {
      painel.classList.add('hidden');
    } else {
      painel.classList.remove('hidden');
      await this.carregarNotificacoes();
    }
  },
 
  async carregarNotificacoes() {
    const div = document.getElementById('lista-notificacoes');
    if (!div) return;
 
    div.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Carregando...</div>';
 
    try {
      const result = await API.buscarNotificacoes();
 
      if (result.success) {
        const notificacoes = result.data || [];
 
        if (notificacoes.length === 0) {
          div.innerHTML = '<p class="text-center text-slate-500 text-sm py-4">Nenhuma notificação.</p>';
        } else {
          div.innerHTML = notificacoes.map(n => `
            <div class="border-b border-slate-100 py-3 ${n.lida ? '' : 'bg-mc-azul/5'}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-900 ${n.lida ? '' : 'font-semibold'}">${n.titulo}</p>
                  <p class="text-xs text-slate-600 mt-1">${n.mensagem}</p>
                  <p class="text-xs text-slate-400 mt-1">${Utils.formatarDataHoraBR(n.created_at)}</p>
                </div>
              </div>
            </div>
          `).join('');
        }
      } else {
        div.innerHTML = '<p class="text-center text-slate-500 text-sm py-4">Erro ao carregar</p>';
      }
    } catch (error) {
      div.innerHTML = '<p class="text-center text-red-500 text-sm py-4">Erro ao carregar</p>';
    }
  },
 
  async marcarTodasLidas() {
    try {
      await API.marcarComoLidas();
      this.carregarNotificacoes();
      this.atualizarBadgeNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error);
    }
  }
};
 
// Inicialização global
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
 
// Funções globais para onclick nos botões do header
window.abrirNovaSolicitacao = () => App.abrirNovaSolicitacao();
window.abrirNovaSolicitacaoGestor = () => App.abrirNovaSolicitacaoGestor();
window.abrirMinhasSolicitacoes = () => App.abrirMinhasSolicitacoes();
window.abrirPainelGestor = () => App.abrirPainelGestor();
window.abrirAgenda = () => App.abrirAgenda();
window.abrirAgendaCondutor = () => App.abrirAgendaCondutor();
window.abrirRegistroKm = () => App.abrirRegistroKm();
window.abrirGerenciarCondutores = () => App.abrirGerenciarCondutores();
window.abrirGerenciarKm = () => App.abrirGerenciarKm();
window.abrirGerenciarUsuarios = () => App.abrirGerenciarUsuarios();
window.abrirAlterarSenha = () => App.abrirAlterarSenha();
window.fazerLogout = () => App.fazerLogout();
window.toggleNotificacoes = () => App.toggleNotificacoes();
window.marcarTodasLidas = () => App.marcarTodasLidas();
window.voltarLogin = () => CadastroPage.voltarLogin();
window.voltarDaAlterarSenha = () => AlterarSenhaPage.voltar();
 
// Exporta App globalmente
window.App = App;
 
