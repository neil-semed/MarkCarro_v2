// ============================================================
// MARKCARRO - ALTERAR SENHA PAGE
// ============================================================

const AlterarSenhaPage = {
  init() {
    this.bindEvents();
  },
  
  bindEvents() {
    document.getElementById('btn-salvar-senha')?.addEventListener('click', () => this.salvar());
    document.getElementById('btn-voltar-senha')?.addEventListener('click', () => this.voltar());
    
    // Enter key
    ['senha-atual-input', 'senha-nova-input', 'senha-nova-confirm-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.salvar();
        });
      }
    });
  },
  
  async salvar() {
    const atual = document.getElementById('senha-atual-input')?.value;
    const nova = document.getElementById('senha-nova-input')?.value;
    const confirmar = document.getElementById('senha-nova-confirm-input')?.value;
    
    if (!atual || !nova || !confirmar) {
      Components.Toast.warning('Preencha todos os campos');
      return;
    }
    
    if (nova !== confirmar) {
      Components.Toast.warning('A nova senha e a confirmação não são iguais');
      return;
    }
    
    if (nova.length < 6) {
      Components.Toast.warning('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    Loading.show('Alterando senha...');
    
    try {
      const result = await API.alterarSenha(atual, nova);
      
      if (result.success) {
        Components.Toast.success('Senha alterada com sucesso!');
        this.voltar();
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  voltar() {
    document.getElementById('senha-atual-input').value = '';
    document.getElementById('senha-nova-input').value = '';
    document.getElementById('senha-nova-confirm-input').value = '';
    
    document.getElementById('tela-alterar-senha')?.setAttribute('hidden', 'true');
    
    // Volta para a tela correta baseada no perfil
    if (window.App) window.App.mostrarTelaAposLogin();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AlterarSenhaPage.init();
});

window.AlterarSenhaPage = AlterarSenhaPage;