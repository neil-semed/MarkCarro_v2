// ============================================================
// MARKCARRO - CADASTRO PAGE
// ============================================================

const CadastroPage = {
  form: null,
  tipoPerfilSelect: null,
  blocoSolicitante: null,
  blocoCondutor: null,
  unidadeSelect: null,
  setorSelect: null,
  
  init() {
    this.form = document.getElementById('form-cadastro');
    this.tipoPerfilSelect = document.getElementById('cad-tipo-perfil');
    this.blocoSolicitante = document.getElementById('bloco-solicitante');
    this.blocoCondutor = document.getElementById('bloco-condutor');
    this.unidadeSelect = document.getElementById('cad-unidade');
    this.setorSelect = document.getElementById('cad-setor');
    
    this.bindEvents();
    this.carregarUnidades();
  },
  
  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.tipoPerfilSelect.addEventListener('change', () => this.alternarCamposPerfil());
    this.unidadeSelect.addEventListener('change', () => this.carregarSetores());
    
    // Máscaras
    document.getElementById('cad-telefone')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraTelefone(e.target));
    document.getElementById('cad-placa')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraPlaca(e.target));
    document.getElementById('cad-cpf')?.addEventListener('input', (e) => 
      Utils.aplicarMascaraCPF(e.target));
    document.getElementById('cad-cnh')?.addEventListener('input', (e) => 
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  },
  
  async carregarUnidades() {
    try {
      const result = await API.listarUnidades();
      if (result.success) {
        this.preencherUnidades(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  },
  
  preencherUnidades(unidades) {
    this.unidadeSelect.innerHTML = '<option value="">Selecione a Unidade...</option>';
    unidades.forEach(u => {
      this.unidadeSelect.innerHTML += `<option value="${u.nome}">${u.nome}</option>`;
    });
    this.unidadeSelect.innerHTML += '<option value="Outro">Outra Unidade</option>';
  },
  
  async carregarSetores() {
    const unidade = this.unidadeSelect.value;
    this.setorSelect.innerHTML = '<option value="">Carregando...</option>';
    this.setorSelect.disabled = true;
    
    if (!unidade || unidade === 'Outro') {
      this.setorSelect.innerHTML = '<option value="">Selecione a Unidade primeiro</option>';
      this.setorSelect.innerHTML += '<option value="Outro">Outro Setor</option>';
      this.setorSelect.disabled = false;
      return;
    }
    
    try {
      const result = await API.listarSetores(unidade);
      if (result.success) {
        this.setorSelect.innerHTML = '<option value="">Selecione o Setor...</option>';
        result.data.forEach(s => {
          this.setorSelect.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
        this.setorSelect.innerHTML += '<option value="Outro">Outro Setor</option>';
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      this.setorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    } finally {
      this.setorSelect.disabled = false;
    }
  },
  
  alternarCamposPerfil() {
    const tipo = this.tipoPerfilSelect.value;
    
    if (tipo === 'solicitante') {
      this.blocoSolicitante.classList.remove('hidden');
      this.blocoCondutor.classList.add('hidden');
      // Campos obrigatórios
      document.getElementById('cad-unidade').required = true;
      document.getElementById('cad-setor').required = true;
      document.getElementById('cad-categoria').required = false;
      document.getElementById('cad-placa').required = false;
      document.getElementById('cad-cnh').required = false;
      document.getElementById('cad-validade-cnh').required = false;
    } else {
      this.blocoSolicitante.classList.add('hidden');
      this.blocoCondutor.classList.remove('hidden');
      document.getElementById('cad-unidade').required = false;
      document.getElementById('cad-setor').required = false;
      document.getElementById('cad-categoria').required = true;
      document.getElementById('cad-placa').required = true;
      document.getElementById('cad-cnh').required = true;
      document.getElementById('cad-validade-cnh').required = true;
    }
  },
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const tipo = this.tipoPerfilSelect.value;
    const formData = new FormData(this.form);
    
    // Validações
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;
    const telefone = document.getElementById('cad-telefone').value;
    
    if (!nome || !email || !senha || !telefone) {
      Components.Toast.warning('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (!Utils.validarEmail(email)) {
      Components.Toast.warning('E-mail inválido');
      return;
    }
    
    if (senha.length < 6) {
      Components.Toast.warning('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (!Utils.validarTelefone(telefone)) {
      Components.Toast.warning('Telefone inválido');
      return;
    }
    
    if (tipo === 'solicitante') {
      const unidade = document.getElementById('cad-unidade').value;
      const setor = document.getElementById('cad-setor').value;
      if (!unidade || !setor) {
        Components.Toast.warning('Selecione Unidade e Setor');
        return;
      }
    } else {
      const categoria = document.getElementById('cad-categoria').value;
      const placa = document.getElementById('cad-placa').value.trim();
      const cnh = document.getElementById('cad-cnh').value.trim();
      const validadeCnh = document.getElementById('cad-validade-cnh').value;
      
      if (!categoria || !placa || !cnh || !validadeCnh) {
        Components.Toast.warning('Preencha todos os campos de condutor');
        return;
      }
    }
    
    // Prepara dados
    const dados = {
      tipo,
      nome,
      email,
      senha,
      telefone: telefone.replace(/\D/g, ''),
      unidade: tipo === 'solicitante' ? document.getElementById('cad-unidade').value : '',
      setor: tipo === 'solicitante' ? document.getElementById('cad-setor').value : '',
      placa: tipo === 'condutor' ? document.getElementById('cad-placa').value.toUpperCase() : '',
      modelo: tipo === 'condutor' ? document.getElementById('cad-modelo').value : '',
      capacidade: tipo === 'condutor' ? document.getElementById('cad-capacidade').value : '',
      categoria: tipo === 'condutor' ? document.getElementById('cad-categoria').value : '',
      cnh: tipo === 'condutor' ? document.getElementById('cad-cnh').value : '',
      validadeCnh: tipo === 'condutor' ? Utils.formatarDataISO(document.getElementById('cad-validade-cnh').value) : ''
    };
    
    Loading.show('Cadastrando...');
    
    try {
      const result = await API.signUp(email, senha, {
        tipo,
        nome
      });
      
      if (result.success) {
        // O perfil será criado via trigger no Supabase
        // Aguarda um pouco e faz login automático
        Components.Toast.success('Cadastro realizado! Fazendo login...');
        
        setTimeout(async () => {
          const loginResult = await API.login(email, document.getElementById('cad-senha').value);
          if (loginResult.success) {
            Components.Toast.success('Login realizado!');
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else {
            Components.Toast.success('Cadastro realizado! Faça login para continuar.');
            this.voltarLogin();
          }
        }, 1000);
      } else {
        Components.Toast.error(result.error);
      }
    } catch (error) {
      Components.Toast.error('Erro ao cadastrar: ' + error.message);
    } finally {
      Loading.hide();
    }
  },
  
  voltarLogin() {
    document.getElementById('tela-cadastro').classList.add('hidden');
    document.getElementById('tela-login').classList.remove('hidden');
    this.form.reset();
    this.alternarCamposPerfil();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CadastroPage.init();
});

window.CadastroPage = CadastroPage;