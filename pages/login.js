// ============================================================
// MARKCARRO - LOGIN PAGE
// ============================================================
 
const LoginPage = {
  form: null,
  emailInput: null,
  senhaInput: null,
  btnLogin: null,
  linkCadastro: null,
  
  init() {
    this.form = document.getElementById('form-login');
    this.emailInput = document.getElementById('login-email');
    this.senhaInput = document.getElementById('login-senha');
    this.btnLogin = document.getElementById('btn-login');
    this.linkCadastro = document.getElementById('link-cadastro');
    
    this.bindEvents();
    this.checkUrlParams();
  },
  
  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.linkCadastro.addEventListener('click', (e) => {
      e.preventDefault();
      this.mostrarCadastro();
    });
    
    // Enter key
    this.senhaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSubmit(e);
    });
  },
  
  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const erro = params.get('erro');
    
    if (email) this.emailInput.value = email;
    if (erro) {
      setTimeout(() => Components.Toast.error(decodeURIComponent(erro)), 500);
    }
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const senha = this.senhaInput.value;
    
    if (!email || !senha) {
      Components.Toast.warning('Preencha e-mail e senha');
      return;
    }
    
    if (!Utils.validarEmail(email)) {
      Components.Toast.warning('E-mail inválido');
      this.emailInput.focus();
      return;
    }
    
    this.setLoading(true);
    
    try {
      const result = await API.login(email, senha);
      
      if (result.success) {
        Components.Toast.success('Login realizado com sucesso!');
        // Aguarda o perfil carregar
        setTimeout(() => this.redirecionarAposLogin(), 500);
      } else {
        const mensagem = result.error || 'E-mail ou senha inválidos';
        if (mensagem.includes('não confirmado')) {
          Components.Toast.warning(mensagem);
        } else {
          Components.Toast.error(mensagem);
        }
      }
    } catch (error) {
      Components.Toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      this.setLoading(false);
    }
  },
  
  setLoading(loading) {
    this.btnLogin.disabled = loading;
    this.emailInput.disabled = loading;
    this.senhaInput.disabled = loading;
    
    if (loading) {
      this.btnLogin.innerHTML = `
        <span class="flex items-center justify-center gap-2">
          <div class="spinner"></div>
          Entrando...
        </span>
      `;
    } else {
      this.btnLogin.innerHTML = `
        <span class="flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a1 1 0 01-1 1h-1"/></svg>
          Entrar
        </span>
      `;
    }
  },
  
  async redirecionarAposLogin() {
    // Aguarda o perfil carregar (até ~6s — cobre lentidão de rede ou o
    // projeto Supabase "acordando" depois de um tempo sem uso)
    let tentativas = 0;
    const maxTentativas = 30;
 
    const esperarPerfil = () => {
      return new Promise(resolve => {
        const check = setInterval(() => {
          const perfil = API.getUsuario();
          if (perfil) {
            clearInterval(check);
            resolve(perfil);
          }
          tentativas++;
          if (tentativas >= maxTentativas) {
            clearInterval(check);
            resolve(null);
          }
        }, 200);
      });
    };
 
    let perfil = await esperarPerfil();
 
    // Se ainda não carregou, tenta buscar o perfil mais uma vez direto
    // (em vez de simplesmente desistir e pedir login de novo)
    if (!perfil) {
      try {
        const { data: { session } } = await window.supabaseApi.client.auth.getSession();
        if (session) {
          await window.supabaseApi.loadUserProfile(session.user.id);
          perfil = API.getUsuario();
        }
      } catch (e) {
        console.error('Erro na tentativa extra de carregar perfil:', e);
      }
    }
 
    this.mostrarTelaAposLogin();
  },
  
  mostrarTelaAposLogin() {
    const perfil = API.getUsuario();
    if (!perfil) {
      Components.Toast.error('Erro ao carregar perfil. Faça login novamente.');
      return;
    }
    
    // Esconde tela de login
    document.getElementById('tela-login').classList.add('hidden');
    
    // Mostra app principal
    document.getElementById('app-principal').classList.remove('hidden');
    
    // Inicializa app
    if (window.App) window.App.init();
  },
  
  mostrarCadastro() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('tela-cadastro').classList.remove('hidden');
    // Foco no primeiro campo
    setTimeout(() => document.getElementById('cad-nome')?.focus(), 100);
  }
};
 
// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  LoginPage.init();
});
 
// Exporta para uso global
window.LoginPage = LoginPage;
 
